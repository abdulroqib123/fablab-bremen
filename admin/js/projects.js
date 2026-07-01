import { supabase } from "../../js/supabase.js";

let quill;
let projectId = null;
let currentAdminName = "";
let authorId = null;

// Using native ES module top-level logic instead of wrapping in DOMContentLoaded
initProjectPage();

async function initProjectPage() {
  // 1. Route Security Check
  const {
    data: { session },
    error: authErr,
  } = await supabase.auth.getSession();
  if (authErr || !session) {
    window.location.href = "login.html";
    return;
  }

  // 2. Fetch Active Admin Profile Info
  const { data: adminProfile } = await supabase
    .from("admins")
    .select("full_name, id")
    .eq("id", session.user.id)
    .single();

  // FIX: Added optional chaining to prevent crash if adminProfile is null
  authorId = adminProfile?.id || session.user.id;
  currentAdminName = adminProfile ? adminProfile.full_name : session.user.email;
  document.getElementById("admin-name").textContent = currentAdminName;

  // 3. Initialize Quill Rich Text Engine with Custom Image Interceptor
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Legen Sie ein neues Projekt an...", // Typo fix
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ["bold", "italic", "underline", "link"],
          [
            { list: "ordered" },
            { list: "bullet" },
            { list: "check" },
            { align: [] },
          ],
          ["image"],
          ["code-block"],
        ],
        handlers: {
          // Directs image icon clicks through our storage upload system instead of Base64
          image: handleQuillImageUpload,
        },
      },
    },
  });

  // 4. URL Routing Check
  const urlParams = new URLSearchParams(window.location.search);
  projectId = urlParams.get("id");

  if (projectId) {
    document.getElementById("page-title").textContent = "Projekt bearbeiten";
    document.getElementById("submit-btn").textContent = "Änderungen speichern";
    loadExistingWorkshopData(projectId);
  } else {
    document.getElementById("audit-badge").textContent =
      `Erstellt von: ${currentAdminName}`;
  }

  // 5. Form Binding
  document
    .getElementById("project-form")
    .addEventListener("submit", handleFormSubmit);

  // 6. Bind Quick Converters for the 3 Project Image URL input fields
  setupQuickImageConverters();
}

/**
 * Shared Core Utility API Function
 * Handles streaming file assets straight up into your public bucket
 */
async function uploadFileToSupabase(file) {
  const fileExt = file.name.split(".").pop();
  // Create safe random identifier format to prevent overlap overwrites
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from("projects-media")
    .upload(filePath, file);

  if (error) throw error;

  // Pull back the public secure CDN address line
  const {
    data: { publicUrl },
  } = supabase.storage.from("projects-media").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Automates Converting Files to Links right inside the project text inputs
 */
function setupQuickImageConverters() {
  document.querySelectorAll(".quick-converter").forEach((uploader) => {
    uploader.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      const targetInputId = event.target.getAttribute("data-target");
      const targetInput = document.getElementById(targetInputId);

      if (!file) return;

      targetInput.value = "Hochladen... Bitte warten...";
      targetInput.disabled = true;

      try {
        const publicUrl = await uploadFileToSupabase(file);
        targetInput.value = publicUrl;
      } catch (err) {
        console.error("Upload failed:", err);
        targetInput.value = "";
        alert("Fehler beim Konvertieren des Bildes.");
      } finally {
        targetInput.disabled = false;
      }
    });
  });
}

/**
 * Intercepts Quill Toolbar Uploads to keep the text blocks light and clean
 */
async function handleQuillImageUpload() {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const publicUrl = await uploadFileToSupabase(file);

      // Target text insert point index and paste the string URL tag element directly
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, "image", publicUrl);
      quill.setSelection(range.index + 1);
    } catch (err) {
      console.error("Quill media sync error:", err);
      alert("Editor-Bild Upload fehlgeschlagen.");
    }
  };
}

async function loadExistingWorkshopData(id) {
  const { data: pj, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pj) {
    alert("Fehler beim Laden des Projekts.");
    window.location.href = "projects.html";
    return;
  }

  document.getElementById("pj-title").value = pj.title || "";

  // FIX: Explicitly cast boolean to matching string value for the select element
  document.getElementById("pj-mintstep").value = String(pj.is_mintsteps);

  if (pj.event_date) {
    document.getElementById("pj-date").value = pj.event_date.substring(0, 16);
  }

  if (pj.image_urls && Array.isArray(pj.image_urls)) {
    const imgInputs = document.querySelectorAll(".pj-img-input");
    pj.image_urls.forEach((url, index) => {
      if (imgInputs[index]) imgInputs[index].value = url;
    });
  }

  quill.clipboard.dangerouslyPasteHTML(pj.content || "");
  document.getElementById("audit-badge").textContent =
    `Zuletzt aktualisiert von: ${currentAdminName}`;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const imgElements = document.querySelectorAll(".pj-img-input");
  const imageUrlsArray = Array.from(imgElements)
    .map((input) => input.value.trim())
    .filter((url) => url !== "");

  // FIX: Cast string back to native boolean for Supabase storage
  const isMintstepsBool =
    document.getElementById("pj-mintstep").value === "true";

  const workshopPayload = {
    title: document.getElementById("pj-title").value.trim(),
    is_mintsteps: isMintstepsBool,
    event_date: new Date(
      document.getElementById("pj-date").value,
    ).toISOString(),
    image_urls: imageUrlsArray,
    posted_by: authorId,
    content: quill.getSemanticHTML(),
  };

  let responseError;

  if (projectId) {
    const { error } = await supabase
      .from("projects")
      .update(workshopPayload)
      .eq("id", projectId);
    responseError = error;
  } else {
    const { error } = await supabase.from("projects").insert([workshopPayload]);
    responseError = error;
  }

  if (responseError) {
    alert(`Fehler beim Speichern: ${responseError.message}`);
  } else {
    alert("Projekt erfolgreich gespeichert!");
    window.location.href = "projects.html";
  }
}
