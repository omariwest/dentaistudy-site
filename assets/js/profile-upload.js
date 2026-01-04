// dentAIstudy-v3/assets/js/profile-upload.js
// Profile picture upload for Supabase Storage (public bucket) + user_metadata avatar_url persistence.
//
// Requirements in this project:
// - Supabase client is exposed as `window.dasSupabase` (created in assets/js/auth-client.js).
// - Auth UI + avatar rendering across pages is handled in assets/js/auth-guard.js via `user.user_metadata.avatar_url`.
// - This file only handles uploading + saving the avatar_url into user_metadata.
//
// Bucket convention used here:
// - bucket: profile-pictures
// - object path: <user_id>/avatar.<ext> (upserted)
//
// Notes:
// - If your Storage policies only allow INSERT (not UPDATE), upsert will fail after the first upload.
//   Ensure authenticated users can INSERT + UPDATE on storage.objects for bucket `profile-pictures`.

(() => {
  "use strict";

  const BUCKET = "profile-pictures";
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
  }

  function isImage(file) {
    return (
      !!file && typeof file.type === "string" && file.type.startsWith("image/")
    );
  }

  function fileExt(file) {
    const fromName = (file.name || "").split(".").pop();
    if (fromName && fromName.length <= 10) return fromName.toLowerCase();
    const fromType = (file.type || "").split("/").pop();
    if (fromType && fromType.length <= 10) return fromType.toLowerCase();
    return "png";
  }

  function withCacheBust(url) {
    const v = Date.now().toString();
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}v=${v}`;
  }

  function applyAvatarEverywhere(avatarUrl) {
    if (!avatarUrl) return;

    // Profile page: main avatar
    const main = $("das-profile-avatar-main");
    if (main && main.tagName === "IMG") main.src = avatarUrl;

    // Any page: targets marked with data-das-avatar (auth-guard also updates these on load)
    document.querySelectorAll("[data-das-avatar]").forEach((el) => {
      if (el && el.tagName === "IMG") el.src = avatarUrl;
    });

    window.dispatchEvent(
      new CustomEvent("das:avatar-updated", {
        detail: { avatar_url: avatarUrl },
      })
    );
  }

  async function getAuthedUser(supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data || !data.user) throw new Error("Not authenticated");
    return data.user;
  }

  async function loadExistingAvatar(supabase) {
    try {
      const user = await getAuthedUser(supabase);
      const meta = user.user_metadata || {};
      const avatarUrl = meta.avatar_url || meta.picture || "";
      if (avatarUrl) applyAvatarEverywhere(avatarUrl);
    } catch (_) {
      // Not logged in; auth-guard will handle redirects for protected pages.
    }
  }

  async function uploadAvatar({ supabase, file, statusEl }) {
    if (!isImage(file)) throw new Error("Please choose an image file.");
    if (file.size > MAX_BYTES) throw new Error("Image is too large (max 5MB).");

    setStatus(statusEl, "Uploading photo...");

    const user = await getAuthedUser(supabase);
    const ext = fileExt(file);
    const objectPath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, {
        upsert: true,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });

    if (uploadError) {
      // Common cause: Storage policy allows INSERT but not UPDATE (needed for upsert).
      throw uploadError;
    }

    const { data: pub } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl)
      throw new Error("Failed to get public URL for uploaded image.");

    const versionedUrl = withCacheBust(publicUrl);

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: versionedUrl,
        avatar_path: objectPath,
      },
    });

    if (updateError) throw updateError;

    setStatus(statusEl, "Photo updated.");
    applyAvatarEverywhere(versionedUrl);
    return { avatar_url: versionedUrl, avatar_path: objectPath };
  }

  function wireUi({ supabase }) {
    const input = $("avatar-input");
    const btn = $("avatar-upload-btn");
    const statusEl = $("avatar-status");

    if (!input || input.type !== "file") return;

    if (btn) {
      btn.addEventListener("click", () => input.click());
    }

    input.addEventListener("change", async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      try {
        // Optimistic preview (local) – purely for UX.
        const main = $("das-profile-avatar-main");
        if (main && main.tagName === "IMG") {
          try {
            main.src = URL.createObjectURL(file);
          } catch (_) {
            // ignore
          }
        }

        await uploadAvatar({ supabase, file, statusEl });
      } catch (err) {
        console.error("[profile-upload] upload failed:", err);
        setStatus(statusEl, err?.message || "Upload failed.");
      } finally {
        input.value = "";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.dasSupabase;
    if (!supabase) return;

    await loadExistingAvatar(supabase);
    wireUi({ supabase });
  });
})();
