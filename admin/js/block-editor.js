// js/admin/block-editor.js
//
// A small, purpose-built content editor. No drag-and-drop, no hidden panels.
// Admin clicks "+ Block hinzufügen" buttons, blocks appear in a vertical
// list, click directly into a block to edit it, ↑/↓/🗑 to reorder/remove.
//
// Data shape (what getBlocks()/setBlocks() work with):
// [
//   { id, type: 'text', content: '<p>...</p>' },
//   { id, type: 'image', url: '' },
//   { id, type: 'image-pair', left: '', right: '' },
//   { id, type: 'carousel', slides: [{ url, caption }, ...] },
//   { id, type: 'quote', text: '', attribution: '' },
// ]

export function createBlockEditor(
  container,
  { onUploadImage, initialBlocks = [] } = {},
) {
  let blocks = initialBlocks.map(withId);
  const blockElements = new Map(); // id -> DOM element, kept alive across renders

  function withId(block) {
    return block.id ? block : { ...block, id: crypto.randomUUID() };
  }

  // --- Public API ---
  function getBlocks() {
    return blocks;
  }

  function setBlocks(newBlocks) {
    blocks = (newBlocks || []).map(withId);
    blockElements.clear();
    listEl.innerHTML = "";
    blocks.forEach((b) => blockElements.set(b.id, createBlockElement(b)));
    syncOrder();
  }

  function addBlock(type) {
    const block = withId(defaultBlockFor(type));
    blocks.push(block);
    blockElements.set(block.id, createBlockElement(block));
    syncOrder();
  }

  function moveBlock(id, direction) {
    const idx = blocks.findIndex((b) => b.id === id);
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= blocks.length) return;
    [blocks[idx], blocks[swapWith]] = [blocks[swapWith], blocks[idx]];
    syncOrder();
  }

  function deleteBlock(id) {
    blocks = blocks.filter((b) => b.id !== id);
    const el = blockElements.get(id);
    if (el) el.remove();
    blockElements.delete(id);
  }

  // Only reorders existing DOM nodes (appendChild on an existing node just
  // moves it) — never rebuilds their innerHTML, so nothing being actively
  // typed into loses focus or cursor position.
  function syncOrder() {
    blocks.forEach((b) => listEl.appendChild(blockElements.get(b.id)));
  }

  function defaultBlockFor(type) {
    document.getElementById("pageBottom") ? location.href = "#pageBottom" : "";
    switch (type) {
      case "text":
        return { type: "text", content: "" };
      case "image":
        return { type: "image", url: "" };
      case "image-pair":
        return { type: "image-pair", left: "", right: "" };
      case "carousel":
        return { type: "carousel", slides: [{ url: "", caption: "" }] };
      case "quote":
        return { type: "quote", text: "", attribution: "" };
    }
  }

  // --- Block DOM construction ---
  function createBlockElement(block) {
    const el = document.createElement("div");
    el.className = "block-item";

    const header = document.createElement("div");
    header.className = "block-item-header";
    header.innerHTML = `<span class="block-item-label">${labelFor(block.type)}</span>`;

    const controls = document.createElement("div");
    controls.className = "block-item-controls";
    controls.appendChild(iconBtn("↑", () => moveBlock(block.id, -1)));
    controls.appendChild(iconBtn("↓", () => moveBlock(block.id, 1)));
    controls.appendChild(
      iconBtn("🗑", () => deleteBlock(block.id), "block-delete"),
    );
    header.appendChild(controls);
    el.appendChild(header);

    const body = document.createElement("div");
    body.className = "block-item-body";
    body.appendChild(buildBody(block));
    el.appendChild(body);

    return el;
  }

  function iconBtn(symbol, onClick, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `block-icon-btn ${extraClass}`;
    btn.textContent = symbol;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function labelFor(type) {
    return (
      {
        text: "Text",
        image: "Bild",
        "image-pair": "Bilder nebeneinander",
        carousel: "Karussell",
        quote: "Zitat",
      }[type] || type
    );
  }

  function buildBody(block) {
    if (block.type === "text") return buildTextBlock(block);
    if (block.type === "image") return buildImageSlot(block, "url");
    if (block.type === "image-pair") return buildImagePairBlock(block);
    if (block.type === "carousel") return buildCarouselBlock(block);
    if (block.type === "quote") return buildQuoteBlock(block);
    const fallback = document.createElement("div");
    fallback.textContent = "Unbekannter Block-Typ";
    return fallback;
  }

  function buildTextBlock(block) {
    const wrapper = document.createElement("div");
    wrapper.className = "block-text-wrapper";

    // --- Format toolbar ---
    const toolbar = document.createElement("div");
    toolbar.className = "block-text-toolbar";

    const formatSelect = document.createElement("select");
    formatSelect.className = "block-text-format-select";
    [
      ["p", "Normal"],
      ["h2", "Überschrift 2"],
      ["h3", "Überschrift 3"],
      ["h4", "Überschrift 4"],
      ["h5", "Überschrift 5"],
      ["h6", "Überschrift 6"],
    ].forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      formatSelect.appendChild(opt);
    });

    const boldBtn = document.createElement("button");
    boldBtn.type = "button";
    boldBtn.className = "block-text-format-btn";
    boldBtn.innerHTML = "<b>B</b>";
    boldBtn.title = "Fett";

    const italicBtn = document.createElement("button");
    italicBtn.type = "button";
    italicBtn.className = "block-text-format-btn";
    italicBtn.innerHTML = "<i>I</i>";
    italicBtn.title = "Kursiv";

    const underlineBtn = document.createElement("button");
    underlineBtn.type = "button";
    underlineBtn.className = "block-text-format-btn";
    underlineBtn.innerHTML = "<u>U</u>";
    underlineBtn.title = "Unterstrichen";

    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = "block-text-format-btn";
    linkBtn.innerHTML = "🔗";
    linkBtn.title = "Link einfügen";

    const unlinkBtn = document.createElement("button");
    unlinkBtn.type = "button";
    unlinkBtn.className = "block-text-format-btn";
    unlinkBtn.innerHTML = "🔗✕";
    unlinkBtn.title = "Link entfernen";

    const bulletListBtn = document.createElement("button");
    bulletListBtn.type = "button";
    bulletListBtn.className = "block-text-format-btn";
    bulletListBtn.innerHTML = "•≡";
    bulletListBtn.title = "Aufzählung";

    const numberListBtn = document.createElement("button");
    numberListBtn.type = "button";
    numberListBtn.className = "block-text-format-btn";
    numberListBtn.innerHTML = "1≡";
    numberListBtn.title = "Nummerierte Liste";

    toolbar.appendChild(formatSelect);
    toolbar.appendChild(boldBtn);
    toolbar.appendChild(italicBtn);
    toolbar.appendChild(underlineBtn);
    toolbar.appendChild(linkBtn);
    toolbar.appendChild(unlinkBtn);
    toolbar.appendChild(bulletListBtn);
    toolbar.appendChild(numberListBtn);

    // --- Editable area ---
    const div = document.createElement("div");
    div.className = "block-text-editable";
    div.contentEditable = "true";
    div.innerHTML = block.content || "";

    // execCommand needs an active selection inside the editable div — since
    // clicking the toolbar moves focus away, we save the last known
    // selection and restore it right before running a format command.
    let savedRange = null;
    function saveSelection() {
      const sel = window.getSelection();
      if (sel.rangeCount && div.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0);
      }
    }

    function restoreSelection() {
      if (!savedRange) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }

    div.addEventListener("keyup", saveSelection);
    div.addEventListener("mouseup", saveSelection);
    div.addEventListener("input", () => {
      block.content = div.innerHTML; // state updated directly, no re-render — cursor stays put
    });

    formatSelect.addEventListener("mousedown", (e) =>
      e.preventDefault ? null : null,
    ); // keep as no-op, selection saved via keyup/mouseup on div already
    formatSelect.addEventListener("change", () => {
      restoreSelection();
      div.focus();
      document.execCommand("formatBlock", false, formatSelect.value);
      block.content = div.innerHTML;
      formatSelect.value = "p"; // reset dropdown after applying, matches typical toolbar UX
    });

    boldBtn.addEventListener("mousedown", (e) => e.preventDefault()); // prevents losing focus/selection on click
    boldBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("bold");
      block.content = div.innerHTML;
    });

    italicBtn.addEventListener("mousedown", (e) => e.preventDefault());
    italicBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("italic");
      block.content = div.innerHTML;
    });

    underlineBtn.addEventListener("mousedown", (e) => e.preventDefault());
    underlineBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("underline");
      block.content = div.innerHTML;
    });

    linkBtn.addEventListener("mousedown", (e) => e.preventDefault());
    linkBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      const url = prompt("Link-Adresse eingeben (z.B. https://...)");
      if (!url) return; // cancelled or empty — do nothing
      document.execCommand("createLink", false, url);
      block.content = div.innerHTML;
    });

    unlinkBtn.addEventListener("mousedown", (e) => e.preventDefault());
    unlinkBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("unlink");
      block.content = div.innerHTML;
    });

    bulletListBtn.addEventListener("mousedown", (e) => e.preventDefault());
    bulletListBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("insertUnorderedList");
      block.content = div.innerHTML;
    });

    numberListBtn.addEventListener("mousedown", (e) => e.preventDefault());
    numberListBtn.addEventListener("click", () => {
      restoreSelection();
      div.focus();
      document.execCommand("insertOrderedList");
      block.content = div.innerHTML;
    });

    wrapper.appendChild(toolbar);
    wrapper.appendChild(div);
    return wrapper;
  }

  // A single image slot: shows the image if set, otherwise an upload prompt.
  // Clicking it always opens the file picker (re-uploading replaces it).
  function buildImageSlot(block, key) {
    const wrapper = document.createElement("div");
    wrapper.className = "block-image-slot";

    function render() {
      wrapper.innerHTML = "";
      if (block[key]) {
        const img = document.createElement("img");
        img.src = block[key];
        wrapper.appendChild(img);
        const replaceLabel = document.createElement("div");
        replaceLabel.className = "block-image-replace-label";
        replaceLabel.textContent = "Klicken zum Ersetzen";
        wrapper.appendChild(replaceLabel);
      } else {
        wrapper.classList.add("block-image-slot-empty");
        wrapper.innerHTML = `<span>+ Bild auswählen</span>`;
      }
    }

    wrapper.addEventListener("click", () =>
      triggerUpload((url) => {
        block[key] = url;
        wrapper.classList.remove("block-image-slot-empty");
        render();
      }),
    );

    render();
    return wrapper;
  }

  function buildImagePairBlock(block) {
    const row = document.createElement("div");
    row.className = "block-image-pair-row";
    row.appendChild(buildImageSlot(block, "left"));
    row.appendChild(buildImageSlot(block, "right"));
    return row;
  }

  function buildCarouselBlock(block) {
    const wrap = document.createElement("div");
    wrap.className = "block-carousel-editor";

    const slidesEl = document.createElement("div");
    slidesEl.className = "block-carousel-slides";

    function renderSlides() {
      slidesEl.innerHTML = "";
      block.slides.forEach((slide, i) => {
        const slideEl = document.createElement("div");
        slideEl.className = "block-carousel-slide-editor";

        const imgSlot = buildImageSlot(slide, "url");
        slideEl.appendChild(imgSlot);

        const captionInput = document.createElement("input");
        captionInput.type = "text";
        captionInput.placeholder = "Bildunterschrift";
        captionInput.value = slide.caption || "";
        captionInput.addEventListener("input", () => {
          slide.caption = captionInput.value;
        });
        slideEl.appendChild(captionInput);

        if (block.slides.length > 1) {
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "block-icon-btn block-delete";
          removeBtn.textContent = "🗑 Bild entfernen";
          removeBtn.addEventListener("click", () => {
            block.slides.splice(i, 1);
            renderSlides();
          });
          slideEl.appendChild(removeBtn);
        }

        slidesEl.appendChild(slideEl);
      });
    }

    const addSlideBtn = document.createElement("button");
    addSlideBtn.type = "button";
    addSlideBtn.className = "block-icon-btn";
    addSlideBtn.textContent = "+ Bild hinzufügen";
    addSlideBtn.addEventListener("click", () => {
      block.slides.push({ url: "", caption: "" });
      renderSlides();
    });

    renderSlides();
    wrap.appendChild(slidesEl);
    wrap.appendChild(addSlideBtn);
    return wrap;
  }

  // Quote block: main quote text + optional attribution (source/name)
  function buildQuoteBlock(block) {
    const wrapper = document.createElement("div");
    wrapper.className = "block-quote-editor";

    const textInput = document.createElement("textarea");
    textInput.className = "block-quote-text";
    textInput.placeholder = "Zitat eingeben …";
    textInput.value = block.text || "";
    textInput.addEventListener("input", () => (block.text = textInput.value));

    const attributionInput = document.createElement("input");
    attributionInput.type = "text";
    attributionInput.className = "block-quote-attribution";
    attributionInput.placeholder = "Quelle / Name (optional)";
    attributionInput.value = block.attribution || "";
    attributionInput.addEventListener(
      "input",
      () => (block.attribution = attributionInput.value),
    );

    wrapper.appendChild(textInput);
    wrapper.appendChild(attributionInput);
    return wrapper;
  }

  function triggerUpload(onDone) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const url = await onUploadImage(file);
        onDone(url);
      } catch (err) {
        console.error("Upload fehlgeschlagen:", err);
        alert("Bild-Upload fehlgeschlagen.");
      }
    };
    input.click();
  }

  // --- Toolbar: the "+ Block hinzufügen" buttons ---
  const toolbar = document.createElement("div");
  toolbar.className = "block-editor-toolbar";
  [
    ["text", "+ Text hinzufügen"],
    ["image", "+ Bild hinzufügen"],
    ["image-pair", "+ Bilder nebeneinander"],
    ["carousel", "+ Karussell hinzufügen"],
    ["quote", "+ Zitat hinzufügen"],
  ].forEach(([type, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => addBlock(type));
    toolbar.appendChild(btn);
  });

  const listEl = document.createElement("div");
  listEl.className = "block-editor-list";

  container.innerHTML = "";
  container.appendChild(toolbar);
  container.appendChild(listEl);

  setBlocks(initialBlocks);

  // Default starting block for a brand-new post. Harmless for edit mode too —
  // loadExistingWorkshopData calls setBlocks() again afterward, which fully
  // clears and rebuilds state, so this default gets replaced, not duplicated.
  addBlock("text");

  return { getBlocks, setBlocks };
}
