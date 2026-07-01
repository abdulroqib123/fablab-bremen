import { supabase } from "../../js/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initial Session Security Guard
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "login.html";
    return;
  }

  // 2. Load Dashboard Meta Data
  loadAdminProfile(session.user.id);
  loadQuickStats();

  // 3. Handle Logout Trigger
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
});

// Fetch current admin's real name from the custom admins profile table
async function loadAdminProfile(id) {
  const { data: profile, error } = await supabase
    .from("admins")
    .select("full_name")
    .eq("id", id)
    .single();

  if (!error && profile) {
    document.getElementById("admin-name-display").textContent =
      profile.full_name;
    document.getElementById("welcome-heading").textContent =
      `Moin, ${profile.full_name}!`;
  } else {
    document.getElementById("admin-name-display").textContent = email; // Fallback
  }
}

// Fetch total records instantly to populate metric badges
async function loadQuickStats() {
  // Count active workshops
  const { count: wsCount, error: wsErr } = await supabase
    .from("workshops")
    .select("*", { count: "exact", head: true });

  if (!wsErr) document.getElementById("count-workshops").textContent = wsCount;

  // Count active projects
  const { count: projCount, error: projErr } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  if (!projErr)
    document.getElementById("count-projects").textContent = projCount;
}
