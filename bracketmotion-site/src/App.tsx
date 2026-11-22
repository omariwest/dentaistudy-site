type Platform = "Windows" | "macOS";

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "Windows") {
    return (
      <svg className="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4.2 10.4 3v8H3V4.2Zm8.6-1.4L21 1.5V11h-9.4V2.8ZM3 13h7.4v8L3 19.8V13Zm8.6 0H21v9.5l-9.4-1.3V13Z" />
      </svg>
    );
  }

  return (
    <svg className="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.9 12.8c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.2-2-3.9-2-1.7-.2-3.2 1-4 1-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.5 3.2 2.4 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.6-1-2.6-3.8ZM14.1 5c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.7-3.2 1.6-.7.8-1.3 2-1.2 3.2 1.2.1 2.5-.6 3.3-1.5Z" />
    </svg>
  );
}

function InstallButton({
  platform,
  compact = false,
  primary = false,
}: {
  platform: Platform;
  compact?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      className={[
        "install-button",
        compact ? "install-button--compact" : "",
        primary ? "install-button--primary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-label={`Install BracketMotion for ${platform}`}
    >
      <PlatformIcon platform={platform} />
      <span>{compact ? platform : `Install for ${platform}`}</span>
    </button>
  );
}

const workflowSteps = [
  { number: "01", title: "Case", text: "Bring the patient's records and 3D dentition into one workspace." },
  { number: "02", title: "Plan", text: "Compare a primary treatment strategy with a clear alternative." },
  { number: "03", title: "Mechanics", text: "Choose the fixed-appliance mechanics that carry the plan." },
  { number: "04", title: "Movement", text: "See the planned stages unfold on the patient's own dentition." },
];

export default function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a className="wordmark" href="/" aria-label="BracketMotion home">
            BracketMotion<span>.</span>
          </a>

          <div className="header-actions" aria-label="Install BracketMotion">
            <InstallButton platform="Windows" compact />
            <InstallButton platform="macOS" compact />
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">
                <span aria-hidden="true" />
                Built for fixed-appliance orthodontics
              </p>

              <h1>
                <span>Plan the mechanics.</span>
                <strong>See the movement.</strong>
              </h1>

              <p className="hero-description">
                Patient-specific treatment planning and mechanics visualization for everyday orthodontics.
              </p>

              <div className="hero-actions" aria-label="Install options">
                <InstallButton platform="Windows" primary />
                <InstallButton platform="macOS" />
              </div>
            </div>

            <div className="demo-stage" aria-hidden="true">
              <div className="demo-glow" />
              <div className="demo-frame" />
            </div>
          </div>
        </section>

        <section className="workflow" aria-labelledby="workflow-title">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">One clinical flow</p>
              <h2 id="workflow-title">Case to movement, without changing how you practice.</h2>
            </div>

            <ol className="workflow-grid">
              {workflowSteps.map((step) => (
                <li className="workflow-step" key={step.title}>
                  <div className="workflow-step__top">
                    <span className="workflow-step__number">{step.number}</span>
                    <span className="workflow-step__dot" aria-hidden="true" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="final-cta" aria-labelledby="final-cta-title">
          <div className="container final-cta__card">
            <div className="final-cta__copy">
              <p className="section-kicker">BracketMotion</p>
              <h2 id="final-cta-title">The fixed-appliance workflow, made visible.</h2>
              <p>Install it where you work. Your cases, plans, mechanics and movement stay one step away.</p>
            </div>

            <div className="final-cta__actions" aria-label="Install BracketMotion">
              <InstallButton platform="Windows" primary />
              <InstallButton platform="macOS" />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a className="wordmark wordmark--footer" href="/" aria-label="BracketMotion home">
              BracketMotion<span>.</span>
            </a>
            <p>Plan the mechanics. See the movement.</p>
          </div>

          <nav className="footer-links" aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/clinical-disclaimer">Clinical Disclaimer</a>
            <a href="mailto:support@bracketmotion.com">support@bracketmotion.com</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
