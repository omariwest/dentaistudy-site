document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pricing-plan]");
  if (!btn) return;

  const plan = btn.getAttribute("data-pricing-plan");
  if (plan !== "pro" && plan !== "pro_yearly") return;

  e.preventDefault();

  // 1) Get the real logged-in Supabase user (DO NOT rely on window.dasUser)
  if (!window.dasSupabase?.auth) return;

  const { data, error } = await window.dasSupabase.auth.getUser();
  if (error) {
    console.error("getUser error:", error);
    return;
  }

  const user = data?.user;
  if (!user) {
    // Not logged in -> go signup with plan selected
    const url = new URL("signup.html", window.location.origin);
    url.searchParams.set("plan", plan);
    window.location.href = url.toString();
    return;
  }

  // 2) Paddle must be ready
  if (!window.Paddle || !window.dasPaddleInitialized) {
    console.error("Paddle not initialized");
    return;
  }

  const priceIdByPlan = {
    pro: "pri_01kf6ec0xh0e6a055tfjaqt8sp",
    pro_yearly: "pri_01kf6ea46qs390nfh7d0pa93x6",
  };

  // 3) Open checkout with customData
  window.Paddle.Checkout.open({
    settings: {
      displayMode: "overlay",
      successUrl: `${
        window.location.origin
      }/billing-success.html?plan=${encodeURIComponent(plan)}`,
    },
    items: [{ priceId: priceIdByPlan[plan], quantity: 1 }],
    customer: { email: user.email },
    customData: {
      supabase_user_id: user.id,
      plan,
    },
  });
});
