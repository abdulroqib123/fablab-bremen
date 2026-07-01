import { supabase } from "../../js/supabase.js";


document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorBanner = document.getElementById('error-message');

  // Clear previous errors
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';

  // Trigger Supabase Authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    errorBanner.textContent = `Anmeldung fehlgeschlagen: ${error.message}`;
    errorBanner.classList.remove('hidden');
  } else {
    // Session token generated seamlessly, move inside the command center
    window.location.href = 'dashboard.html';
  }
});