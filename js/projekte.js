import { projectCard } from "./components/projectCard.js";
import { getAllProjects, getMintstepsProjects } from "./data/projectsDb.js";

async function initProjects() {
const container = document.getElementById("projectsContainer");
if(!container) return;

container.innerHTML = "";

const projectsData = await getAllProjects();

  if (!projectsData || projectsData.length === 0) {
    container.innerHTML = `<p class="muted-text">Es gibt noch keine projekte.</p>`;
    return;
  }

const projects = await projectCard(projectsData);

container.append(projects);
}

await initProjects();

async function initMintstepsProjects() {
  const container = document.getElementById("mintstepsProjectsContainer");

  if (!container) return;

  container.innerHTML = "";

  const projectsData = await getMintstepsProjects();

  if (!projectsData || projectsData.length === 0) {
    container.innerHTML = `<p class="muted-text">Es gibt noch keine MINTSteps projekte.</p>`;
    return;
  }

  const projects = await projectCard(projectsData);

  container.append(projects);
}

await initMintstepsProjects();