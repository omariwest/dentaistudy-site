(() => {
  if (!window.Paddle) return;

  try {
    window.Paddle.Initialize({
      token: "live_5dddba89244dee1c26f561c5b75", // My live DentAIstudy client-side token
    });
    window.dasPaddleInitialized = true;
  } catch (err) {
    console.error("Paddle init failed:", err);
  }
})();
