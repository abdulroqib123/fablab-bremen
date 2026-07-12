import { supabase } from "../../js/supabase.js";
import { convertToWebP } from "../../js/utils/fileToWebp.js";
import { createBlockEditor } from "./block-editor.js";
import { contentToBlocks } from "../../js/content-compat.js";

let blockEditor; // replaces the old `editor` (GrapesJS) / `quill` variable
let machineId = null;
let currentAdminName = "";
let authorId = null;

initMachinesPage();

async function initMachinesPage() {
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
  machineId = urlParams.get("id");

  if (machineId) {
    document.getElementById("page-title").textContent = "Maschine bearbeiten";
    document.getElementById("submit-btn").textContent = "Änderungen speichern";
    loadExistingMachinesData(machineId);
  } else {
    document.getElementById("audit-badge").textContent =
      `Erstellt von: ${currentAdminName}`;
  }

  // 5. Form Binding
  document
    .getElementById("machine-form")
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
  const filePath = `machines/${fileName}`;

  const { error } = await supabase.storage
    .from("machines-media")
    .upload(filePath, webpBlob, {
      contentType: "image/webp",
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("machines-media").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Automates Converting Files to Links right inside the machines text inputs
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

async function loadExistingMachinesData(id) {
  const { data: mc, error } = await supabase
    .from("machines")
    .select("*, author: posted_by(full_name)")
    .eq("id", id)
    .single();

  if (error || !mc) {
    alert("Fehler beim Laden der machine.");
    window.location.href = "machines.html";
    return;
  }

  document.getElementById("mc-title").value = mc.name || "";
  document.getElementById("mc-description").value = mc.description || "";


  if (mc.image_urls && Array.isArray(mc.image_urls)) {
    const imgInputs = document.querySelectorAll(".mc-img-input");
    mc.image_urls.forEach((url, index) => {
      if (imgInputs[index]) imgInputs[index].value = url;
    });
  }

  // Handles both legacy Quill HTML (wrapped as one text block) and new block JSON
  blockEditor.setBlocks(contentToBlocks(mc.content));

  document.getElementById("audit-badge").textContent =
    `Zuletzt aktualisiert von: ${mc.author.full_name}`;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const imgElements = document.querySelectorAll(".mc-img-input");
  const imageUrlsArray = Array.from(imgElements)
    .map((input) => input.value.trim())
    .filter((url) => url !== "");


const machinesPayload = {
  name: document.getElementById("mc-title").value.trim(),
  description: document.getElementById("mc-description").value.trim() || "",
  updated_at: new Date().toISOString(),
  image_urls: imageUrlsArray,
  posted_by: authorId,
  content: JSON.stringify(blockEditor.getBlocks()), // stored as a JSON string in the same text column — no schema change needed
};

  let responseError;

  if (machineId) {
    const { error } = await supabase
      .from("machines")
      .update(machinesPayload)
      .eq("id", machineId);
    responseError = error;
  } else {
    const { error } = await supabase.from("machines").insert([machinesPayload]);
    responseError = error;
  }

  if (responseError) {
    alert(`Fehler beim Speichern: ${responseError.message}`);
  } else {
    alert("Maschine erfolgreich gespeichert!");
    window.location.href = "machines.html";
  }
}
