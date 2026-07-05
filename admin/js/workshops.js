import { supabase } from "../../js/supabase.js";
import { convertToWebP } from "../../js/utils/fileToWebp.js";

let quill;
let workshopId = null;
let currentAdminName = "";
let authorId = null;

// Using native ES module top-level logic instead of wrapping in DOMContentLoaded
initWorkshopPage();

async function initWorkshopPage() {
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

  authorId = adminProfile.id;
  currentAdminName = adminProfile ? adminProfile.full_name : session.user.email;
  document.getElementById("admin-name").textContent = currentAdminName;

  // 3. Initialize Quill Rich Text Engine with Custom Image Interceptor
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Legen Sie ein neuen Workshop an...",
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

  // 4. URL Routing Check: Are we Creating or Editing?
  const urlParams = new URLSearchParams(window.location.search);
  workshopId = urlParams.get("id");

  if (workshopId) {
    document.getElementById("page-title").textContent = "Workshop bearbeiten";
    document.getElementById("submit-btn").textContent = "Änderungen保存"; // Changes label text to Save
    document.getElementById("submit-btn").textContent = "Änderungen speichern";
    loadExistingWorkshopData(workshopId);
  } else {
    document.getElementById("audit-badge").textContent =
      `Erstellt von: ${currentAdminName}`;
  }

  // 5. Form Binding
  document
    .getElementById("workshop-form")
    .addEventListener("submit", handleFormSubmit);

  // 6. Bind Quick Converters for the 3 normal Image URL input fields
  setupQuickImageConverters();
}

/**
 * Shared Core Utility API Function
 * Handles streaming file assets straight up into your public bucket
 */
async function uploadFileToSupabase(file) {
    // Convert to WebP first
  const webpBlob = await convertToWebP(file);

    // Preserve original filename (without extension)
    const baseName = file.name.replace(/\.[^/.]+$/, "");

      // Create final WebP filename
  const fileName = `${baseName}-${Date.now()}.webp`;
  const filePath = `workshops/${fileName}`;

   const { error } = await supabase.storage
     .from("workshop-media")
     .upload(filePath, webpBlob, {
       contentType: "image/webp",
     });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("workshop-media").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Automates Converting Files to Links right inside the standard text inputs
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
  const { data: ws, error } = await supabase
    .from("workshops")
    .select("*, author: posted_by(full_name)")
    .eq("id", id)
    .single();

  if (error || !ws) {
    alert("Fehler beim Laden des Workshops.");
    window.location.href = "workshops.html";
    return;
  }

  // Re-populate standard field entries
  document.getElementById("ws-title").value = ws.title || "";
  document.getElementById("ws-price").value = ws.price || "";
  document.getElementById("ws-reg-link").value = ws.registration_link || "";

  if (ws.event_date) {
    document.getElementById("ws-date").value = ws.event_date.substring(0, 16);
  }

  // Distribute image URLs back to inputs
  if (ws.image_urls && Array.isArray(ws.image_urls)) {
    const imgInputs = document.querySelectorAll(".ws-img-input");
    ws.image_urls.forEach((url, index) => {
      if (imgInputs[index]) imgInputs[index].value = url;
    });
  }

  // Hydrate Quill rich text content
  quill.clipboard.dangerouslyPasteHTML(ws.content || "");
  document.getElementById("audit-badge").textContent =
    `Zuletzt aktualisiert von: ${ws.author.full_name}`;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const imgElements = document.querySelectorAll(".ws-img-input");
  const imageUrlsArray = Array.from(imgElements)
    .map((input) => input.value.trim())
    .filter((url) => url !== "");

  const workshopPayload = {
    title: document.getElementById("ws-title").value.trim(),
    price: document.getElementById("ws-price").value.trim() || "Kostenlos",
    event_date: new Date(
      document.getElementById("ws-date").value,
    ).toISOString(),
    registration_link: document.getElementById("ws-reg-link").value.trim(),
    image_urls: imageUrlsArray,
    posted_by: authorId,
    content: quill.getSemanticHTML(), // Captures raw valid HTML blocks cleanly with our new tiny img URLs embedded
  };

  let responseError;

  if (workshopId) {
    // Mode: Update existing database row
    const { error } = await supabase
      .from("workshops")
      .update(workshopPayload)
      .eq("id", workshopId);
    responseError = error;
  } else {
    // Mode: Insert fresh database row
    const { error } = await supabase
      .from("workshops")
      .insert([workshopPayload]);
    responseError = error;
  }

  if (responseError) {
    alert(`Fehler beim Speichern: ${responseError.message}`);
  } else {
    alert("Workshop erfolgreich gespeichert!");
    window.location.href = "workshops.html";
  }
}
