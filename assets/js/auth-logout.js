// DentAIstudy — Logout handler with smart redirect (delegated)

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-das-logout]");
  if (!target) return; // not a logout click

  event.preventDefault();

  try {
    // Sign out from Supabase if available
    if (window.dasSupabase && window.dasSupabase.auth) {
      await window.dasSupabase.auth.signOut();
    }
  } catch (err) {
    console.error("Logout failed:", err);
  }

  // Decide what to do based on current page
  const path = (window.location.pathname || "").toLowerCase();
  const isAuthArea =
    path.includes("study.html") ||
    path.includes("profile.html") ||
    path.includes("settings.html");

  if (isAuthArea) {
    // From study/profile/settings → go to public Study builder (guest mode)
    window.location.href = "study.html";
  } else {
    // From blogs/legal/etc → stay on the same page as logged-out user
    window.location.reload();
  }
});