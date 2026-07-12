import { getMachineById } from "./data/machinesDb.js";
import { createTextPreview } from "./utils/textPreview.js";
import { renderContent, getPreviewSource } from "./content-compat.js";

const params = new URLSearchParams(window.location.search);
const machineId = params.get("mc");

async function initMachines() {
if(!machineId) return window.location.href = "maschinen.html";

    const machineName = document.getElementById("machineName");
    const machineContent = document.getElementById("machineContent");

    const machineData = await getMachineById(machineId);
    
      if (!machineData) {
        machineContent.innerHTML = `<p style="color: var(--status-warn); font-size: 0.8rem; text-align: center;">Der Maschine, den Sie suchen, existiert nicht oder wurde gelöscht.</p>`;
        return;
      }

      //META DESCRIPTION FOR SEO
          const metaDesc = document.createElement("meta");
            metaDesc.name = "description";
            metaDesc.content = createTextPreview(machineData.content || "", 120)
            document.querySelector("head").appendChild(metaDesc);

            //PAGE TITLE FOR SEO AND ACCESSIBILITY
                document.querySelector("title").textContent =
                  `${machineData.name} | FabLab`;  

    machineName.textContent = machineData.name;
    machineContent.innerHTML = renderContent(machineData.content);

    const imgs = document.querySelectorAll("#machineContent img");
    imgs.forEach((img) => {
      img.alt = `Foto von die ${machineData.name} Maschine`;
    });
}
await initMachines();