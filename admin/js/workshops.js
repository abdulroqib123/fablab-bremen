import { supabase } from "../../js/supabase.js";
import { convertToWebP } from "../../js/utils/fileToWebp.js";
import { createBlockEditor } from "./block-editor.js";
import { contentToBlocks } from "../../js/content-compat.js";

let blockEditor; // replaces the old `editor` (GrapesJS) / `quill` variable
let workshopId = null;
let currentAdminName = "";
let authorId = null;

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

  authorId = adminProfile?.id || session.user.id;
  currentAdminName = adminProfile ? adminProfile.full_name : session.user.email;
  document.getElementById("admin-name").textContent = currentAdminName;

  // 3. Initialize the custom block editor 
  blockEditor = createBlockEditor(
    document.getElementById("block-editor-root"),
    {
      onUploadImage: uploadFileToSupabase, 
      initialBlocks: [],
    },
  );

  // 4. URL Routing Check
  const urlParams = new URLSearchParams(window.location.search);
  workshopId = urlParams.get("id");

  if (workshopId) {
    document.getElementById("page-title").textContent = "Workshop bearbeiten";
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

  // 6. Bind Quick Converters for the 3 Project Image URL input fields
  setupQuickImageConverters();
}

/**
 * Shared Core Utility API Function — unchanged from the Quill version.
 * Handles streaming file assets straight up into your public bucket.
 */
async function uploadFileToSupabase(file) {
  const webpBlob = await convertToWebP(file);

  const baseName = file.name.replace(/\.[^/.]+$/, "");
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
 * Automates Converting Files to Links right inside the workshop text inputs
 * — unchanged, these 3 URL fields are separate from the block editor content.
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

  document.getElementById("ws-title").value = ws.title || "";
  document.getElementById("ws-price").value = String(ws.price);

  if (ws.event_date) {
    document.getElementById("ws-date").value = ws.event_date.substring(0, 16);
  }

  if (ws.image_urls && Array.isArray(ws.image_urls)) {
    const imgInputs = document.querySelectorAll(".ws-img-input");
    ws.image_urls.forEach((url, index) => {
      if (imgInputs[index]) imgInputs[index].value = url;
    });
  }

  // Handles both legacy Quill HTML (wrapped as one text block) and new block JSON
  blockEditor.setBlocks(contentToBlocks(ws.content));

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
    image_urls: imageUrlsArray,
    posted_by: authorId,
    content: JSON.stringify(blockEditor.getBlocks()), // stored as a JSON string in the same text column — no schema change needed
  };

  let responseError;

  if (workshopId) {
    const { error } = await supabase
      .from("workshops")
      .update(workshopPayload)
      .eq("id", workshopId);
    responseError = error;
  } else {
    const { error } = await supabase.from("workshops").insert([workshopPayload]);
    responseError = error;
  }

  if (responseError) {
    alert(`Fehler beim Speichern: ${responseError.message}`);
  } else {
    alert("Workshop erfolgreich gespeichert!");
    window.location.href = "workshops.html";
  }
}
