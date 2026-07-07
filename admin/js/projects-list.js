import { supabase } from "../../js/supabase.js";

initListZone();

async function initListZone() {
  // 1. Guard Authentication Session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // 2. Load Username Into Navbar
  const { data: adminProfile } = await supabase
    .from("admins")
    .select("full_name")
    .eq("id", session.user.id)
    .single();
  document.getElementById("admin-name").textContent = adminProfile
    ? adminProfile.full_name
    : session.user.email;

  // 3. Render Table
  renderProjectsTable();
}

async function renderProjectsTable() {
  const container = document.getElementById("projects-list-container");

  // Fetch columns from Supabase
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, event_date, author: posted_by(full_name)")
    .order("event_date", { ascending: false });

  if (error) {
    container.innerHTML = `<div style="padding: 24px; color: var(--status-warn);">Fehler beim Laden: ${error.message}</div>`;
    return;
  }

  if (projects.length === 0) {
    container.innerHTML = `<div style="padding: 24px; color: var(--text-muted); text-align: center;">Keine Projekte vorhanden.</div>`;
    return;
  }

  // Build rows dynamically inside our clean dark-mode variables
  let htmlMarkup = projects
    .map((pj) => {
      const formattedDate = new Date(pj.event_date).toLocaleDateString(
        "de-DE",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      return `
      <div class="list-row" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border-primary);">
        <div style="flex: 2;">
          <h4 style="margin: 0 0 4px 0; color: var(--text-main); font-size: 1.1rem;">${pj.title}</h4>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Termin: ${formattedDate} | Von: ${pj.author?.full_name || "Unbekannt"}</span>
        </div>
        <div style="display: flex; gap: 16px;">
          <a href="project-form.html?id=${pj.id}" style="color: var(--accent-primary); text-decoration: none; font-size: 0.95rem;">Bearbeiten ✏️</a>
          <button class="delete-btn" data-id="${pj.id}" style="background: none; border: none; color: var(--status-warn); cursor: pointer; font-size: 0.95rem; font-weight: 500;">Löschen 🗑️</button>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = htmlMarkup;

  // Bind direct event listeners to every individual trash button element node
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (
        confirm(
          "Bist du sicher, dass du diesen Workshop unwiderruflich löschen möchtest?",
        )
      ) {
        const { error: deleteErr } = await supabase
          .from("projects")
          .delete()
          .eq("id", id);
        if (deleteErr) {
          alert(`Fehler beim Löschen: ${deleteErr.message}`);
        } else {
          renderProjectsTable(); // Instant hot-reload grid redraw
        }
      }
    });
  });
}
