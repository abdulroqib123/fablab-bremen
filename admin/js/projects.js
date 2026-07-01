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

  // 3. Initialize Quill Rich Text Engine
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Legen Sie ein neues Projekt an...", // Typo fix
    modules: {
      toolbar: [
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
}

async function loadExistingWorkshopData(id) {
  const { data: pj, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pj) {
    alert("Fehler beim Laden des Projekts.");
    window.location.href = "dashboard.html";
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