import { supabase } from "../../js/supabase.js";
import { convertToWebP } from "../../js/utils/fileToWebp.js";

let quill;
let machineId = null;
let currentAdminName = "";
let authorId = null;

initMachinePage();

async function initMachinePage() {
  // 1. Auth Guard
  const {
    data: { session },
    error: authErr,
  } = await supabase.auth.getSession();

  if (authErr || !session) {
    window.location.href = "login.html";
    return;
  }

  // 2. Load Admin Profile
  const { data: adminProfile } = await supabase
    .from("admins")
    .select("full_name, id")
    .eq("id", session.user.id)
    .single();

  authorId = adminProfile?.id || session.user.id;
  currentAdminName = adminProfile?.full_name || session.user.email;

  document.getElementById("admin-name").textContent = currentAdminName;

  // 3. Init Quill Editor
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Beschreiben Sie die Maschine...",
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "link"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["image"],
          ["code-block"],
        ],
        handlers: {
          image: handleQuillImageUpload,
        },
      },
    },
  });

  // 4. Detect Edit Mode
  const urlParams = new URLSearchParams(window.location.search);
  machineId = urlParams.get("id");

  if (machineId) {
    document.getElementById("page-title").textContent = "Maschine bearbeiten";
    document.getElementById("submit-btn").textContent = "Änderungen speichern";
    loadExistingMachine(machineId);
  } else {
    document.getElementById("audit-badge").textContent =
      `Erstellt von: ${currentAdminName}`;
  }

  // 5. Bind Form Submit
  document
    .getElementById("machine-form")
    .addEventListener("submit", handleFormSubmit);

  // 6. Bind Quick Upload Converters
  setupQuickImageConverters();
}

/* ------------------------------
   FILE UPLOAD → PUBLIC URL
------------------------------ */
async function uploadFileToSupabase(file) {
    // Convert to WebP first
  const webpBlob = await convertToWebP(file);

    // Preserve original filename (without extension)
    const baseName = file.name.replace(/\.[^/.]+$/, "");

      // Create final WebP filename
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

/* ------------------------------
   QUICK IMAGE CONVERTERS
------------------------------ */
function setupQuickImageConverters() {
  document.querySelectorAll(".quick-converter").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const targetId = e.target.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);

      targetInput.value = "Hochladen...";
      targetInput.disabled = true;

      try {
        const url = await uploadFileToSupabase(file);
        targetInput.value = url;
      } catch (err) {
        console.error(err);
        alert("Fehler beim Bild-Upload.");
        targetInput.value = "";
      } finally {
        targetInput.disabled = false;
      }
    });
  });
}

/* ------------------------------
   QUILL IMAGE HANDLER
------------------------------ */
async function handleQuillImageUpload() {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.click();

  picker.onchange = async () => {
    const file = picker.files[0];
    if (!file) return;

    try {
      const url = await uploadFileToSupabase(file);
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, "image", url);
      quill.setSelection(range.index + 1);
    } catch (err) {
      console.error(err);
      alert("Bild konnte nicht hochgeladen werden.");
    }
  };
}

/* ------------------------------
   LOAD EXISTING MACHINE
------------------------------ */
async function loadExistingMachine(id) {
  const { data: mc, error } = await supabase
    .from("machines")
    .select(
      "id, name, description, image_urls, content, author: posted_by(full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !mc) {
    alert("Fehler beim Laden der Maschine.");
    console.error(error)
    window.location.href = "machines.html";
    return;
  }

  document.getElementById("mc-title").value = mc.name || "";
  document.getElementById("mc-description").value = mc.description || "";

  const imgInputs = document.querySelectorAll(".mc-img-input");
  if (mc.image_urls && Array.isArray(mc.image_urls)) {
    mc.image_urls.forEach((url, i) => {
      if (imgInputs[i]) imgInputs[i].value = url;
    });
  }

  quill.clipboard.dangerouslyPasteHTML(mc.content || "");

  document.getElementById("audit-badge").textContent =
    `Zuletzt aktualisiert von: ${mc.author?.full_name || "Unbekannt"}`;
}

/* ------------------------------
   SAVE MACHINE
------------------------------ */
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("mc-title").value.trim();
  const description = document.getElementById("mc-description").value.trim();

  const images = Array.from(document.querySelectorAll(".mc-img-input"))
    .map((i) => i.value.trim())
    .filter((v) => v !== "");

  const content = quill.getSemanticHTML();

  const payload = {
    name,
    description,
    image_urls: images,
    content,
    updated_at: new Date().toISOString(),
    posted_by: authorId,
  };

  let error;

  if (machineId) {
    ({ error } = await supabase
      .from("machines")
      .update(payload)
      .eq("id", machineId));
  } else {
    ({ error } = await supabase.from("machines").insert([payload]));
  }

  if (error) {
    console.error(error)
    alert(`Fehler beim Speichern: ${error.message}`);
  } else {
    alert("Maschine erfolgreich gespeichert!");
    window.location.href = "machines.html";
  }
}
