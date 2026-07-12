import { getWorkshopById } from "./data/workshopsDb.js";
import { createTextPreview } from "./utils/textPreview.js";
import { renderContent, getPreviewSource } from "./content-compat.js";

const params = new URLSearchParams(window.location.search);
const workshopId = params.get("ws");

async function initWorkshop() {
  if (!workshopId) return (window.location.href = "workshops.html");

  const workshopName = document.getElementById("workshopName");
  const workshopContent = document.getElementById("workshopContent");

  const workshopData = await getWorkshopById(workshopId);

  if (!workshopData) {
    workshopContent.innerHTML = `<p style="color: var(--status-warn); font-size: 0.8rem; text-align: center;">Der Workshop, den Sie suchen, existiert nicht oder wurde gelöscht.</p>`;
    return;
  }

  //META DESCRIPTION FOR SEO
  const metaDesc = document.createElement("meta");
  metaDesc.name = "description";
  metaDesc.content = createTextPreview(workshopData.content || "", 120);
  document.querySelector("head").appendChild(metaDesc);

  //PAGE TITLE FOR SEO AND ACCESSIBILITY
  document.querySelector("title").textContent =
    `${workshopData.title} | FabLab`;

  workshopName.textContent = workshopData.title;
  workshopContent.innerHTML = renderContent(workshopData.content);

  const imgs = document.querySelectorAll("#workshopContent img");
  imgs.forEach((img) => {
    img.alt = `Foto von das ${workshopData.name} Workshop`;
  });
}
await initWorkshop();