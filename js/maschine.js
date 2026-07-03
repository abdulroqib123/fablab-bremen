import { getMachineById } from "./data/machinesDb.js";

const params = new URLSearchParams(window.location.search);
const machineId = params.get("mc");

async function initMachines() {
if(!machineId) return window.location.href = "maschinen.html";

    const machineName = document.getElementById("machineName");
    const machineContent = document.getElementById("machineContent");

    const projectData = await getMachineById(machineId);
    
    machineName.textContent = projectData.name;
    machineContent.innerHTML = projectData.content;
}
await initMachines();