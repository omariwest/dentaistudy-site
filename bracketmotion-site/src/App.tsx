function InstallButton({ platform }: { platform: "Windows" | "macOS" }) {
  return (
    <button className="install-button" type="button" aria-label={`Install BracketMotion for ${platform}`}>
      <span className="install-button__mark" aria-hidden="true" />
      <span>Install for {platform}</span>
    </button>
  );
}

export default function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a className="wordmark" href="/" aria-label="BracketMotion home">
            BracketMotion<span>.</span>
          </a>

          <div className="header-actions" aria-label="Install BracketMotion">
            <InstallButton platform="Windows" />
            <InstallButton platform="macOS" />
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">
                <span aria-hidden="true" />
                Conventional orthodontics, visualized.
              </p>

              <h1>
                Plan the mechanics.
                <strong>See the movement.</strong>
              </h1>

              <p className="hero-description">
                A patient-specific planning workspace for everyday fixed-appliance orthodontics.
              </p>

              <div className="hero-actions" aria-label="Install options">
                <InstallButton platform="Windows" />
                <InstallButton platform="macOS" />
              </div>
            </div>

            <div className="demo-frame" aria-label="BracketMotion product demo placeholder">
              <span>Product demo</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
