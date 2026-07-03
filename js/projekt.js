import { getProjectById } from "./data/projectsDb.js";

const params = new URLSearchParams(window.location.search);
const projectId = params.get("pj");

async function initProject() {
if(!projectId) return window.location.href = "projekte.html";

    const projectName = document.getElementById("projectName");
    const projectContent = document.getElementById("projectContent");

    const projectData = await getProjectById(projectId);
    
    projectName.textContent = projectData.title;
    projectContent.innerHTML = projectData.content;
}
await initProject();