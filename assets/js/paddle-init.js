(async () => {
  if (!window.Paddle) return;

  // Get logged-in user's Paddle customer ID
  let paddleCustomerId = null;

  if (window.dasSupabase?.auth) {
    try {
      const { data } = await window.dasSupabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const meta = user.user_metadata || {};
        const appMeta = user.app_metadata || {};
        paddleCustomerId =
          appMeta.paddle_customer_id || meta.paddle_customer_id || null;
      }
    } catch (err) {
      console.warn("Could not fetch user for Paddle Retain:", err);
    }
  }

  // Initialize Paddle with Retain support
  try {
    window.Paddle.Initialize({
      token: "live_5dddba89244dee1c26f561c5b75",
      pwCustomer: paddleCustomerId?.startsWith("ctm_")
        ? { id: paddleCustomerId }
        : {}, // empty object if no customer ID (per Paddle docs)
    });
    window.dasPaddleInitialized = true;
  } catch (err) {
    console.error("Paddle init failed:", err);
  }
})();
