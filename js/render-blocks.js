// js/render-blocks.js
// Takes the JSON array saved by the block editor and turns it into real
// HTML for the public site, using your actual card/article classes.
// Import wherever project/workshop content currently gets displayed.

export function renderBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(renderBlock).join("\n");
}

function renderBlock(block) {
  switch (block.type) {
    case "text":
      return `<div class="content-text-block">${block.content || ""}</div>`;

    case "image":
      return block.url
        ? `<div class="content-image-block"><img src="${escapeAttr(block.url)}" alt=""></div>`
        : "";

    case "image-pair":
      return `<div class="content-image-pair">
        ${block.left ? `<img src="${escapeAttr(block.left)}" alt="">` : ""}
        ${block.right ? `<img src="${escapeAttr(block.right)}" alt="">` : ""}
      </div>`;

    case "carousel":
      return renderCarousel(block);

    case "quote":
      return block.text
        ? `<blockquote class="content-quote-block">
            <p>${escapeHtml(block.text)}</p>
            ${block.attribution ? `<footer>${escapeHtml(block.attribution)}</footer>` : ""}
          </blockquote>`
        : "";

    default:
      return "";
  }
}

function renderCarousel(block) {
  const slides = (block.slides || []).filter((s) => s.url);
  if (!slides.length) return "";

  const slidesHtml = slides
    .map(
      (s, i) => `
    <div class="content-carousel-slide" style="display:${i === 0 ? "block" : "none"}">
      <img src="${escapeAttr(s.url)}" alt="">
      ${s.caption ? `<p class="content-carousel-caption">${escapeHtml(s.caption)}</p>` : ""}
    </div>
  `,
    )
    .join("");

  // Inline onclick keeps this self-contained without needing a separate
  // script per carousel instance — fine for a handful of carousels per page.
  return `
    <div class="content-carousel" data-carousel>
      ${slidesHtml}
      ${
        slides.length > 1
          ? `
        <button type="button" class="content-carousel-prev" onclick="window.__carouselNav(this, -1)">‹</button>
        <button type="button" class="content-carousel-next" onclick="window.__carouselNav(this, 1)">›</button>
      `
          : ""
      }
    </div>
  `;
}

// Attach once globally on the public site (e.g. in your main app.js)
window.__carouselNav = function (btn, dir) {
  const carousel = btn.closest("[data-carousel]");
  const slides = [...carousel.querySelectorAll(".content-carousel-slide")];
  const currentIndex = slides.findIndex((s) => s.style.display !== "none");
  slides[currentIndex].style.display = "none";
  const nextIndex = (currentIndex + dir + slides.length) % slides.length;
  slides[nextIndex].style.display = "block";
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}
