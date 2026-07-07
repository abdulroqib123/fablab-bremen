import { supabase } from "../../js/supabase.js";

initMachinesList();

async function initMachinesList() {
  // 1. Authentication Guard
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // 2. Load Admin Name
  const { data: adminProfile } = await supabase
    .from("admins")
    .select("full_name")
    .eq("id", session.user.id)
    .single();

  document.getElementById("admin-name").textContent =
    adminProfile?.full_name || session.user.email;

  // 3. Render Machines
  renderMachinesTable();
}

async function renderMachinesTable() {
  const container = document.getElementById("machines-list-container");

  // Fetch machines
  const { data: machines, error } = await supabase
    .from("machines")
    .select("id, name, description, updated_at, author: posted_by(full_name)")
    .order("updated_at", { ascending: false });

  if (error) {
    container.innerHTML = `
      <div style="padding: 24px; color: var(--status-warn);">
        Fehler beim Laden: ${error.message}
      </div>`;
    return;
  }

  if (!machines || machines.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; color: var(--text-muted); text-align: center;">
        Keine Maschinen vorhanden.
      </div>`;
    return;
  }

  // Build list
  const markup = machines
    .map((mc) => {
      const formattedDate = new Date(mc.updated_at).toLocaleDateString(
        "de-DE",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      const shortDesc = mc.description
        ? mc.description.slice(0, 60) + "..."
        : "Keine Beschreibung";

      return `
        <div class="list-row"
             style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border-primary);">

          <div style="flex: 2;">
            <h4 style="margin: 0 0 4px 0; color: var(--text-main); font-size: 1.1rem;">
              ${mc.name}
            </h4>

            <p style="font-size: 0.95rem; color: var(--text-main);">
              ${shortDesc}
            </p>

            <span style="font-size: 0.85rem; color: var(--text-muted);">
              Letzte Aktualisierung: ${formattedDate} |
              Von: ${mc.author?.full_name || "Unbekannt"}
            </span>
          </div>

          <div style="display: flex; gap: 16px;">
            <a href="machine-form.html?id=${mc.id}"
               style="color: var(--accent-primary); text-decoration: none; font-size: 0.95rem;">
              Bearbeiten ✏️
            </a>

            <button class="delete-btn"
                    data-id="${mc.id}"
                    style="background: none; border: none; color: var(--status-warn); cursor: pointer; font-size: 0.95rem; font-weight: 500;">
              Löschen 🗑️
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = markup;

  // Bind delete handlers
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");

      const confirmed = confirm(
        "Bist du sicher, dass du diese Maschine unwiderruflich löschen möchtest?",
      );
      if (!confirmed) return;

      const { error: deleteErr } = await supabase
        .from("machines")
        .delete()
        .eq("id", id);

      if (deleteErr) {
        alert(`Fehler beim Löschen: ${deleteErr.message}`);
        return;
      }

      // Refresh list
      renderMachinesTable();
    });
  });
}
