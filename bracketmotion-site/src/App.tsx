import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClinicalViewerHandle } from "./ClinicalViewer";
import UiSelect from "./UiSelect";
import NumberInput from "./NumberInput";
import { cephAngles, type CephTrace } from "./cephGeometry";
import type {
  ScanPersistenceState,
  StageAiReviewResult,
  StagePersistenceState,
} from "./ScanWorkflow";
import {
  createBracketMotionCase,
  downloadBracketMotionAvatar,
  uploadBracketMotionAvatar,
  removeBracketMotionAvatar,
  invokeBracketMotionClinicalReview,
  listBracketMotionCases,
  loadBracketMotionCase,
  saveBracketMotionCase,
  supabase,
  type BracketMotionCaseSummary,
  type BracketMotionSession,
} from "./supabase";

const ClinicalViewer = lazy(() => import("./ClinicalViewer"));
const ScanWorkflow = lazy(() => import("./ScanWorkflow"));
const CephAnalysis = lazy(() => import("./CephAnalysis"));

type Platform = "Windows" | "macOS";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithInstall = Navigator & {
  install?: () => Promise<unknown>;
};

type InstallContextValue = {
  installed: boolean;
  installing: boolean;
  installAvailable: boolean;
  requestInstall: (platform: Platform) => Promise<void>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function supportsWebInstall() {
  return typeof (navigator as NavigatorWithInstall).install === "function";
}

function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneMode);
  const [installing, setInstalling] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<Platform | null>(null);
  const installAvailable = supportsWebInstall() || installPrompt !== null;

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setGuidePlatform(null);
    };

    const handleDisplayMode = () => {
      setInstalled(isStandaloneMode());
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", handleDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", handleDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (!guidePlatform) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuidePlatform(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guidePlatform]);

  const requestInstall = useCallback(
    async (platform: Platform) => {
      if (installed) {
        window.location.assign("/app");
        return;
      }

      if (installing) return;

      setInstalling(true);
      setGuidePlatform(null);

      try {
        const webInstall = (navigator as NavigatorWithInstall).install;

        if (typeof webInstall === "function") {
          await webInstall.call(navigator);
          return;
        }

        if (installPrompt) {
          const promptEvent = installPrompt;
          setInstallPrompt(null);
          await promptEvent.prompt();
          await promptEvent.userChoice;
          return;
        }

        setGuidePlatform(platform);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }

        console.error("BracketMotion install prompt failed:", cause);
        setGuidePlatform(platform);
      } finally {
        setInstalling(false);
      }
    },
    [installPrompt, installed, installing],
  );

  const value = useMemo(
    () => ({ installed, installing, installAvailable, requestInstall }),
    [installed, installing, installAvailable, requestInstall],
  );

  return (
    <InstallContext.Provider value={value}>
      {children}

      {guidePlatform && (
        <div
          className="install-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setGuidePlatform(null)}
        >
          <section
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="install-dialog__header">
              <div>
                <span>Install BracketMotion</span>
                <h2 id="install-dialog-title">{guidePlatform}</h2>
              </div>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setGuidePlatform(null)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="install-dialog__body">
              {guidePlatform === "Windows" ? (
                <>
                  <p>
                    Chrome or Edge: use the install/app icon in the address bar. If it is
                    not shown, open the browser menu and choose its install-app option.
                  </p>
                  <small>
                    This browser is not exposing a direct install prompt to BracketMotion.
                  </small>
                </>
              ) : (
                <>
                  <p>
                    Safari: choose <strong>File → Add to Dock</strong> or Share → Add to
                    Dock. Chrome or Edge: use the install/app icon in the address bar.
                  </p>
                  <small>
                    This browser is not exposing a direct install prompt to BracketMotion.
                  </small>
                </>
              )}

              <div className="install-dialog__actions">
                <button
                  className="app-primary-action"
                  type="button"
                  aria-disabled={!installAvailable || installing}
                  onClick={() => {
                    if (installAvailable && !installing) {
                      void requestInstall(guidePlatform);
                    }
                  }}
                >
                  {installing
                    ? "Installing…"
                    : installAvailable
                      ? "Install BracketMotion"
                      : "Preparing install…"}
                </button>
                <button
                  className="app-quiet-button"
                  type="button"
                  onClick={() => setGuidePlatform(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </InstallContext.Provider>
  );
}

function usePwaInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider.");
  }
  return context;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

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
  const { installed, installing, installAvailable, requestInstall } = usePwaInstall();

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
      aria-disabled={installing}
      aria-label={
        installed
          ? "Open BracketMotion"
          : installing
            ? "Installing BracketMotion"
            : installAvailable
              ? `Install BracketMotion for ${platform}`
              : `Show BracketMotion installation steps for ${platform}`
      }
      onClick={() => {
        if (!installing) void requestInstall(platform);
      }}
    >
      <PlatformIcon platform={platform} />
      <span>
        {installed
          ? compact
            ? "Open"
            : "Open BracketMotion"
          : installing
            ? "Installing…"
            : installAvailable
              ? compact
                ? platform
                : `Install for ${platform}`
              : compact
                ? platform
                : `Install for ${platform}`}
      </span>
    </button>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="wordmark" href="/" aria-label="BracketMotion home">
          <span className="wordmark__text">bracket<strong>motion</strong></span>
        </a>

        <div className="header-actions" aria-label="Install BracketMotion">
          <InstallButton platform="Windows" compact />
          <InstallButton platform="macOS" compact />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a className="wordmark wordmark--footer" href="/" aria-label="BracketMotion home">
            <span className="wordmark__text">bracket<strong>motion</strong></span>
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
  );
}

const workflowSteps = [
  { number: "1", title: "Case", text: "Bring the patient's records and 3D dentition into one workspace." },
  { number: "2", title: "Plan", text: "Compare a primary treatment strategy with a clear alternative." },
  { number: "3", title: "Mechanics", text: "Choose the fixed-appliance mechanics that carry the plan." },
  { number: "4", title: "Movement", text: "See the planned stages unfold on the patient's own dentition." },
];

function HomePage() {
  return (
    <>
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
      <Footer />
    </>
  );
}


const clinicalFlow = [
  {
    label: "Case", title: "Clinical Records", detail: "Clinical records",
    icon: <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v4H9zM8 11h8M8 15h8" />,
  },
  {
    label: "Findings", title: "Diagnosis", detail: "Clinical findings",
    icon: <><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5M7 10l2 2 4-4" /></>,
  },
  {
    label: "Plan", title: "Treatment Plans", detail: "Clinical strategy",
    icon: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />,
  },
  {
    label: "Setup", title: "3D Setup", detail: "Current scan-based workspace",
    icon: <path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10" />,
  },
  {
    label: "Stages", title: "Mechanics", detail: "Approved setup and stages",
    icon: <><path d="M3 7h18M3 17h18" /><circle cx="9" cy="7" r="2.5" /><circle cx="16" cy="17" r="2.5" /></>,
  },
] as const;

type ClinicalSection = (typeof clinicalFlow)[number]["label"];

type PhotoKey = "frontal" | "upperOcclusal" | "lowerOcclusal" | "rightBuccal" | "leftBuccal" | "faceFront" | "smile" | "profile" | "pano" | "ceph";
type CasePhoto = { name: string; file: File; previewUrl: string };

const intraoralPhotoSlots: Array<{ key: PhotoKey; title: string }> = [
  { key: "frontal", title: "Frontal" },
  { key: "upperOcclusal", title: "Upper occlusal" },
  { key: "lowerOcclusal", title: "Lower occlusal" },
  { key: "rightBuccal", title: "Right buccal" },
  { key: "leftBuccal", title: "Left buccal" },
];
// Images remain in the tab and are converted only for an explicit AI draft request.
// Canvas strips file metadata and keeps the five-image request small.
async function prepareDiagnosisPhoto(file: File) {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 960 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL("image/jpeg", 0.7).split(",")[1] || "";
    if (!encoded || encoded.length > 440_000) throw new Error("IMAGE_TOO_LARGE");
    return { mime_type: "image/jpeg", data: encoded };
  } finally {
    image.close();
  }
}

const facialPhotoSlots: Array<{ key: PhotoKey; title: string }> = [
  { key: "faceFront", title: "Frontal face" },
  { key: "smile", title: "Smile" },
  { key: "profile", title: "Right profile" },
];
const radiographSlots: Array<{ key: PhotoKey; title: string }> = [
  { key: "pano", title: "Panoramic radiograph" },
  { key: "ceph", title: "Lateral cephalogram" },
];

type CaseDetailsState = {
  age: string;
  sex: string;
  patientStage: string;
  growthStatus: string;
  chiefComplaint: string;
  medicalHistory: string;
  dentalHistory: string;
  notes: string;
};

type FindingsState = {
  oralHygiene: string;
  periodontalStatus: string;
  activeCaries: string;
  restorativeConsiderations: string;
  missingTeeth: string;
  impactedTeeth: string;
  unsuitableTeeth: string;
  profile: string;
  lipCompetence: string;
  facialVerticalPattern: string;
  facialAsymmetry: string;
  smileConcern: string;
  molarRight: string;
  molarLeft: string;
  canineRight: string;
  canineLeft: string;
  overjet: string;
  overbite: string;
  maxillaryCrowding: string;
  mandibularCrowding: string;
  upperMidline: string;
  lowerMidline: string;
  midlineDiscrepancy: string;
  curveOfSpee: string;
  crossbite: string;
  scissorBite: string;
  rotations: string;
  skeletalAp: string;
  skeletalVertical: string;
  maxillaryIncisors: string;
  mandibularIncisors: string;
  cephConcern: string;
};

const emptyCaseDetails: CaseDetailsState = {
  age: "",
  sex: "Not specified",
  patientStage: "Not specified",
  growthStatus: "Uncertain",
  chiefComplaint: "Improve my smile.",
  medicalHistory: "Not provided",
  dentalHistory: "Not provided",
  notes: "Not provided",
};

const emptyFindings: FindingsState = {
  oralHygiene: "",
  periodontalStatus: "",
  activeCaries: "",
  restorativeConsiderations: "",
  missingTeeth: "",
  impactedTeeth: "",
  unsuitableTeeth: "",
  profile: "",
  lipCompetence: "",
  facialVerticalPattern: "",
  facialAsymmetry: "",
  smileConcern: "",
  molarRight: "",
  molarLeft: "",
  canineRight: "",
  canineLeft: "",
  overjet: "",
  overbite: "",
  maxillaryCrowding: "",
  mandibularCrowding: "",
  upperMidline: "",
  lowerMidline: "",
  midlineDiscrepancy: "",
  curveOfSpee: "",
  crossbite: "",
  scissorBite: "",
  rotations: "",
  skeletalAp: "",
  skeletalVertical: "",
  maxillaryIncisors: "",
  mandibularIncisors: "",
  cephConcern: "",
};

type TreatmentOption = {
  title: string;
  aims: string;
  mechanics: string;
  checks: string;
};

const emptyTreatmentOptions = (): TreatmentOption[] =>
  Array.from({ length: 3 }, () => ({ title: "", aims: "", mechanics: "", checks: "" }));

const emptyPlan: TreatmentPlanState = {
  problemList: "",
  goals: "",
  primaryStrategy: "",
  alternativeStrategy: "",
  options: emptyTreatmentOptions(),
  selectedOption: null,
  informationGaps: "",
};

type DiagnosisState = {
  summary: string;
  interpretation: string;
  informationGaps: string;
  approved: boolean;
};

const emptyDiagnosis: DiagnosisState = {
  summary: "",
  interpretation: "",
  informationGaps: "",
  approved: false,
};

type DiagnosisReviewResult = {
  case_summary?: string;
  clinical_assessment?: string;
  missing_information?: string[];
};

type StoredRecordsState = {
  details?: Partial<CaseDetailsState>;
  findings?: Partial<FindingsState>;
  diagnosis?: Partial<DiagnosisState>;
};

const viewerViews = ["Front", "Right", "Left", "Upper", "Lower"];

const outOfScopeGroups = [
  {
    label: "Unsupported case types",
    options: [
      "Mixed or primary dentition treatment",
      "Class III correction",
      "Orthognathic surgery",
      "Severe skeletal Class II correction",
      "Major facial asymmetry",
      "Asymmetric extraction strategy",
      "Impacted tooth requiring surgical exposure / traction",
      "Ankylosed tooth",
      "Complex missing-tooth / prosthetic space management",
      "Severe periodontal attachment / bone loss",
      "Craniofacial syndrome or cleft-related treatment",
      "Significant transverse correction requiring expansion",
      "Severe anterior / posterior crossbite as primary problem",
      "Complex retreatment with major root / periodontal limitations",
      "TMD treatment planning",
      "Main treatment depends on CBCT / root-bone simulation",
      "Severe skeletal deep bite / short-face correction",
      "Growth modification as primary deep-bite treatment",
      "Severe skeletal long-face open bite",
      "Open bite requiring posterior molar intrusion with TADs",
      "Open bite with unresolved etiologic habit",
      "Complex unilateral / asymmetric open bite",
    ],
  },
  {
    label: "Unsupported mechanics",
    options: [
      "TAD / miniscrew-supported mechanics",
      "Molar intrusion with skeletal anchorage",
      "Functional appliance treatment",
      "Headgear",
      "Palatal expansion / MARPE / surgically assisted expansion",
      "Orthognathic-surgical mechanics",
      "Impacted-tooth traction",
      "Lingual appliance treatment",
      "Clear-aligner treatment",
      "Fully customized printed bracket system",
      "Robotic / custom wire manufacturing",
      "Manufacturer-specific prescription / workflow",
    ],
  },
] as const;

function ReadinessCard({
  planningReady,
  missingCount,
  scopeIssue,
}: {
  planningReady: boolean;
  missingCount: number;
  scopeIssue: string;
}) {
  if (scopeIssue) {
    return (
      <div className="readiness-card is-blocked" role="status">
        <div>
          <span>Records status</span>
          <strong>Out of V1 scope</strong>
        </div>
        <p>{scopeIssue} is outside the frozen BracketMotion V1 boundary. Treatment-plan generation is blocked.</p>
      </div>
    );
  }

  return (
    <div className={`readiness-card${planningReady ? " is-ready" : ""}`} role="status">
      <div>
        <span>Records status</span>
        <strong>{planningReady ? "Ready for diagnosis" : "Draft case"}</strong>
      </div>
      <p>
        {planningReady
          ? "Five intraoral photographs added. Continue to Diagnosis."
          : `${missingCount} of 5 intraoral photographs missing. Add the photographs to continue.`}
      </p>
    </div>
  );
}

function CasePhotoSlot({
  slot,
  photo,
  onPhotoChange,
}: {
  slot: { key: PhotoKey; title: string };
  photo?: CasePhoto;
  onPhotoChange: (key: PhotoKey, file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="case-photo-slot">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        aria-label={slot.title}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onPhotoChange(slot.key, file);
          event.currentTarget.value = "";
        }}
      />
      <button
        className="case-photo-slot__preview"
        type="button"
        aria-label={(photo ? "Replace " : "Add ") + slot.title}
        onClick={() => inputRef.current?.click()}
      >
        {photo ? (
          <img src={photo.previewUrl} alt={slot.title + " local preview"} />
        ) : (
          <span>Add image</span>
        )}
      </button>
      <div className="case-photo-slot__caption">
        <strong>{slot.title}</strong>
        <span>{photo ? "In this tab" : "Not added"}</span>
      </div>
      {photo && (
        <button
          className="case-photo-slot__remove"
          type="button"
          onClick={() => onPhotoChange(slot.key, null)}
          aria-label={"Remove " + slot.title}
        >
          Remove
        </button>
      )}
    </div>
  );
}

function CaseRecordsView({
  caseLabel,
  onCaseLabel,
  caseDetails,
  onCaseDetail,
  photos,
  onPhotoChange,
  photoError,
  planningReady,
  missingCount,
  scopeIssue,
  onOpenFindings,
}: {
  caseLabel: string;
  onCaseLabel: (value: string) => void;
  caseDetails: CaseDetailsState;
  onCaseDetail: (field: keyof CaseDetailsState, value: string) => void;
  photos: Partial<Record<PhotoKey, CasePhoto>>;
  onPhotoChange: (key: PhotoKey, file: File | null) => void;
  photoError: string;
  planningReady: boolean;
  missingCount: number;
  scopeIssue: string;
  onOpenFindings: () => void;
}) {
  const intraoralCount = intraoralPhotoSlots.filter((slot) => Boolean(photos[slot.key])).length;

  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div>
          <h1>Clinical Records</h1>
        </div>
        <button className="app-primary-action case-page-primary" type="button" disabled={!planningReady} onClick={onOpenFindings}>
          Continue to Diagnosis
        </button>
      </div>

      <ReadinessCard
        planningReady={planningReady}
        missingCount={missingCount}
        scopeIssue={scopeIssue}
      />

      <div className="case-content-grid">
      <section className="case-section" aria-labelledby="case-details-title">
        <div className="case-section__heading">
          <div><h2 id="case-details-title">Patient and clinical history</h2></div>
        </div>
        <div className="case-form-grid">
          <label>
            <span>Patient label / case ID</span>
            <input value={caseLabel} onChange={(event) => onCaseLabel(event.target.value)} placeholder="Patient name or case ID" type="text" />
          </label>
          <div className="number-field">
            <label htmlFor="case-record-age">Age at records</label>
            <NumberInput
              id="case-record-age"
              label="age at records"
              value={caseDetails.age}
              min="12"
              onChange={(value) => onCaseDetail("age", value)}
            />
          </div>
          <label>
            <span>Sex (optional)</span>
            <UiSelect
              value={caseDetails.sex}
              onChange={(value) => onCaseDetail("sex", value)}
              options={["Not specified", "Female", "Male"]}
              ariaLabel="Sex (optional)"
            />
          </label>
          <label>
            <span>Patient stage</span>
            <UiSelect
              value={caseDetails.patientStage}
              onChange={(value) => onCaseDetail("patientStage", value)}
              options={["Not specified", "Adult", "Adolescent"]}
              ariaLabel="Patient stage"
            />
          </label>
          <label>
            <span>Growth status</span>
            <UiSelect
              value={caseDetails.growthStatus}
              onChange={(value) => onCaseDetail("growthStatus", value)}
              options={["Adult", "Prepubertal", "Pubertal", "Postpubertal", "Uncertain"]}
              ariaLabel="Growth status"
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Chief complaint / treatment goal</span>
            <input
              value={caseDetails.chiefComplaint}
              type="text"
              onChange={(event) => onCaseDetail("chiefComplaint", event.target.value)}
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Medical history</span>
            <input
              value={caseDetails.medicalHistory}
              type="text"
              onChange={(event) => onCaseDetail("medicalHistory", event.target.value)}
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Dental / orthodontic history</span>
            <input
              value={caseDetails.dentalHistory}
              type="text"
              onChange={(event) => onCaseDetail("dentalHistory", event.target.value)}
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Allergies / habits / clinical notes</span>
            <input
              value={caseDetails.notes}
              type="text"
              onChange={(event) => onCaseDetail("notes", event.target.value)}
            />
          </label>
        </div>
      </section>
      <section className="case-section" aria-labelledby="intraoral-photos-title">
        <div className="case-section__heading">
          <div><h2 id="intraoral-photos-title">Five intraoral photographs</h2></div>
          <span className="case-photo-count">{intraoralCount} of 5 added</span>
        </div>
        <div className="case-photo-grid">
          {intraoralPhotoSlots.map((slot) => (
            <CasePhotoSlot
              key={slot.key}
              slot={slot}
              photo={photos[slot.key]}
              onPhotoChange={onPhotoChange}
            />
          ))}
        </div>
        <p className="case-photo-note">JPG, PNG or WebP, up to 12 MB each. Photos stay in this tab and are sent for AI analysis only when you generate a draft.</p>
        {photoError && <p className="case-photo-error" role="alert">{photoError}</p>}
      </section>
      <section className="case-section" aria-labelledby="facial-photos-title">
        <div className="case-section__heading">
          <div><h2 id="facial-photos-title">Facial photographs</h2></div>
        </div>
        <div className="case-photo-grid case-photo-grid--additional">
          {facialPhotoSlots.map((slot) => (
            <CasePhotoSlot key={slot.key} slot={slot} photo={photos[slot.key]} onPhotoChange={onPhotoChange} />
          ))}
        </div>
      </section>
      <section className="case-section" aria-labelledby="radiographs-title">
        <div className="case-section__heading">
          <div><h2 id="radiographs-title">Radiographic records</h2></div>
        </div>
        <div className="case-photo-grid case-photo-grid--radiographs">
          {radiographSlots.map((slot) => (
            <CasePhotoSlot key={slot.key} slot={slot} photo={photos[slot.key]} onPhotoChange={onPhotoChange} />
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}


function FindingsView({
  scopeIssue,
  onScopeIssue,
  findings,
  onFindingChange,
  diagnosis,
  onDiagnosisChange,
  onApproveDiagnosis,
  onGenerateDiagnosis,
  onSignIn,
  onOpenPlan,
  sessionActive,
  diagnosisLoading,
  diagnosisError,
  planningReady,
  missingCount,
  cephPhoto,
  cephTrace,
  onCephTraceChange,
  onApproveCeph,
  onOpenRecords,
}: {
  scopeIssue: string;
  onScopeIssue: (value: string) => void;
  findings: FindingsState;
  onFindingChange: (field: keyof FindingsState, value: string) => void;
  diagnosis: DiagnosisState;
  onDiagnosisChange: (field: "summary" | "interpretation" | "informationGaps", value: string) => void;
  onApproveDiagnosis: () => void;
  onGenerateDiagnosis: () => void;
  onSignIn: () => void;
  onOpenPlan: () => void;
  sessionActive: boolean;
  diagnosisLoading: boolean;
  diagnosisError: string;
  planningReady: boolean;
  missingCount: number;
  cephPhoto?: CasePhoto;
  cephTrace: CephTrace | null;
  onCephTraceChange: (next: CephTrace | null) => void;
  onApproveCeph: (next: CephTrace) => void;
  onOpenRecords: () => void;
}) {
  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div>
          <h1>Diagnosis</h1>
        </div>
        <button
          className="app-primary-action case-page-primary"
          type="button"
          disabled={!diagnosis.approved}
          onClick={onOpenPlan}
        >
          Continue to Treatment Plans
        </button>
      </div>

      <ReadinessCard
        planningReady={planningReady}
        missingCount={missingCount}
        scopeIssue={scopeIssue}
      />

      <section className="ai-review-card" aria-label="Diagnosis draft">
        <div className="ai-review-gate">
          <div>
            <strong>Diagnosis draft</strong>
            <p>Reviews the five intraoral photographs and available clinical findings.</p>
          </div>
          <button
            className="ai-review-button"
            type="button"
            disabled={diagnosisLoading || (sessionActive && !planningReady)}
            onClick={sessionActive ? onGenerateDiagnosis : onSignIn}
          >
            {!sessionActive ? "Sign in to prepare" : diagnosisLoading ? "Reviewing photographs…" : "Prepare diagnosis"}
          </button>
        </div>
        {diagnosisError && <div className="ai-review-error" role="alert">{diagnosisError}</div>}

      </section>

      <div className="case-content-grid">
        <div className="case-content-column">
      <section className="case-section" aria-labelledby="diagnosis-draft-title">
        <div className="case-section__heading">
          <div>
            <h2 id="diagnosis-draft-title">Clinical diagnosis</h2>
          </div>
          <span className={diagnosis.approved ? "ai-review-status is-ready" : "ai-review-status"}>
            {diagnosis.approved ? "Approved" : "Draft"}
          </span>
        </div>

        <div className="finding-grid">
          <label className="finding-grid__wide">
            <span>Diagnostic summary</span>
            <textarea
              className="plan-textarea"
              rows={4}
              value={diagnosis.summary}
              onChange={(event) => onDiagnosisChange("summary", event.target.value)}
              aria-label="Diagnostic summary"
            />
          </label>
          <label className="finding-grid__wide">
            <span>Clinical interpretation</span>
            <textarea
              className="plan-textarea"
              rows={4}
              value={diagnosis.interpretation}
              onChange={(event) => onDiagnosisChange("interpretation", event.target.value)}
              aria-label="Clinical interpretation"
            />
          </label>
          <label className="finding-grid__wide">
            <span>Information to confirm</span>
            <textarea
              className="plan-textarea"
              rows={3}
              value={diagnosis.informationGaps}
              onChange={(event) => onDiagnosisChange("informationGaps", event.target.value)}
              aria-label="Information to confirm"
            />
          </label>
        </div>

        <div className={`plan-approval-panel${diagnosis.approved ? " is-approved" : ""}`}>
          <div>
            <strong>{diagnosis.approved ? "Diagnosis approved" : "Clinician confirmation"}</strong>
          </div>
          <button
            className="app-primary-action plan-approve-button"
            type="button"
            disabled={diagnosis.approved || !planningReady || !diagnosis.summary.trim() || !diagnosis.interpretation.trim()}
            onClick={onApproveDiagnosis}
          >
            {diagnosis.approved ? "Approved" : "Approve diagnosis"}
          </button>
        </div>
      </section>
      <section className="case-section" aria-labelledby="oral-title">
        <div className="case-section__heading">
          <div>
            <h2 id="oral-title">Oral + periodontal</h2>
          </div>
        </div>

        <div className="finding-grid">
          <label>
            <span>Oral hygiene</span>
            <UiSelect value={findings.oralHygiene} onChange={(value) => onFindingChange("oralHygiene", value)} options={["Not assessed", "Acceptable","Concern"]} ariaLabel="Oral hygiene" />
          </label>
          <label>
            <span>Gingival / periodontal status</span>
            <UiSelect value={findings.periodontalStatus} onChange={(value) => onFindingChange("periodontalStatus", value)} options={["Not assessed", "Healthy","Concern"]} ariaLabel="Gingival / periodontal status" />
          </label>
          <label>
            <span>Active caries / untreated pathology</span>
            <UiSelect value={findings.activeCaries} onChange={(value) => onFindingChange("activeCaries", value)} options={["Not assessed", "No","Yes"]} ariaLabel="Active caries / untreated pathology" />
          </label>
          <label>
            <span>Restorative / prosthetic considerations</span>
            <UiSelect value={findings.restorativeConsiderations} onChange={(value) => onFindingChange("restorativeConsiderations", value)} options={["Not assessed", "None","Present"]} ariaLabel="Restorative / prosthetic considerations" />
          </label>
          <label>
            <span>Missing permanent teeth</span>
            <input value={findings.missingTeeth} onChange={(event) => onFindingChange("missingTeeth", event.target.value)} type="text" />
          </label>
          <label>
            <span>Impacted / unerupted teeth</span>
            <input value={findings.impactedTeeth} onChange={(event) => onFindingChange("impactedTeeth", event.target.value)} type="text" />
          </label>
          <label className="finding-grid__wide">
            <span>Teeth unsuitable for routine orthodontic movement</span>
            <input value={findings.unsuitableTeeth} onChange={(event) => onFindingChange("unsuitableTeeth", event.target.value)} type="text" />
          </label>
        </div>
      </section>


        </div>
        <div className="case-content-column">
      <section className="case-section" aria-labelledby="occlusion-title">
        <div className="case-section__heading">
          <div>
            <h2 id="occlusion-title">Occlusion</h2>
          </div>
        </div>

        <div className="finding-grid">
          <label>
            <span>Molar relationship — right</span>
            <UiSelect value={findings.molarRight} onChange={(value) => onFindingChange("molarRight", value)} options={["Not assessed", "Class I","Class II","Class III"]} ariaLabel="Molar relationship — right" />
          </label>
          <label>
            <span>Molar relationship — left</span>
            <UiSelect value={findings.molarLeft} onChange={(value) => onFindingChange("molarLeft", value)} options={["Not assessed", "Class I","Class II","Class III"]} ariaLabel="Molar relationship — left" />
          </label>
          <label>
            <span>Canine relationship — right</span>
            <UiSelect value={findings.canineRight} onChange={(value) => onFindingChange("canineRight", value)} options={["Not assessed", "Class I","Class II","Class III"]} ariaLabel="Canine relationship — right" />
          </label>
          <label>
            <span>Canine relationship — left</span>
            <UiSelect value={findings.canineLeft} onChange={(value) => onFindingChange("canineLeft", value)} options={["Not assessed", "Class I","Class II","Class III"]} ariaLabel="Canine relationship — left" />
          </label>
          <label>
            <span>Overjet</span>
            <div className="field-with-unit"><NumberInput id="finding-overjet" label="overjet" value={findings.overjet} onChange={(value) => onFindingChange("overjet", value)} /><small>mm</small></div>
          </label>
          <label>
            <span>Overbite</span>
            <div className="field-with-unit"><NumberInput id="finding-overbite" label="overbite" value={findings.overbite} onChange={(value) => onFindingChange("overbite", value)} /><small>%</small></div>
          </label>
          <label>
            <span>Maxillary crowding / spacing</span>
            <div className="field-with-unit"><NumberInput id="finding-maxillaryCrowding" label="maxillaryCrowding" value={findings.maxillaryCrowding} onChange={(value) => onFindingChange("maxillaryCrowding", value)} /><small>mm</small></div>
          </label>
          <label>
            <span>Mandibular crowding / spacing</span>
            <div className="field-with-unit"><NumberInput id="finding-mandibularCrowding" label="mandibularCrowding" value={findings.mandibularCrowding} onChange={(value) => onFindingChange("mandibularCrowding", value)} /><small>mm</small></div>
          </label>
          <label>
            <span>Upper dental midline to face</span>
            <input value={findings.upperMidline} onChange={(event) => onFindingChange("upperMidline", event.target.value)} type="text" />
          </label>
          <label>
            <span>Lower dental midline to face</span>
            <input value={findings.lowerMidline} onChange={(event) => onFindingChange("lowerMidline", event.target.value)} type="text" />
          </label>
          <label>
            <span>Upper-to-lower midline discrepancy</span>
            <div className="field-with-unit"><NumberInput id="finding-midlineDiscrepancy" label="midlineDiscrepancy" value={findings.midlineDiscrepancy} onChange={(value) => onFindingChange("midlineDiscrepancy", value)} /><small>mm</small></div>
          </label>
          <label>
            <span>Curve of Spee</span>
            <UiSelect value={findings.curveOfSpee} onChange={(value) => onFindingChange("curveOfSpee", value)} options={["Not assessed", "Flat","Mild","Moderate","Deep"]} ariaLabel="Curve of Spee" />
          </label>
          <label>
            <span>Anterior / posterior crossbite</span>
            <input value={findings.crossbite} onChange={(event) => onFindingChange("crossbite", event.target.value)} type="text" />
          </label>
          <label>
            <span>Scissor bite</span>
            <input value={findings.scissorBite} onChange={(event) => onFindingChange("scissorBite", event.target.value)} type="text" />
          </label>
          <label className="finding-grid__wide">
            <span>Important rotations / displacements</span>
            <input value={findings.rotations} onChange={(event) => onFindingChange("rotations", event.target.value)} type="text" />
          </label>
        </div>
      </section>
      <section className="case-section" aria-labelledby="facial-title">
        <div className="case-section__heading">
          <div>
            <h2 id="facial-title">Facial + soft tissue</h2>
          </div>
        </div>

        <div className="finding-grid">
          <label>
            <span>Profile</span>
            <UiSelect value={findings.profile} onChange={(value) => onFindingChange("profile", value)} options={["Not assessed", "Convex","Straight","Concave"]} ariaLabel="Profile" />
          </label>
          <label>
            <span>Lip competence</span>
            <UiSelect value={findings.lipCompetence} onChange={(value) => onFindingChange("lipCompetence", value)} options={["Not assessed", "Competent","Incompetent"]} ariaLabel="Lip competence" />
          </label>
          <label>
            <span>Facial vertical pattern</span>
            <UiSelect value={findings.facialVerticalPattern} onChange={(value) => onFindingChange("facialVerticalPattern", value)} options={["Not assessed", "Low","Average","High"]} ariaLabel="Facial vertical pattern" />
          </label>
          <label>
            <span>Facial asymmetry</span>
            <UiSelect value={findings.facialAsymmetry} onChange={(value) => onFindingChange("facialAsymmetry", value)} options={["Not assessed", "None","Present"]} ariaLabel="Facial asymmetry" />
          </label>
          <label className="finding-grid__wide">
            <span>Smile / incisor display concern</span>
            <input value={findings.smileConcern} onChange={(event) => onFindingChange("smileConcern", event.target.value)} type="text" />
          </label>
        </div>
      </section>
      <section className="case-section" aria-labelledby="scope-screen-title">
        <div className="case-section__heading">
          <div>
            <h2 id="scope-screen-title">V1 scope screen</h2>
          </div>
        </div>

        <label className="scope-select">
          <span>Primary unsupported treatment need</span>
          <UiSelect
            value={scopeIssue}
            onChange={onScopeIssue}
            ariaLabel="Primary unsupported treatment need"
            options={[
              { value: "", label: "None — within current V1 scope" },
              ...outOfScopeGroups.flatMap((group) =>
                group.options.map((option) => ({
                  value: option,
                  label: option,
                  group: group.label,
                })),
              ),
            ]}
          />
        </label>

        {scopeIssue && (
          <div className="scope-warning" role="alert">
            <strong>Planning blocked</strong>
            <p>{scopeIssue} is not supported in BracketMotion V1. The clinician can keep the case as a record, but treatment-plan generation stays unavailable.</p>
          </div>
        )}
      </section>
        </div>
      <section className="case-section case-ceph-section" aria-labelledby="ceph-title">
        <div className="case-section__heading">
          <div><h2 id="ceph-title">Cephalometric analysis</h2></div>
        </div>
        <Suspense fallback={<p className="ceph-tracing__progress">Opening tracing workspace…</p>}>
          <CephAnalysis
            photo={cephPhoto}
            trace={cephTrace}
            onTraceChange={onCephTraceChange}
            onApprove={onApproveCeph}
            onOpenRecords={onOpenRecords}
          >
            <div className="ceph-tracing__clinical-fields">
              <h3>Clinical findings</h3>
              <div className="finding-grid">
                <label>
                  <span>Skeletal AP pattern</span>
                  <UiSelect value={findings.skeletalAp} onChange={(value) => onFindingChange("skeletalAp", value)} options={["Not assessed", "Class I","Class II","Class III"]} ariaLabel="Skeletal AP pattern" />
                </label>
                <label>
                  <span>Vertical skeletal pattern</span>
                  <UiSelect value={findings.skeletalVertical} onChange={(value) => onFindingChange("skeletalVertical", value)} options={["Not assessed", "Low","Average","High"]} ariaLabel="Vertical skeletal pattern" />
                </label>
                <label>
                  <span>Maxillary incisors</span>
                  <UiSelect value={findings.maxillaryIncisors} onChange={(value) => onFindingChange("maxillaryIncisors", value)} options={["Not assessed", "Retroclined","Normal","Proclined"]} ariaLabel="Maxillary incisors" />
                </label>
                <label>
                  <span>Mandibular incisors</span>
                  <UiSelect value={findings.mandibularIncisors} onChange={(value) => onFindingChange("mandibularIncisors", value)} options={["Not assessed", "Retroclined","Normal","Proclined"]} ariaLabel="Mandibular incisors" />
                </label>
                <label className="finding-grid__wide">
                  <span>Important cephalometric concern</span>
                  <input value={findings.cephConcern} onChange={(event) => onFindingChange("cephConcern", event.target.value)} type="text" />
                </label>
              </div>
            </div>
          </CephAnalysis>
        </Suspense>
      </section>
      </div>
    </div>
  );
}


type TreatmentPlanState = {
  problemList: string;
  goals: string;
  primaryStrategy: string;
  alternativeStrategy: string;
  options: TreatmentOption[];
  selectedOption: number | null;
  informationGaps: string;
};

type AiReviewMode = "diagnosis_draft" | "treatment_suggestions" | "stage_review";

function TreatmentPlanView({
  planningReady,
  scopeIssue,
  plan,
  planApproved,
  sessionActive,
  suggestionsLoading,
  suggestionsError,
  onGenerate,
  onSignIn,
  onPlanChange,
  onOptionChange,
  onSelectOption,
  onApprove,
}: {
  planningReady: boolean;
  scopeIssue: string;
  plan: TreatmentPlanState;
  planApproved: boolean;
  sessionActive: boolean;
  suggestionsLoading: boolean;
  suggestionsError: string;
  onGenerate: () => void;
  onSignIn: () => void;
  onPlanChange: (field: "problemList" | "goals" | "informationGaps", value: string) => void;
  onOptionChange: (index: number, field: keyof TreatmentOption, value: string) => void;
  onSelectOption: (index: number) => void;
  onApprove: () => void;
}) {
  const selected = plan.selectedOption === null ? null : plan.options[plan.selectedOption];
  const [manualOptions, setManualOptions] = useState(false);
  const hasDraftOptions = plan.options.some((option) =>
    Object.values(option).some((value) => value.trim()),
  );
  const canApprove = Boolean(
    planningReady && plan.problemList.trim() && plan.goals.trim() &&
    selected && Object.values(selected).every((value) => value.trim()),
  );

  if (!planningReady) {
    return (
      <div className="case-workflow-page">
        <div className="case-workflow-page__header">
          <div>
            <span className="case-page-kicker">Treatment Plans</span>
            <h1>Planning unavailable</h1>
          </div>
        </div>
        <div className="plan-blocked-card" role="status">
          <strong>{scopeIssue ? "Out of V1 scope" : "Case not planning-ready"}</strong>
          <p>
            {scopeIssue
              ? scopeIssue + " is outside the frozen BracketMotion V1 boundary."
              : "Complete the required clinical records in Clinical Records and Diagnosis."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div><h1>Treatment Plans</h1></div>
      </div>

      <section className="ai-review-card" aria-labelledby="ai-treatment-suggestions">
        <div className="ai-review-card__header">
          <div>
            <span>Clinical planning</span>
            <h2 id="ai-treatment-suggestions">Up to three editable treatment suggestions</h2>
          </div>
          <span className={"ai-review-status" + (planApproved ? " is-ready" : "")}>
            {planApproved ? "Approved" : "Draft"}
          </span>
        </div>
        <div className="ai-review-gate">
          <div>
            <strong>{suggestionsLoading ? "Generating suggestions…" : "Prepare treatment options"}</strong>
            <p>Uses the approved diagnosis, clinical records and verified measurements.</p>
          </div>
          <button
            type="button"
            className="ai-review-button"
            disabled={suggestionsLoading}
            onClick={sessionActive ? onGenerate : onSignIn}
          >
            {!sessionActive ? "Sign in to generate" : suggestionsLoading ? "Generating…" : "Generate AI suggestions"}
          </button>
        </div>
        {suggestionsError && <div className="ai-review-error" role="alert">{suggestionsError}</div>}
      </section>

      <section className="case-section" aria-labelledby="problem-list-title">
        <div className="case-section__heading"><div><h2 id="problem-list-title">Problem list and treatment goals</h2></div></div>
        <div className="plan-objectives-grid">
          <label>
            <span>Clinical problem list</span>
            <textarea
              className="plan-textarea"
              aria-label="Clinical problem list"
              rows={3}
              value={plan.problemList}
              onChange={(event) => onPlanChange("problemList", event.target.value)}
            />
          </label>
          <label>
            <span>Treatment objectives</span>
            <textarea
              className="plan-textarea"
              aria-label="Treatment objectives"
              rows={3}
              value={plan.goals}
              onChange={(event) => onPlanChange("goals", event.target.value)}
            />
          </label>
        </div>
      </section>

      {!hasDraftOptions && !manualOptions && (
        <div className="case-section">
          <p>Generate treatment options from the approved diagnosis, or enter your own.</p>
          <button className="app-quiet-button" type="button" onClick={() => setManualOptions(true)}>
            Enter manually
          </button>
        </div>
      )}

      {(hasDraftOptions || manualOptions) && (
      <div className="plan-strategy-grid" aria-label="Treatment suggestion options">
        {plan.options.map((option, index) => {
          if (!manualOptions && !Object.values(option).some((value) => value.trim())) return null;
          const isSelected = plan.selectedOption === index;
          const label = String.fromCharCode(65 + index);
          return (
            <section
              className={"case-section plan-strategy-card" + (isSelected ? " is-primary" : "")}
              aria-label={"Plan " + label}
              key={index}
            >
              <div className="case-section__heading">
                <div><h2>{"Plan " + label}</h2></div>
                <button
                  className="app-quiet-button"
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectOption(index)}
                >
                  {isSelected ? "Selected" : "Select"}
                </button>
              </div>

              <label className="plan-option-field">
                <span>Approach</span>
                <input
                  type="text"
                  value={option.title}
                  aria-label={"Plan " + label + " approach"}
                  placeholder="Enter approach"
                  onChange={(event) => onOptionChange(index, "title", event.target.value)}
                />
              </label>
              <label className="plan-option-field">
                <span>Primary aims</span>
                <textarea
                  className="plan-textarea"
                  rows={3}
                  value={option.aims}
                  aria-label={"Plan " + label + " aims"}
                  onChange={(event) => onOptionChange(index, "aims", event.target.value)}
                />
              </label>
              <label className="plan-option-field">
                <span>Proposed mechanics</span>
                <textarea
                  className="plan-textarea"
                  rows={4}
                  value={option.mechanics}
                  aria-label={"Plan " + label + " mechanics"}
                  onChange={(event) => onOptionChange(index, "mechanics", event.target.value)}
                />
              </label>
              <label className="plan-option-field">
                <span>Considerations and checks</span>
                <textarea
                  className="plan-textarea"
                  rows={3}
                  value={option.checks}
                  aria-label={"Plan " + label + " considerations"}
                  onChange={(event) => onOptionChange(index, "checks", event.target.value)}
                />
              </label>
            </section>
          );
        })}
      </div>
      )}

      {hasDraftOptions && !manualOptions && plan.options.some((option) => !option.title.trim()) && (
        <button type="button" className="app-quiet-button" onClick={() => setManualOptions(true)}>
          Add an alternative manually
        </button>
      )}

      {plan.informationGaps && (
        <section className="case-section" aria-labelledby="treatment-evidence-title">
          <div className="case-section__heading"><div><h2 id="treatment-evidence-title">Information to confirm</h2></div></div>
          <textarea
            className="plan-textarea"
            rows={3}
            value={plan.informationGaps}
            aria-label="Treatment information to confirm"
            onChange={(event) => onPlanChange("informationGaps", event.target.value)}
          />
        </section>
      )}

      <section className={"plan-approval-panel" + (planApproved ? " is-approved" : "")}>
        <div>
          <span>Clinical Plan Approval</span>
          <strong>{planApproved
            ? "Plan " + String.fromCharCode(65 + (plan.selectedOption ?? 0)) + " approved"
            : plan.selectedOption === null
              ? "Select a treatment option"
              : "Review Plan " + String.fromCharCode(65 + plan.selectedOption) + " before approval"}
          </strong>
          <p>
            {planApproved
              ? "The selected mechanics strategy is ready for the 3D workspace."
              : "The clinician can edit all options. Only the selected completed plan can be approved."}
          </p>
        </div>
        <button
          className="app-primary-action plan-approve-button"
          type="button"
          disabled={planApproved || !canApprove}
          onClick={onApprove}
        >
          {planApproved ? "Approved" : "Approve selected plan"}
        </button>
      </section>
    </div>
  );
}

function AuthDialog({
  open,
  session,
  onClose,
}: {
  open: boolean;
  session: BracketMotionSession | null;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setPassword("");
    setShowPassword(false);
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".auth-dialog button:not(:disabled), .auth-dialog input:not(:disabled)",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onDialogKeyDown);
    return () => window.removeEventListener("keydown", onDialogKeyDown);
  }, [open, mode]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        onClose();
        return;
      }

      if (!fullName.trim()) {
        setMessage("Enter your name to create the account.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: new URL("/app", window.location.origin).toString(),
          data: {
            full_name: fullName.trim(),
            default_level: "undergraduate",
            favorite_subjects: ["operative", "endodontics", "orthodontics"],
            preferred_output_styles: [
              "bullet_points",
              "osce_checklists",
              "short_notes",
            ],
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        onClose();
      } else {
        setMessage("Account created. Check your email to confirm it, then sign in.");
        setMode("login");
      }
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message.toLowerCase() : "";
      setMessage(
        raw.includes("invalid login credentials")
          ? "These details do not match a DentAIstudy account."
          : raw.includes("user already registered")
            ? "An account already exists with this email. Sign in instead."
            : "Authentication failed. Check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("/app", window.location.origin).toString() },
      });
      if (error) throw error;
    } catch {
      setMessage("Could not start Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage("Enter your email first to receive a reset link.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://dentaistudy.com/settings.html",
      });
      if (error) throw error;
      setMessage("Check your inbox for the password reset link. Passwords are shared with DentAIstudy during preview.");
    } catch {
      setMessage("Could not send the password reset email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onClose();
    } catch {
      setMessage("Could not sign out. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="auth-dialog__header">
          <button type="button" autoFocus aria-label="Close account dialog" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div className="auth-dialog__logo" aria-hidden="true" />
          <h2 id="auth-dialog-title">
            {session ? "Your account" : mode === "login" ? "Log in to BracketMotion" : "Create your account"}
          </h2>
          <p>
            {session ? "Signed in to BracketMotion" : "Use your DentAIstudy sign-in during preview."}
          </p>
        </div>

        {session ? (
          <div className="auth-dialog__account">
            <div>
              <span>Signed in as</span>
              <strong>{session.user.email || "Account"}</strong>
            </div>
            <p>Your BracketMotion cases remain private to your signed-in account.</p>
            {message && <div className="auth-dialog__message is-error">{message}</div>}
            <button
              className="app-primary-action"
              type="button"
              disabled={loading}
              onClick={signOut}
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <form className="auth-dialog__form" onSubmit={submit}>
            <button
              className="auth-dialog__google"
              type="button"
              aria-label="Continue with Google"
              disabled={loading}
              onClick={() => void signInWithGoogle()}
            >
              <img src="/icons/google-icon.svg" alt="" />
            </button>
            <div className="auth-dialog__divider"><span>Or continue with email</span></div>

            {mode === "signup" && (
              <label>
                <span>Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  type="text"
                />
              </label>
            )}

            <label>
              <span>Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </label>

            <div className="auth-dialog__password-field">
              <label htmlFor="bracketmotion-auth-password">Password</label>
              <span className="auth-dialog__password">
                <input
                  id="bracketmotion-auth-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.84 2.84M9.88 5.08A10.89 10.89 0 0 1 12 5c5 0 9 5 9 7a11.74 11.74 0 0 1-3.23 3.94M6.61 6.61C4.42 8.04 3 10.14 3 12c0 2 4 7 9 7a10.7 10.7 0 0 0 4.37-.93" />
                    </svg>
                  )}
                </button>
              </span>
            </div>

            {mode === "login" && (
              <button
                className="auth-dialog__forgot"
                type="button"
                onClick={() => void resetPassword()}
                disabled={loading}
              >
                Forgot your password?
              </button>
            )}

            <button className="app-primary-action" type="submit" disabled={loading}>
              {loading
                ? mode === "login" ? "Logging in…" : "Creating account…"
                : mode === "login" ? "Log in" : "Create account"}
            </button>
            {message && <div className="auth-dialog__message" role="status">{message}</div>}
            {mode === "signup" && (
              <p className="auth-dialog__terms">
                By creating an account, you agree to our{" "}
                <a href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </p>
            )}
            <p className="auth-dialog__switch">
              {mode === "login" ? "Don’t have an account yet?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => {
                setMode((current) => current === "login" ? "signup" : "login");
                setMessage("");
                setShowPassword(false);
              }}>
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

function SetupWorkspace({
  onSetupApprovalChange,
  onPersistenceChange,
  onStageStateChange,
  clinicalSection,
  caseId,
  userId,
  initialScanState,
  sessionActive,
  stageAiReview,
  stageAiReviewLoading,
  stageAiReviewError,
  onRunStageAiReview,
  onSignIn,
}: {
  onSetupApprovalChange: (approved: boolean) => void;
  onPersistenceChange: (state: ScanPersistenceState) => void;
  onStageStateChange: (state: StagePersistenceState) => void;
  clinicalSection: "Setup" | "Stages";
  caseId: string | null;
  userId: string | null;
  initialScanState: ScanPersistenceState | null;
  sessionActive: boolean;
  stageAiReview: StageAiReviewResult | null;
  stageAiReviewLoading: boolean;
  stageAiReviewError: string;
  onRunStageAiReview: () => void;
  onSignIn: () => void;
}) {
  const viewerRef = useRef<ClinicalViewerHandle | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"patient" | "demo">("patient");
  const isStages = clinicalSection === "Stages";
  const showPatientSurface = isStages || workspaceMode === "patient";

  return (
    <div className="setup-workspace">
      {!isStages && (
        <div className="app-viewer-toolbar">
          <div className="app-viewer-toolbar__group" aria-label="Setup workspace">
            <button
              className={`app-tool-button${workspaceMode === "patient" ? " is-selected" : ""}`}
              type="button"
              onClick={() => setWorkspaceMode("patient")}
            >
              Patient scans
            </button>
            <button
              className={`app-tool-button${workspaceMode === "demo" ? " is-selected" : ""}`}
              type="button"
              onClick={() => setWorkspaceMode("demo")}
            >
              Demo reference
            </button>
          </div>

          {workspaceMode === "demo" && (
            <div className="app-viewer-toolbar__group app-viewer-toolbar__views" aria-label="Canonical views">
              {viewerViews.map((view) => (
                <button
                  className="app-view-button"
                  type="button"
                  key={view}
                  onClick={() => viewerRef.current?.setView(view as "Front" | "Right" | "Left" | "Upper" | "Lower")}
                >
                  {view}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showPatientSurface ? (
        <div className="setup-workspace__surface is-visible">
          <Suspense
            fallback={
              <div className="clinical-viewer__message" role="status">
                <span className="clinical-loader" aria-hidden="true" />
                <strong>Preparing patient workspace</strong>
              </div>
            }
          >
            <ScanWorkflow
              onSetupApprovalChange={onSetupApprovalChange}
              onPersistenceChange={onPersistenceChange}
              onStageStateChange={onStageStateChange}
              clinicalView={isStages ? "stages" : "setup"}
              caseId={caseId}
              userId={userId}
              initialState={initialScanState}
              sessionActive={sessionActive}
              stageAiReview={stageAiReview}
              stageAiReviewLoading={stageAiReviewLoading}
              stageAiReviewError={stageAiReviewError}
              onRunStageAiReview={onRunStageAiReview}
              onSignIn={onSignIn}
            />
          </Suspense>
        </div>
      ) : (
        <div className="setup-workspace__surface is-visible">
          <div className="setup-demo-workspace">
            <div className="app-viewport">
              <Suspense
                fallback={
                  <div className="clinical-viewer__message" role="status">
                    <span className="clinical-loader" aria-hidden="true" />
                    <strong>Loading demo reference</strong>
                  </div>
                }
              >
                <ClinicalViewer ref={viewerRef} onSelectionChange={setSelectedTooth} />
              </Suspense>

              <div className="app-viewport__corner">
                <span>Reference model · not patient data</span>
                <strong>{selectedTooth || "Select a tooth"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type BracketMotionDoctorProfile = {
  firstName?: string;
  lastName?: string;
  clinic?: string;
};

function SettingsView({
  session,
  avatarUrl,
  onAvatarChanged,
  onSignIn,
}: {
  session: BracketMotionSession | null;
  avatarUrl: string | null;
  onAvatarChanged: () => void;
  onSignIn: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clinic, setClinic] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const profile = session?.user.user_metadata?.bracketmotion_profile as
    | BracketMotionDoctorProfile | undefined;
  useEffect(() => {
    if (!session) {
      setFirstName("");
      setLastName("");
      setClinic("");
      return;
    }
    const originalName = String(session.user.user_metadata?.full_name || "").trim();
    const [fallbackFirst, ...fallbackLast] = originalName.split(/\s+/);
    setFirstName(profile?.firstName ?? fallbackFirst ?? "");
    setLastName(profile?.lastName ?? fallbackLast.join(" "));
    setClinic(profile?.clinic ?? "");
    setProfileMessage("");
    setPhotoMessage("");
    setPasswordMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [session?.user.id, profile?.firstName, profile?.lastName, profile?.clinic]);

  const displayName = [firstName, lastName].map((name) => name.trim()).filter(Boolean).join(" ") ||
    session?.user.email || "Clinician";
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    if (!firstName.trim() || firstName.trim().length > 80 || lastName.trim().length > 80 || clinic.trim().length > 120) {
      setProfileMessage("Enter a first name and keep the profile fields within their limits.");
      return;
    }
    setProfileBusy(true);
    setProfileMessage("");
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          bracketmotion_profile: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            clinic: clinic.trim(),
          },
        },
      });
      if (error) throw error;
      setProfileMessage("Profile saved.");
    } catch {
      setProfileMessage("Profile could not be saved. Try again.");
    } finally {
      setProfileBusy(false);
    }
  };

  const onPhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session) return;
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    setPhotoMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      setPhotoMessage("Choose a JPG, PNG or WebP photo smaller than 2 MB.");
      return;
    }
    try {
      if (typeof createImageBitmap === "function") {
        const image = await createImageBitmap(file);
        image.close();
      }
    } catch {
      setPhotoMessage("This file is not a readable image.");
      return;
    }
    setAvatarBusy(true);
    try {
      await uploadBracketMotionAvatar(session.user.id, file);
      onAvatarChanged();
      setPhotoMessage("Profile photo updated.");
    } catch {
      setPhotoMessage("Photo upload failed. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const deletePhoto = async () => {
    if (!session) return;
    setAvatarBusy(true);
    setPhotoMessage("");
    try {
      await removeBracketMotionAvatar(session.user.id);
      onAvatarChanged();
      setPhotoMessage("Profile photo removed.");
    } catch {
      setPhotoMessage("Photo could not be removed. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setPasswordMessage("");
    if (!session.user.email) {
      setPasswordMessage("This account has no email address for password verification.");
      return;
    }
    if (newPassword.length < 8 || newPassword !== confirmPassword || newPassword === currentPassword) {
      setPasswordMessage("Choose a different password of at least 8 characters and confirm it exactly.");
      return;
    }
    setPasswordBusy(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (loginError || data.user?.id !== session.user.id) {
        throw new Error("Current password not verified");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated for your shared DentAIstudy account.");
    } catch {
      setPasswordMessage("Password change failed. Check your current password or use your identity provider.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="settings-workspace">
      <h1>Account Settings</h1>
      {!session && (
        <div className="settings-guest-state">
          <span>Preview mode. Sign in to edit your profile and manage security.</span>
          <button className="app-quiet-button" type="button" onClick={onSignIn}>Sign in</button>
        </div>
      )}
      <form className="settings-card" onSubmit={saveProfile}>
        <h2>1. Profile Information</h2>
        <div className="settings-profile-layout">
          <div className="settings-photo-panel">
            <div className="settings-avatar" aria-label="Clinician profile photo">
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName + " profile photo"} />
                : <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
            </div>
            <strong>{displayName}</strong>
            <div className="settings-photo-actions">
              <input ref={avatarInputRef} className="settings-file-input" type="file"
                accept="image/png,image/jpeg,image/webp" aria-label="Choose clinician profile photo"
                onChange={(event) => void onPhotoSelected(event)} />
              <button type="button" className="app-quiet-button"
                onClick={() => avatarInputRef.current?.click()} disabled={!session || avatarBusy}>
                {avatarBusy ? "Updating…" : "Change photo"}
              </button>
              {avatarUrl && (
                <button type="button" className="app-quiet-button"
                  onClick={() => void deletePhoto()} disabled={avatarBusy}>Remove photo</button>
              )}
            </div>
            {photoMessage && <p role="status" className="settings-feedback">{photoMessage}</p>}
          </div>
          <div className="settings-profile-fields">
            <label><span>First Name</span>
              <input type="text" value={firstName} autoComplete="given-name"
                onChange={(event) => setFirstName(event.target.value)} maxLength={80} required disabled={!session} />
            </label>
            <label><span>Last Name</span>
              <input type="text" value={lastName} autoComplete="family-name"
                onChange={(event) => setLastName(event.target.value)} maxLength={80} disabled={!session} />
            </label>
            <label><span>Email Address</span>
              <input type="email" value={session?.user.email || ""} readOnly />
            </label>
            <label><span>Clinic / Practice Name</span>
              <input type="text" value={clinic} maxLength={120}
                onChange={(event) => setClinic(event.target.value)} disabled={!session} />
            </label>
          </div>
        </div>
        <div className="settings-form-footer">
          {profileMessage && <p role="status" className="settings-feedback">{profileMessage}</p>}
          <button type="submit" className="app-primary-action" disabled={!session || profileBusy}>
            {profileBusy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
      <form className="settings-card" onSubmit={(event) => void changePassword(event)}>
        <h2>2. Security</h2>
        <p className="settings-card-note">
          BracketMotion currently shares your DentAIstudy sign-in. Changing this password affects both services.
        </p>
        <div className="settings-security-fields">
          <label><span>Current Password</span>
            <input type="password" autoComplete="current-password" value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)} required disabled={!session} />
          </label>
          <label><span>New Password</span>
            <input type="password" autoComplete="new-password" value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)} minLength={8} required disabled={!session} />
          </label>
          <label><span>Confirm New Password</span>
            <input type="password" autoComplete="new-password" value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required disabled={!session} />
          </label>
        </div>
        <div className="settings-form-footer">
          {passwordMessage && <p role="status" className="settings-feedback">{passwordMessage}</p>}
          <button className="app-quiet-button" type="submit" disabled={!session || passwordBusy}>
            {passwordBusy ? "Updating…" : "Change Password"}
          </button>
        </div>
      </form>
      <section className="settings-danger">
        <h2>Account deletion</h2>
        <p>
          Account deletion is unavailable until BracketMotion has independent authentication.
          Deleting this shared login would also affect your DentAIstudy account.
        </p>
      </section>
    </div>
  );
}

function ClinicalAppPage() {
  const [activeSection, setActiveSection] = useState<ClinicalSection>("Case");
  const [showCaseHub, setShowCaseHub] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [doctorAvatar, setDoctorAvatar] = useState<string | null>(null);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [session, setSession] = useState<BracketMotionSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [savedCases, setSavedCases] = useState<BracketMotionCaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientStatusFilter, setPatientStatusFilter] = useState("All statuses");
  const [patientSort, setPatientSort] = useState("Last active");
  const [patientPage, setPatientPage] = useState(1);
  const casesRequestRef = useRef(0);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseLabel, setCaseLabel] = useState("");
  const [caseDetails, setCaseDetails] = useState<CaseDetailsState>(emptyCaseDetails);
  const [findings, setFindings] = useState<FindingsState>(emptyFindings);
  const [diagnosis, setDiagnosis] = useState<DiagnosisState>(emptyDiagnosis);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const diagnosisRequestRef = useRef(0);
  const [scopeIssue, setScopeIssue] = useState("");
  const [planApproved, setPlanApproved] = useState(false);
  const [setupApproved, setSetupApproved] = useState(false);
  const [plan, setPlan] = useState<TreatmentPlanState>(emptyPlan);
  const [photos, setPhotos] = useState<Partial<Record<PhotoKey, CasePhoto>>>({});
  const [cephTrace, setCephTrace] = useState<CephTrace | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoUrlsRef = useRef<Partial<Record<PhotoKey, string>>>({});
  const photoGenerationRef = useRef(0);
  const photoRequestRef = useRef<Partial<Record<PhotoKey, number>>>({});
  const [scanState, setScanState] = useState<ScanPersistenceState | null>(null);
  const [stageState, setStageState] = useState<StagePersistenceState | null>(null);
  const [saveState, setSaveState] =
    useState<"local" | "saving" | "saved" | "error">("local");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");
  const suggestionRequestRef = useRef(0);
  const [stageAiReview, setStageAiReview] = useState<StageAiReviewResult | null>(null);
  const [stageAiReviewLoading, setStageAiReviewLoading] = useState(false);
  const [stageAiReviewError, setStageAiReviewError] = useState("");
  const stageAiRequestRef = useRef(0);
  const skipNextAutosaveRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const online = useOnlineStatus();

  const missingCount = intraoralPhotoSlots.filter((slot) => !photos[slot.key]).length;
  const planningReady = missingCount === 0 && !scopeIssue;
  const userId = session?.user.id ?? null;
  const doctorProfile = session?.user.user_metadata?.bracketmotion_profile as
    | BracketMotionDoctorProfile | undefined;
  const accountName = [doctorProfile?.firstName, doctorProfile?.lastName]
    .filter(Boolean).join(" ").trim() ||
    String(session?.user.user_metadata?.full_name || session?.user.email || "A");
  const accountInitial = (accountName.trim().charAt(0) || "A").toUpperCase();

  useEffect(() => {
    let active = true;
    let photoUrl: string | null = null;
    setDoctorAvatar(null);
    if (userId && online) {
      void downloadBracketMotionAvatar(userId).then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        photoUrl = url;
        setDoctorAvatar(url);
      }).catch(() => {
        if (active) setDoctorAvatar(null);
      });
    }
    return () => {
      active = false;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [userId, avatarRevision, online]);

  const patientCases = useMemo(() => savedCases.map((savedCase) => {
    const stored = savedCase.records && typeof savedCase.records === "object"
      ? (savedCase.records as StoredRecordsState)
      : {};
    const diagnosisText = stored.diagnosis?.summary?.trim() ||
      stored.diagnosis?.interpretation?.trim();
    const status = savedCase.scope_issue
      ? "Planning blocked"
      : savedCase.setup_approved
        ? "3D setup approved"
        : savedCase.plan_approved
          ? "Plan approved"
          : diagnosisText
            ? "Diagnosis drafted"
            : "Case presentation";
    const savedAge = stored.details?.age;
    const age = typeof savedAge === "string" && /^\d{1,3}$/.test(savedAge.trim())
      ? savedAge.trim() : "—";
    const updated = Date.parse(savedCase.updated_at);
    const opened = Date.parse(savedCase.last_opened_at);
    const lastActive = Math.max(
      Number.isFinite(updated) ? updated : 0,
      Number.isFinite(opened) ? opened : 0,
    );
    return { ...savedCase, status, age, lastActive };
  }), [savedCases]);

  const patientStatuses = [
    "Case presentation",
    "Diagnosis drafted",
    "Plan approved",
    "3D setup approved",
    "Planning blocked",
  ];
  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLocaleLowerCase();
    return patientCases.filter((item) =>
      (patientStatusFilter === "All statuses" || item.status === patientStatusFilter) &&
      (!query || [item.label, item.id, item.status, item.age].some((value) =>
        value.toLocaleLowerCase().includes(query),
      )),
    ).sort((a, b) =>
      patientSort === "Name A–Z"
        ? a.label.localeCompare(b.label)
        : patientSort === "Recently updated"
          ? Date.parse(b.updated_at) - Date.parse(a.updated_at)
          : b.lastActive - a.lastActive,
    );
  }, [patientCases, patientSearch, patientSort, patientStatusFilter]);
  const patientsPerPage = 8;
  const patientPageCount = Math.max(1, Math.ceil(filteredPatients.length / patientsPerPage));
  const visiblePatientPage = Math.min(patientPage, patientPageCount);
  const visiblePatients = filteredPatients.slice(
    (visiblePatientPage - 1) * patientsPerPage,
    visiblePatientPage * patientsPerPage,
  );

  useEffect(() => {
    setPatientPage(1);
  }, [patientSearch, patientSort, patientStatusFilter]);

  const cancelSuggestions = useCallback(() => {
    suggestionRequestRef.current += 1;
    setSuggestionsLoading(false);
  }, []);

  const invalidateTreatmentSelection = () => {
    cancelSuggestions();
    setPlan((current) => ({
      ...current,
      selectedOption: null,
      primaryStrategy: "",
      alternativeStrategy: "",
    }));
  };

  const clearLocalPhotos = useCallback(() => {
    cancelSuggestions();
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    photoGenerationRef.current += 1;
    photoRequestRef.current = {};
    Object.values(photoUrlsRef.current).forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    photoUrlsRef.current = {};
    setPhotos({});
    setCephTrace(null);
    setPhotoError("");
  }, [cancelSuggestions]);

  const refreshCases = useCallback(async () => {
    const request = ++casesRequestRef.current;
    if (!userId) {
      setSavedCases([]);
      setCasesLoading(false);
      return;
    }

    if (!online) {
      setCaseError("You are offline. Reconnect to load saved cases.");
      return;
    }

    setCasesLoading(true);
    setCaseError("");

    try {
      const cases = await listBracketMotionCases(userId);
      if (casesRequestRef.current === request) setSavedCases(cases);
    } catch {
      if (casesRequestRef.current === request) {
        setCaseError("Saved cases could not be loaded.");
      }
    } finally {
      if (casesRequestRef.current === request) setCasesLoading(false);
    }
  }, [online, userId]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    if (previousUserId !== userId) {
      casesRequestRef.current += 1;
      setSavedCases([]);
      setPatientPage(1);
    }

    if (!userId) {
      setSavedCases([]);

      if (previousUserId) {
        setCaseId(null);
        setCaseLabel("");
        setCaseDetails(emptyCaseDetails);
        setFindings(emptyFindings);
        setDiagnosis(emptyDiagnosis);
        diagnosisRequestRef.current += 1;
        setDiagnosisLoading(false);
        setDiagnosisError("");
        setScopeIssue("");
        setPlan(emptyPlan);
        setPlanApproved(false);
        setSetupApproved(false);
        setScanState(null);
        setStageState(null);
        cancelSuggestions();
        setSuggestionsError("");
        setStageAiReview(null);
        setStageAiReviewError("");
        clearLocalPhotos();
        setSaveState("local");
        setShowCaseHub(false);
        setShowSettings(false);
        setActiveSection("Case");
      }

      return;
    }

    void refreshCases();
  }, [clearLocalPhotos, refreshCases, userId]);

  useEffect(() => {
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      photoUrlsRef.current = {};
    };
  }, []);

  const changePhoto = async (key: PhotoKey, file: File | null) => {
    const generation = photoGenerationRef.current;
    const request = (photoRequestRef.current[key] || 0) + 1;
    photoRequestRef.current[key] = request;
    const isCurrent = () => generation === photoGenerationRef.current && request === photoRequestRef.current[key];

    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file && (file.size === 0 || file.size > 12 * 1024 * 1024)) {
      setPhotoError("Choose an image between 1 byte and 12 MB.");
      return;
    }
    if (file && typeof createImageBitmap === "function") {
      try {
        const decoded = await createImageBitmap(file);
        decoded.close();
      } catch {
        if (isCurrent()) setPhotoError("This image cannot be opened. Choose another JPG, PNG or WebP.");
        return;
      }
    }
    if (!isCurrent()) return;

    const previousUrl = photoUrlsRef.current[key];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    if (previewUrl) photoUrlsRef.current[key] = previewUrl;
    else delete photoUrlsRef.current[key];

    setPhotos((current) => {
      const next = { ...current };
      if (file && previewUrl) next[key] = { file, name: file.name, previewUrl };
      else delete next[key];
      return next;
    });
    if (key === "ceph") setCephTrace(null);
    setPhotoError("");
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
    invalidateTreatmentSelection();
    setStageAiReview(null);
  };

  const updateCaseDetail = (field: keyof CaseDetailsState, value: string) => {
    setCaseDetails((current) => ({ ...current, [field]: value }));
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
    invalidateTreatmentSelection();
  };

  const updateFinding = (field: keyof FindingsState, value: string) => {
    setFindings((current) => ({ ...current, [field]: value }));
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
    invalidateTreatmentSelection();
  };

  const updateDiagnosis = (field: "summary" | "interpretation" | "informationGaps", value: string) => {
    setDiagnosis((current) => ({ ...current, [field]: value, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
    invalidateTreatmentSelection();
  };

  const updatePlan = (field: "problemList" | "goals" | "informationGaps", value: string) => {
    setPlan((current) => ({ ...current, [field]: value }));
    setPlanApproved(false);
    setSetupApproved(false);
    cancelSuggestions();
  };

  const updateTreatmentOption = (index: number, field: keyof TreatmentOption, value: string) => {
    setPlan((current) => ({
      ...current,
      options: current.options.map((option, position) =>
        position === index ? { ...option, [field]: value } : option,
      ),
    }));
    setPlanApproved(false);
    setSetupApproved(false);
    cancelSuggestions();
  };

  const selectTreatmentOption = (index: number) => {
    if (!plan.options[index]) return;
    setPlan((current) => ({ ...current, selectedOption: index }));
    setPlanApproved(false);
    setSetupApproved(false);
    cancelSuggestions();
  };

  const approveTreatmentPlan = () => {
    if (!diagnosis.approved || !planningReady || !plan.problemList.trim() || !plan.goals.trim()) return;
    const option = plan.selectedOption === null ? null : plan.options[plan.selectedOption];
    if (!option || !Object.values(option).every((value) => value.trim())) return;
    setPlan((current) => ({
      ...current,
      primaryStrategy: option.title + ": " + option.mechanics,
      alternativeStrategy: current.options
        .filter((_, index) => index !== current.selectedOption)
        .filter((candidate) => candidate.title.trim() && candidate.mechanics.trim())
        .map((candidate) => candidate.title + ": " + candidate.mechanics)
        .join("\n"),
    }));
    setPlanApproved(true);
    setSetupApproved(false);
  };

  const openSection = (section: ClinicalSection) => {
    setShowCaseHub(false);
    setShowSettings(false);

    if ((section === "Plan" || section === "Setup" || section === "Stages") && !diagnosis.approved) {
      setActiveSection("Findings");
      return;
    }

    if ((section === "Setup" || section === "Stages") && !planApproved) {
      setActiveSection("Plan");
      return;
    }

    if (section === "Stages" && !setupApproved) {
      setActiveSection("Setup");
      return;
    }

    setActiveSection(section);
  };

  const openLocalCase = () => {
    clearLocalPhotos();
    setCaseId(null);
    setCaseLabel("");
    setCaseDetails(emptyCaseDetails);
    setFindings(emptyFindings);
    setDiagnosis(emptyDiagnosis);
    setDiagnosisLoading(false);
    setDiagnosisError("");
    setScopeIssue("");
    setPlanApproved(false);
    setSetupApproved(false);
    setPlan(emptyPlan);
    setScanState(null);
    setStageState(null);
    cancelSuggestions();
    setSuggestionsError("");
    setStageAiReview(null);
    setStageAiReviewError("");
    setSaveState("local");
    setShowCaseHub(false);
    setShowSettings(false);
    setActiveSection("Case");
  };

  const applySavedCase = useCallback((row: Awaited<ReturnType<typeof loadBracketMotionCase>>) => {
    clearLocalPhotos();
    const storedRecords =
      row.records && typeof row.records === "object"
        ? (row.records as StoredRecordsState)
        : {};
    const storedPlan =
      row.plan && typeof row.plan === "object"
        ? (row.plan as Partial<TreatmentPlanState>)
        : {};
    const storedScan =
      row.scan_state &&
      typeof row.scan_state === "object" &&
      (row.scan_state as Partial<ScanPersistenceState>).version === 1
        ? ({
            ...(row.scan_state as ScanPersistenceState),
            setupApproved: row.setup_approved,
          } as ScanPersistenceState)
        : null;
    const storedStages =
      row.stage_state &&
      typeof row.stage_state === "object" &&
      (row.stage_state as Partial<StagePersistenceState>).version === 1
        ? (row.stage_state as StagePersistenceState)
        : null;

    skipNextAutosaveRef.current = true;
    setCaseId(row.id);
    setCaseLabel(row.label || "Untitled Case");
    setCaseDetails({ ...emptyCaseDetails, ...(storedRecords.details || {}) });
    setFindings({ ...emptyFindings, ...(storedRecords.findings || {}) });
    setDiagnosis({ ...emptyDiagnosis, ...(storedRecords.diagnosis || {}), approved: false });
    setDiagnosisLoading(false);
    setDiagnosisError("");
    setScopeIssue(row.scope_issue || "");
    setPlan({
      ...emptyPlan,
      ...storedPlan,
      options: Array.from({ length: 3 }, (_, index) => {
        const old = Array.isArray(storedPlan.options) ? storedPlan.options[index] : null;
        return {
          title: typeof old?.title === "string" ? old.title : "",
          aims: typeof old?.aims === "string" ? old.aims : "",
          mechanics: typeof old?.mechanics === "string" ? old.mechanics : "",
          checks: typeof old?.checks === "string" ? old.checks : "",
        };
      }),
      selectedOption: null,
    });
    setPlanApproved(false);
    setSetupApproved(false);
    setScanState(storedScan);
    setStageState(storedStages);
    cancelSuggestions();
    setSuggestionsError("");
    setStageAiReview(null);
    setStageAiReviewError("");
    setSaveState("saved");
    setShowCaseHub(false);
    setShowSettings(false);
    setActiveSection("Case");
  }, [clearLocalPhotos]);

  const openSavedCase = async (savedCaseId: string) => {
    if (!online) {
      setCaseError("You are offline. Reconnect to open a saved case.");
      setShowCaseHub(true);
      return;
    }

    setCasesLoading(true);
    setCaseError("");

    try {
      const row = await loadBracketMotionCase(savedCaseId);
      if (row.user_id !== userId || previousUserIdRef.current !== userId) return;
      applySavedCase(row);
      setSavedCases((current) => current.map((item) =>
        item.id === savedCaseId
          ? { ...item, last_opened_at: new Date().toISOString() }
          : item,
      ));
    } catch {
      setCaseError("This case could not be opened.");
    } finally {
      setCasesLoading(false);
    }
  };

  const startNewCase = async () => {
    if (!session) {
      setAccountOpen(true);
      return;
    }

    if (!online) {
      setCaseError("You are offline. Reconnect to create a saved case.");
      setShowCaseHub(true);
      return;
    }

    setCasesLoading(true);
    setCaseError("");

    try {
      const row = await createBracketMotionCase(session.user.id, "Untitled Case");
      applySavedCase(row);
      await refreshCases();
    } catch {
      setCaseError("A new case could not be created.");
      setShowCaseHub(true);
    } finally {
      setCasesLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !caseId || !online) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const dbLabel = caseLabel.trim() || "Untitled Case";
      setSaveState("saving");

      void saveBracketMotionCase(caseId, {
        label: dbLabel,
        records: {
          details: caseDetails,
          findings,
          diagnosis,
        },
        scope_issue: scopeIssue,
        plan,
        plan_approved: planApproved,
        setup_approved: setupApproved,
        scan_state: scanState || {},
        stage_state: stageState || {},
      })
        .then(() => {
          const now = new Date().toISOString();
          setSaveState("saved");
          setSavedCases((current) =>
            current
              .map((item) =>
                item.id === caseId
                  ? {
                      ...item,
                      label: dbLabel,
                      plan_approved: planApproved,
                      setup_approved: setupApproved,
                      updated_at: now,
                      scope_issue: scopeIssue,
                      records: {
                        details: caseDetails,
                        findings,
                        diagnosis,
                      },
                    }
                  : item,
              )
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              ),
          );
        })
        .catch(() => setSaveState("error"));
    }, 850);

    return () => window.clearTimeout(timer);
  }, [
    caseDetails,
    caseId,
    caseLabel,
    diagnosis,
    findings,
    plan,
    planApproved,
    scanState,
    scopeIssue,
    online,
    session,
    setupApproved,
    stageState,
  ]);

  const buildAiPayload = (mode: AiReviewMode) => {
    const activeMechanics = scanState?.mechanicsComparison?.active === "B" &&
      scanState.mechanicsComparison.alternative
      ? scanState.mechanicsComparison.alternative.layers
      : scanState?.applianceLayers;
    const movedTeeth = scanState
      ? Object.entries(scanState.targetTransforms)
          .filter(([, transform]) => {
            const translation = Math.hypot(...transform.position);
            const rotation =
              Math.abs(transform.rotation[0]) +
              Math.abs(transform.rotation[1]) +
              Math.abs(transform.rotation[2]);
            return translation > 0.01 || rotation > 0.005;
          })
          .map(([id]) => {
            const segment = scanState.segments.find((item) => item.id === id);
            return segment?.label || id;
          })
      : [];

    return {
      mode,
      case_details: {
        age: caseDetails.age,
        sex: caseDetails.sex,
        patient_stage: caseDetails.patientStage,
        growth_status: caseDetails.growthStatus,
        chief_complaint: caseDetails.chiefComplaint,
        medical_history: caseDetails.medicalHistory,
        dental_history: caseDetails.dentalHistory,
        clinical_notes: caseDetails.notes,
      },
      gates: {
        planning_ready: planningReady,
        clinical_plan_approved: planApproved,
        setup_approved: setupApproved,
      },
      findings: {
        oral_periodontal: [
          `Oral hygiene: ${findings.oralHygiene}`,
          `Periodontal status: ${findings.periodontalStatus}`,
          `Active caries/pathology: ${findings.activeCaries}`,
          `Restorative considerations: ${findings.restorativeConsiderations}`,
          `Missing teeth: ${findings.missingTeeth}`,
          `Impacted/unerupted teeth: ${findings.impactedTeeth}`,
          `Movement exclusions: ${findings.unsuitableTeeth}`,
        ].join("; "),
        facial: [
          `Profile: ${findings.profile}`,
          `Lip competence: ${findings.lipCompetence}`,
          `Vertical pattern: ${findings.facialVerticalPattern}`,
          `Asymmetry: ${findings.facialAsymmetry}`,
          `Smile/incisor display: ${findings.smileConcern}`,
        ].join("; "),
        occlusal: [
          `Molar R/L: ${findings.molarRight}/${findings.molarLeft}`,
          `Canine R/L: ${findings.canineRight}/${findings.canineLeft}`,
          findings.overjet.trim() ? `Overjet: ${findings.overjet} mm` : "Overjet: not measured",
          findings.overbite.trim() ? `Overbite: ${findings.overbite}%` : "Overbite: not measured",
          findings.maxillaryCrowding.trim() ? `Maxillary crowding/spacing: ${findings.maxillaryCrowding} mm` : "Maxillary crowding/spacing: not measured",
          findings.mandibularCrowding.trim() ? `Mandibular crowding/spacing: ${findings.mandibularCrowding} mm` : "Mandibular crowding/spacing: not measured",
          `Upper midline: ${findings.upperMidline}`,
          `Lower midline: ${findings.lowerMidline}`,
          findings.midlineDiscrepancy.trim() ? `Interarch midline discrepancy: ${findings.midlineDiscrepancy} mm` : "Interarch midline discrepancy: not measured",
          `Curve of Spee: ${findings.curveOfSpee}`,
          `Crossbite: ${findings.crossbite}`,
          `Scissor bite: ${findings.scissorBite}`,
          `Rotations/displacements: ${findings.rotations}`,
        ].join("; "),
        cephalometric: [
          `Skeletal AP: ${findings.skeletalAp}`,
          `Skeletal vertical: ${findings.skeletalVertical}`,
          `Maxillary incisors: ${findings.maxillaryIncisors}`,
          `Mandibular incisors: ${findings.mandibularIncisors}`,
          `Concern: ${findings.cephConcern}`,
          ...(cephTrace?.approved && cephAngles(cephTrace.points)
            ? [`Clinician-verified numeric measurements: ${Object.entries(cephAngles(cephTrace.points)!)
                .filter((entry): entry is [string, number] => typeof entry[1] === "number")
                .map(([name, value]) => `${name.replaceAll("_", "–")} ${value.toFixed(1)}°`)
                .join(", ")}`]
            : []),
        ].join("; "),
      },
      plan: {
        problem_list: plan.problemList,
        goals: plan.goals,
        primary_strategy: plan.primaryStrategy,
        alternative_strategy: plan.alternativeStrategy,
      },
      setup: {
        overjet_mm: null,
        overbite_mm: null,
        midline_mm: null,
        moved_teeth: movedTeeth,
        collision_warning: false,
      },
      mechanics: {
        power_chain: activeMechanics?.powerChain === true,
        closed_coil: activeMechanics?.coilSpring === true,
        interarch_elastics: activeMechanics?.elastics === true,
        closing_loop: activeMechanics?.closingLoop === true,
        stage_summaries:
          stageState?.stages.map((stage) => ({
            title: stage.title,
            active_unit: stage.activeUnits,
            anchorage_unit: stage.anchorageUnits,
            movement_tendency: stage.intendedMovement,
            reciprocal_effects: stage.reciprocalEffects,
            control_strategy: stage.controlStrategy,
          })) || [],
      },
    };
  };

  const runDiagnosisDraft = async () => {
    if (!session) {
      setAccountOpen(true);
      return;
    }
    if (!online) {
      setDiagnosisError("Reconnect to generate a draft.");
      return;
    }
    if (!planningReady) {
      setDiagnosisError("Add all five intraoral photographs first.");
      return;
    }
    const request = ++diagnosisRequestRef.current;
    setDiagnosisLoading(true);
    setDiagnosisError("");

    try {
      const photoInputs = await Promise.all(intraoralPhotoSlots.map(async (slot) => {
        const photo = photos[slot.key];
        if (!photo) throw new Error("MISSING_INTRAORAL_PHOTO");
        return { slot: slot.key, ...await prepareDiagnosisPhoto(photo.file) };
      }));
      if (request !== diagnosisRequestRef.current) return;
      const result = await invokeBracketMotionClinicalReview({
        ...buildAiPayload("diagnosis_draft"),
        photos: photoInputs,
        plan: {},
        setup: {},
        mechanics: {},
      });
      if (request !== diagnosisRequestRef.current) return;
      const review = result?.review as DiagnosisReviewResult | undefined;
      const summary = typeof review?.case_summary === "string" ? review.case_summary.trim() : "";
      const interpretation = typeof review?.clinical_assessment === "string" ? review.clinical_assessment.trim() : "";
      if (!summary || !interpretation) throw new Error("AI_EMPTY_DIAGNOSIS");

      invalidateTreatmentSelection();
      setDiagnosis({
        summary,
        interpretation,
        informationGaps: Array.isArray(review?.missing_information)
          ? review.missing_information.filter((value): value is string => typeof value === "string").join("\n")
          : "",
        approved: false,
      });
      setPlanApproved(false);
      setSetupApproved(false);
    } catch {
      if (request === diagnosisRequestRef.current) {
        setDiagnosisError("Diagnosis could not be prepared. Please try again.");
      }
    } finally {
      if (request === diagnosisRequestRef.current) setDiagnosisLoading(false);
    }
  };

  const generateTreatmentSuggestions = async () => {
    if (!session) {
      setAccountOpen(true);
      return;
    }
    if (!online) {
      setSuggestionsError("Reconnect to generate treatment suggestions.");
      return;
    }
    if (!planningReady || !diagnosis.approved) {
      setSuggestionsError("Complete and approve the clinical diagnosis first.");
      return;
    }

    const request = ++suggestionRequestRef.current;
    setSuggestionsLoading(true);
    setSuggestionsError("");

    try {
      const payload = buildAiPayload("treatment_suggestions");
      const result = await invokeBracketMotionClinicalReview({
        ...payload,
        diagnosis: {
          summary: diagnosis.summary,
          interpretation: diagnosis.interpretation,
          information_gaps: diagnosis.informationGaps,
        },
        gates: { ...payload.gates, diagnosis_approved: diagnosis.approved },
        plan: {},
        setup: {},
        mechanics: {},
      });
      if (request !== suggestionRequestRef.current) return;

      const draft = result?.suggestions;
      if (!draft || !Array.isArray(draft.options)) throw new Error("INVALID_SUGGESTIONS");
      const options = Array.from({ length: 3 }, (_, index) => {
        const item = draft.options[index] || {};
        return {
          title: typeof item.title === "string" ? item.title.trim() : "",
          aims: typeof item.aims === "string" ? item.aims.trim() : "",
          mechanics: typeof item.mechanics === "string" ? item.mechanics.trim() : "",
          checks: typeof item.checks === "string" ? item.checks.trim() : "",
        };
      });
      const informationGaps = Array.isArray(draft.missing_information)
        ? draft.missing_information.filter((item: unknown): item is string => typeof item === "string").join("\n")
        : "";
      setPlan((current) => ({
        ...current,
        problemList: typeof draft.problem_list === "string" && draft.problem_list.trim()
          ? draft.problem_list.trim()
          : current.problemList,
        goals: typeof draft.goals === "string" && draft.goals.trim()
          ? draft.goals.trim()
          : current.goals,
        options,
        selectedOption: null,
        informationGaps,
        primaryStrategy: "",
        alternativeStrategy: "",
      }));
      setPlanApproved(false);
      setSetupApproved(false);
      if (!options.some((option) => option.title && option.aims && option.mechanics && option.checks)) {
        setSuggestionsError("The available case data did not support a complete suggestion. Review missing information or enter a plan manually.");
      }
    } catch {
      if (request === suggestionRequestRef.current) {
        setSuggestionsError("Could not generate suggestions. Your existing plan remains unchanged.");
      }
    } finally {
      if (request === suggestionRequestRef.current) setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    stageAiRequestRef.current += 1;
    setStageAiReview(null);
    setStageAiReviewError("");
    setStageAiReviewLoading(false);
  }, [stageState]);

  const runStageAiReview = async () => {
    if (!session) {
      setAccountOpen(true);
      return;
    }

    if (!online) {
      setStageAiReviewError("Reconnect to run the mechanics review.");
      return;
    }

    const request = ++stageAiRequestRef.current;
    setStageAiReviewLoading(true);
    setStageAiReviewError("");

    try {
      const data = await invokeBracketMotionClinicalReview(
        buildAiPayload("stage_review"),
      );
      if (request === stageAiRequestRef.current) {
        setStageAiReview((data?.review || null) as StageAiReviewResult | null);
      }
    } catch {
      if (request === stageAiRequestRef.current) {
        setStageAiReviewError(
          "The mechanics review could not be generated. Your stages and approvals were not changed.",
        );
      }
    } finally {
      if (request === stageAiRequestRef.current) setStageAiReviewLoading(false);
    }
  };

  const saveLabel =
    !session || !caseId
      ? "Local preview"
      : !online
        ? "Offline"
        : saveState === "saving"
          ? "Saving…"
          : saveState === "error"
            ? "Save failed"
            : "Saved";

  const has3dWorkspace =
    !showCaseHub && !showSettings && (activeSection === "Setup" || activeSection === "Stages");
  const inspectorNextSection: ClinicalSection =
    activeSection === "Case" ? "Findings" : activeSection === "Findings" ? "Plan" : "Setup";
  const inspectorCanAdvance = planningReady && (
    activeSection === "Case" ||
    (activeSection === "Findings" ? diagnosis.approved : planApproved)
  );
  const inspectorActionLabel = activeSection === "Case"
    ? "Continue to Diagnosis"
    : activeSection === "Findings" ? "Review clinical plan" : "Continue to 3D setup";

  return (
    <main className={`clinical-app${showCaseHub || showSettings ? " is-patients" : ""}`}>
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <a className="wordmark app-wordmark" href="/" aria-label="BracketMotion home">
            <span className="wordmark__text">bracket<strong>motion</strong></span>
          </a>
          {!showCaseHub && !showSettings && (
            <>
              <span className="app-topbar__divider" aria-hidden="true" />
              <div className="app-case-title">
                <strong>{caseLabel.trim() || "New case"}</strong>
                <span>{caseDetails.patientStage === "Not specified" ? "Patient stage not set" : caseDetails.patientStage} · {planApproved ? "Plan approved" : diagnosis.approved ? "Diagnosis approved" : planningReady ? "Ready for diagnosis" : "Draft"}</span>
              </div>
            </>
          )}
        </div>
        <div className="app-topbar__actions">
          {!showCaseHub && !showSettings && (
            <span
              className={`app-save-state${saveState === "error" || !online ? " is-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {saveLabel}
            </span>
          )}
          <button
            className={`app-quiet-button${showCaseHub ? " is-active" : ""}`}
            type="button"
            aria-current={showCaseHub ? "page" : undefined}
            onClick={() => {
              setShowSettings(false);
              setShowCaseHub(true);
              if (session) void refreshCases();
            }}
          >
            Patients
          </button>
          <button
            className={`app-quiet-button${showSettings ? " is-active" : ""}`}
            type="button"
            aria-current={showSettings ? "page" : undefined}
            onClick={() => {
              setShowCaseHub(false);
              setShowSettings(true);
            }}
          >
            Settings
          </button>
          <button
            className="app-account-button"
            type="button"
            aria-label={session ? `Account: ${accountName}` : "Sign in"}
            onClick={() => setAccountOpen(true)}
          >
            <span className="app-account-avatar" aria-hidden="true">
              {doctorAvatar && session
                ? <img src={doctorAvatar} alt="" className="app-account-photo" />
                : accountInitial}
            </span>
            <span className="app-account-name">{session ? accountName : "Sign in"}</span>
          </button>
        </div>
      </header>

      {!online && (
        <div className="app-offline-banner" role="status">
          Offline — local work stays in this tab, but saved cases, uploads and AI
          review need a connection.
        </div>
      )}

      {!showCaseHub && !showSettings && <nav className="app-flow-nav" aria-label="Case workflow">
        {clinicalFlow.map((item) => (
          <button
            className={`app-flow-item${activeSection === item.label && !showCaseHub ? " is-active" : ""}`}
            type="button"
            key={item.label}
            title={item.detail}
            aria-current={activeSection === item.label && !showCaseHub ? "step" : undefined}
            onClick={() => openSection(item.label)}
          >
            <svg className="app-flow-item__icon" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              {item.icon}
            </svg>
            <span className="app-flow-item__copy">
              <strong>{item.title}</strong>
            </span>
          </button>
        ))}
      </nav>}

      <div className={`clinical-app__body${has3dWorkspace ? " is-3d-workspace" : showCaseHub || showSettings ? " is-patients" : ""}`}>
        <section className={`app-workspace${has3dWorkspace ? " is-3d-workspace" : ""}${activeSection === "Case" || activeSection === "Findings" || showCaseHub || showSettings ? " is-clinical-form" : ""}`}>

          {showSettings ? (
            <SettingsView
              session={session}
              avatarUrl={doctorAvatar}
              onAvatarChanged={() => setAvatarRevision((value) => value + 1)}
              onSignIn={() => setAccountOpen(true)}
            />
          ) : showCaseHub ? (
            <div className="case-hub">
              <header className="patients-header">
                <div>
                  <h1>Patients</h1>
                  <p>Saved cases in your authenticated account</p>
                </div>
                <button
                  className="app-primary-action case-page-primary"
                  type="button"
                  onClick={() => void startNewCase()}
                  disabled={casesLoading || (Boolean(session) && !online)}
                >
                  + Add New Patient
                </button>
              </header>

              <div className="patients-toolbar">
                <label className="patients-search">
                  <input
                    type="search"
                    aria-label="Search patients"
                    placeholder="Search by patient, case ID, or status…"
                    value={patientSearch}
                    onChange={(event) => setPatientSearch(event.target.value)}
                  />
                </label>
                <div className="patients-filter">
                  <UiSelect
                    value={patientStatusFilter}
                    ariaLabel="Filter patient status"
                    options={["All statuses", ...patientStatuses]}
                    onChange={setPatientStatusFilter}
                  />
                </div>
                <div className="patients-filter">
                  <UiSelect
                    value={patientSort}
                    ariaLabel="Sort patients"
                    options={["Last active", "Recently updated", "Name A–Z"]}
                    onChange={setPatientSort}
                  />
                </div>
              </div>

              {caseError && <div className="case-hub__message is-error" role="alert">{caseError}</div>}
              <div className="patients-layout">
                <section className="patients-list" aria-label="Saved patient cases">
                  {!authReady && (
                    <div className="case-hub__message">Checking your account…</div>
                  )}
                  {authReady && !session && (
                    <div className="patients-empty">
                      <strong>Your patients stay private</strong>
                      <p>Sign in to see the cases saved to your account.</p>
                      <button type="button" className="app-primary-action" onClick={() => setAccountOpen(true)}>
                        Sign in
                      </button>
                      <button type="button" className="app-quiet-button" onClick={openLocalCase}>
                        Open local case
                      </button>
                    </div>
                  )}
                  {session && casesLoading && (
                    <div className="case-hub__message">Loading saved patients…</div>
                  )}
                  {session && !casesLoading && !caseError && savedCases.length === 0 && (
                    <div className="patients-empty">
                      <strong>No saved patients yet</strong>
                      <p>Create your first patient case to get started.</p>
                      <button type="button" className="app-quiet-button" onClick={openLocalCase}>
                        Open local case
                      </button>
                    </div>
                  )}
                  {session && !casesLoading && savedCases.length > 0 && (
                    <>
                      <div className="patients-table-wrap">
                        <table className="patients-table">
                          <thead>
                            <tr>
                              <th scope="col">Patient</th>
                              <th scope="col">Case ID / Age</th>
                              <th scope="col">Photos</th>
                              <th scope="col">Last active</th>
                              <th scope="col">Progress</th>
                              <th scope="col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visiblePatients.map((savedCase) => {
                              const localPhotos = caseId === savedCase.id
                                ? intraoralPhotoSlots.flatMap((slot) =>
                                  photos[slot.key] ? [{ key: slot.key, preview: photos[slot.key]!.previewUrl }] : [],
                                ) : [];
                              const facePhoto = caseId === savedCase.id ? photos.faceFront?.previewUrl : undefined;
                              return (
                                <tr className={caseId === savedCase.id ? "is-current" : ""} key={savedCase.id}>
                                  <th className="patients-cell-patient" scope="row">
                                    <div className="patients-identity">
                                      <span className="patients-avatar">
                                        {facePhoto
                                          ? <img src={facePhoto} alt={savedCase.label + " frontal face preview (this tab only)"} />
                                          : savedCase.label.trim().charAt(0).toUpperCase() || "P"}
                                      </span>
                                      <strong>{savedCase.label}</strong>
                                    </div>
                                  </th>
                                  <td className="patients-cell-id">
                                    <span className="patients-cell-label">Case ID / Age</span>
                                    <span title={savedCase.id}>{savedCase.id.slice(0, 8)} · {savedCase.age}</span>
                                  </td>
                                  <td className="patients-cell-photos">
                                    <span className="patients-cell-label">Photos</span>
                                    {localPhotos.length > 0 ? (
                                      <div className="patients-local-photos">
                                        <div>
                                          {localPhotos.map((photo) => (
                                            <img key={photo.key} src={photo.preview} alt={photo.key + " preview in this tab"} />
                                          ))}
                                        </div>
                                        <small>{localPhotos.length} in this tab only</small>
                                      </div>
                                    ) : <span className="patients-muted">Not saved</span>}
                                  </td>
                                  <td className="patients-cell-date">
                                    <span className="patients-cell-label">Last active</span>
                                    {savedCase.lastActive
                                      ? new Date(savedCase.lastActive).toLocaleDateString(undefined, {
                                          year: "numeric", month: "short", day: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                  <td className="patients-cell-status">
                                    <span className="patients-cell-label">Progress</span>
                                    <span className={`patients-status${savedCase.status === "Planning blocked" ? " is-blocked" : savedCase.setup_approved ? " is-complete" : ""}`}>
                                      {savedCase.status}
                                    </span>
                                  </td>
                                  <td className="patients-cell-action">
                                    <button
                                      className="patients-open"
                                      type="button"
                                      onClick={() => void openSavedCase(savedCase.id)}
                                      disabled={!online || casesLoading}
                                      aria-label={"Open case " + savedCase.label}
                                    >
                                      Open Case <span aria-hidden="true">→</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {filteredPatients.length === 0 && (
                          <div className="case-hub__message">No patients match your search or status filter.</div>
                        )}
                      </div>
                      <div className="patients-pagination">
                        <span>
                          {filteredPatients.length === 0 ? "Showing 0" :
                            `Showing ${(visiblePatientPage - 1) * patientsPerPage + 1}–${Math.min(visiblePatientPage * patientsPerPage, filteredPatients.length)}`}
                          {" of "}{filteredPatients.length} cases
                        </span>
                        <div>
                          <button type="button" onClick={() => setPatientPage((page) => Math.max(1, page - 1))}
                            disabled={visiblePatientPage === 1} aria-label="Previous patients page">‹</button>
                          <span>Page {visiblePatientPage} of {patientPageCount}</span>
                          <button type="button" onClick={() => setPatientPage((page) => Math.min(patientPageCount, page + 1))}
                            disabled={visiblePatientPage === patientPageCount} aria-label="Next patients page">›</button>
                        </div>
                      </div>
                    </>
                  )}
                </section>
                <aside className="patients-summary" aria-label="Patient case summary">
                  <h2>Case Summary</h2>
                  {session && !casesLoading && !caseError ? (
                    <>
                      <div className="patients-summary-total">
                        <span>Total saved cases</span>
                        <strong>{patientCases.length}</strong>
                      </div>
                      {patientStatuses.map((status) => (
                        <div className="patients-summary-item" key={status}>
                          <span>{status}</span>
                          <strong>{patientCases.filter((item) => item.status === status).length}</strong>
                        </div>
                      ))}
                    </>
                  ) : <p className="patients-muted">Sign in to view your case totals.</p>}
                </aside>
              </div>
            </div>
          ) : activeSection === "Case" ? (
            <CaseRecordsView
              caseLabel={caseLabel}
              onCaseLabel={setCaseLabel}
              caseDetails={caseDetails}
              onCaseDetail={updateCaseDetail}
              photos={photos}
              onPhotoChange={changePhoto}
              photoError={photoError}
              planningReady={planningReady}
              missingCount={missingCount}
              scopeIssue={scopeIssue}
              onOpenFindings={() => setActiveSection("Findings")}
            />
          ) : activeSection === "Findings" ? (
            <FindingsView
              scopeIssue={scopeIssue}
              onScopeIssue={(value) => {
                setScopeIssue(value);
                setDiagnosis((current) => ({ ...current, approved: false }));
                diagnosisRequestRef.current += 1;
                setDiagnosisLoading(false);
                setPlanApproved(false);
                setSetupApproved(false);
                invalidateTreatmentSelection();
              }}
              findings={findings}
              onFindingChange={updateFinding}
              cephPhoto={photos.ceph}
              cephTrace={cephTrace}
              onCephTraceChange={(next) => {
                if (cephTrace?.approved) {
                  setDiagnosis((current) => ({ ...current, approved: false }));
                  setPlanApproved(false);
                  setSetupApproved(false);
                  invalidateTreatmentSelection();
                }
                setCephTrace(next);
              }}
              onApproveCeph={(next) => {
                setCephTrace(next);
                setDiagnosis((current) => ({ ...current, approved: false }));
                setPlanApproved(false);
                setSetupApproved(false);
                invalidateTreatmentSelection();
              }}
              onOpenRecords={() => setActiveSection("Case")}
              diagnosis={diagnosis}
              onDiagnosisChange={updateDiagnosis}
              onApproveDiagnosis={() => setDiagnosis((current) => ({ ...current, approved: true }))}
              onGenerateDiagnosis={() => void runDiagnosisDraft()}
              onSignIn={() => setAccountOpen(true)}
              onOpenPlan={() => openSection("Plan")}
              sessionActive={Boolean(session)}
              diagnosisLoading={diagnosisLoading}
              diagnosisError={diagnosisError}
              planningReady={planningReady}
              missingCount={missingCount}
            />
          ) : activeSection === "Plan" ? (
            <TreatmentPlanView
              planningReady={planningReady}
              scopeIssue={scopeIssue}
              plan={plan}
              planApproved={planApproved}
              sessionActive={Boolean(session)}
              suggestionsLoading={suggestionsLoading}
              suggestionsError={suggestionsError}
              onGenerate={() => void generateTreatmentSuggestions()}
              onSignIn={() => setAccountOpen(true)}
              onPlanChange={updatePlan}
              onOptionChange={updateTreatmentOption}
              onSelectOption={selectTreatmentOption}
              onApprove={approveTreatmentPlan}
            />
          ) : (
            <SetupWorkspace
              onSetupApprovalChange={setSetupApproved}
              onPersistenceChange={setScanState}
              onStageStateChange={setStageState}
              clinicalSection={activeSection as "Setup" | "Stages"}
              caseId={caseId}
              userId={userId}
              initialScanState={scanState}
              sessionActive={Boolean(session)}
              stageAiReview={stageAiReview}
              stageAiReviewLoading={stageAiReviewLoading}
              stageAiReviewError={stageAiReviewError}
              onRunStageAiReview={() => void runStageAiReview()}
              onSignIn={() => setAccountOpen(true)}
            />
          )}
        </section>

        {!has3dWorkspace && !showCaseHub && !showSettings && (
          <aside className="app-inspector" aria-label="Case inspector">
            <div className="app-inspector__header">
              <div>
                <span>{showCaseHub ? "Cases" : activeSection} status</span>
                <strong>{scopeIssue ? "Planning blocked" : !planningReady ? "Photos incomplete" : planApproved ? "Plan approved" : diagnosis.approved ? "Diagnosis approved" : "Ready for diagnosis"}</strong>
              </div>
            </div>

            <div className="app-inspector__section app-inspector__section--compact">
              <div className="app-inspector__row">
                <span>Diagnosis</span>
                <strong>{diagnosis.approved ? "Approved" : "Not approved"}</strong>
              </div>
              <div className="app-inspector__row">
                <span>Clinical plan</span>
                <strong>{planApproved ? "Approved" : "Not approved"}</strong>
              </div>
              <div className="app-inspector__row">
                <span>3D setup</span>
                <strong>{setupApproved ? "Approved" : "Not approved"}</strong>
              </div>
              <div className="app-inspector__row">
                <span>Storage</span>
                <strong>{session && caseId ? saveLabel : "Local only"}</strong>
              </div>
            </div>

            <div className="app-inspector__footer">
              <button
                className="app-primary-action"
                type="button"
                disabled={!inspectorCanAdvance}
                onClick={() => openSection(inspectorNextSection)}
              >
                {inspectorActionLabel}
              </button>
            </div>
          </aside>
        )}
      </div>

      <AuthDialog
        open={accountOpen}
        session={session}
        onClose={() => setAccountOpen(false)}
      />
    </main>
  );
}

function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="legal-page">
        <div className="container legal-content">
          <div className="legal-header">
            <p className="section-kicker">Legal</p>
            <h1>{title}</h1>
            <p className="legal-updated">Last updated: 26 November 2026</p>
          </div>

          <article className="legal-article">
            <p className="legal-intro">{intro}</p>
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="This Privacy Policy explains how BracketMotion collects, uses, stores and shares information when clinicians use our website and orthodontic planning software."
    >
      <h2>1. Information we collect</h2>
      <p>Depending on how you use BracketMotion, we may process:</p>
      <ul>
        <li><strong>Account data:</strong> name, email address, login credentials and account preferences.</li>
        <li><strong>Clinical case data:</strong> patient labels, age, orthodontic records, measurements, images, uploaded STL/PLY models, treatment notes and related case information you choose to provide.</li>
        <li><strong>AI inputs and outputs:</strong> case information and the five intraoral photographs submitted when you explicitly generate an AI diagnosis draft, as well as the responses returned to the application. The photographs are transmitted to the Google Gemini API for that request; they are not saved as part of your BracketMotion case.</li>
        <li><strong>Technical data:</strong> browser, device, IP address, error logs and basic service-usage information needed to operate and secure the platform.</li>
      </ul>

      <h2>2. Patient data and your responsibility</h2>
      <p>
        Clinical records may contain personal or sensitive health information. You must have a lawful basis, authorization or other required permission before uploading patient information. Upload only information reasonably necessary for the case and use de-identified or pseudonymized records whenever practical.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>Provide authentication, case storage and saved treatment-planning work.</li>
        <li>Display, process and visualize uploaded dental models and records.</li>
        <li>Generate clinician-reviewed AI-assisted summaries, alternatives and draft treatment stages.</li>
        <li>Maintain security, reliability, support and product performance.</li>
        <li>Comply with applicable legal obligations and investigate misuse when necessary.</li>
      </ul>

      <h2>4. Service providers</h2>
      <p>
        BracketMotion is designed to use <strong>Vercel</strong> for web delivery, <strong>Supabase</strong> for authentication, database and file storage, and the <strong>Google Gemini API</strong> for controlled AI features. These providers process information only as needed to provide their services and under their own contractual and privacy obligations.
      </p>
      <p>
        Before real patient data is sent to any AI service, BracketMotion will use an appropriate production configuration and review the provider's current privacy, retention and contractual terms. Patient clinical data must not be sent through an AI tier that permits submitted content to be used for product improvement.
      </p>

      <h2>5. Storage and security</h2>
      <p>
        We use reasonable technical and organizational safeguards appropriate to the service. Supabase states that customer data is encrypted in transit and at rest. No online system can guarantee absolute security, so users should avoid uploading unnecessary identifiers or unrelated sensitive information.
      </p>

      <h2>6. Sharing and sale of data</h2>
      <p>
        We do not sell patient or account data. Information may be disclosed to service providers that operate BracketMotion, when you direct us to do so, or when disclosure is required by law.
      </p>

      <h2>7. Retention and deletion</h2>
      <p>
        Case and account information is retained while needed to provide the service or meet legitimate security and legal requirements. Account and case deletion controls will remove data from active BracketMotion systems subject to backups, provider retention rules and legal obligations.
      </p>

      <h2>8. Cookies and local storage</h2>
      <p>
        BracketMotion may use essential browser storage or cookies for login sessions, security and PWA functionality. The V1 service is not designed around third-party advertising cookies or cross-site advertising profiles.
      </p>

      <h2>9. Your choices</h2>
      <p>
        You may request access, correction or deletion of your BracketMotion account information, subject to applicable law and any records we are required to retain.
      </p>

      <h2>10. Changes and contact</h2>
      <p>
        We may update this policy as the product and legal requirements evolve. Material changes will be reflected by a new “Last updated” date. Questions may be sent to <a href="mailto:support@bracketmotion.com">support@bracketmotion.com</a>.
      </p>
    </LegalLayout>
  );
}

function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      intro="These Terms govern access to and use of BracketMotion. By creating an account, installing the PWA or using the service, you agree to these Terms."
    >
      <h2>1. What BracketMotion is</h2>
      <p>
        BracketMotion is orthodontic decision-support and visualization software for conventional fixed-appliance treatment. It may organize clinical information, generate clinician-reviewed treatment options, stage planned tooth movement and visualize orthodontic mechanics.
      </p>

      <h2>2. Professional use</h2>
      <p>
        BracketMotion is intended for qualified orthodontic or dental professionals and appropriately supervised trainees. It does not replace professional education, examination of the patient, radiographic interpretation, diagnosis, informed consent or clinical judgment.
      </p>

      <h2>3. Accounts and security</h2>
      <ul>
        <li>Provide accurate account information and keep login credentials secure.</li>
        <li>Do not share accounts in a way that defeats security or access controls.</li>
        <li>Notify us if you believe your account or stored cases have been accessed without permission.</li>
      </ul>

      <h2>4. Patient records</h2>
      <p>
        You retain responsibility for the patient records and clinical files you upload. You confirm that you have the right and lawful authority to process and disclose that information through BracketMotion. You grant BracketMotion only the limited permission necessary to host, process, display, back up and transmit those files to provide the service.
      </p>

      <h2>5. AI-assisted features</h2>
      <p>
        AI-generated summaries, treatment alternatives, reasoning and draft stages are suggestions for clinician review. They may be incomplete, incorrect or inappropriate for a specific patient. You must verify AI output before relying on it, and the clinician—not BracketMotion or an AI model—makes the treatment decision.
      </p>

      <h2>6. 3D treatment visualization</h2>
      <p>
        Planned positions, animations and mechanics-aware effects are visual decision-support tools. They are not a guarantee that teeth, roots, periodontal tissues or bone will respond exactly as displayed, and they are not a promise of treatment time or clinical outcome.
      </p>

      <h2>7. Acceptable use</h2>
      <p>You may not use BracketMotion to:</p>
      <ul>
        <li>Upload patient information without appropriate authority or permission.</li>
        <li>Use the service for unlawful, fraudulent or harmful activity.</li>
        <li>Upload malware, attack the service, bypass security or access another user's data.</li>
        <li>Scrape, resell, copy or redistribute substantial portions of the software or proprietary content without permission.</li>
        <li>Misrepresent BracketMotion output as autonomous medical advice or a guaranteed biological prediction.</li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>
        BracketMotion owns or licenses the software, interface, branding, internally authored rules and original content that make up the service. You retain ownership of your uploaded case content. Third-party software, publications, trademarks and open-source components remain the property of their respective owners and are governed by their applicable licenses. Its optional cephalometric tracing feature includes the <a href="https://huggingface.co/nlm-dir/CephViT" target="_blank" rel="noreferrer">CephViT</a> research model by Hou and colleagues (NIH/NLM research), distributed under OpenMDW 1.1; attribution does not imply NIH endorsement.
      </p>

      <h2>9. Free service and changes</h2>
      <p>
        The initial BracketMotion version is provided free of charge. Features, storage limits, supported formats and availability may change as the product develops. We may modify, suspend or discontinue features when reasonably necessary for security, maintenance, clinical safety or product development.
      </p>

      <h2>10. Suspension or termination</h2>
      <p>
        We may suspend or terminate access for serious misuse, security threats, unlawful activity or material violation of these Terms. You may stop using BracketMotion and request deletion of your account subject to the Privacy Policy.
      </p>

      <h2>11. Availability and warranties</h2>
      <p>
        BracketMotion is provided on an “as is” and “as available” basis to the fullest extent permitted by law. We do not promise uninterrupted availability, error-free operation, complete clinical information or a particular treatment result.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, BracketMotion and its operators are not liable for indirect, incidental, special or consequential losses arising from use of the service, treatment decisions, loss of data, interruption of service or reliance on unverified software or AI output. Nothing in these Terms excludes liability that cannot legally be excluded.
      </p>

      <h2>13. Privacy and updates</h2>
      <p>
        Use of BracketMotion is also governed by our <a href="/privacy">Privacy Policy</a> and <a href="/clinical-disclaimer">Clinical Disclaimer</a>. We may update these Terms as the service develops. Continued use after an updated version takes effect means you accept the revised Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms may be sent to <a href="mailto:support@bracketmotion.com">support@bracketmotion.com</a>.
      </p>
    </LegalLayout>
  );
}

function ClinicalDisclaimerPage() {
  return (
    <LegalLayout
      title="Clinical Disclaimer"
      intro="BracketMotion is designed to support orthodontic professionals. It is not an autonomous clinician, and its outputs must always be reviewed in the context of the actual patient."
    >
      <h2>1. Clinical decision support, not replacement</h2>
      <p>
        BracketMotion may help organize diagnostic information, compare treatment strategies, suggest staging and visualize mechanics. The treating clinician remains responsible for diagnosis, treatment objectives, appliance selection, force systems, monitoring, modifications, patient communication and final clinical decisions.
      </p>

      <h2>2. Planned movement is not biological prediction</h2>
      <p>
        The 3D viewer represents planned tooth positions and mechanics-aware movement tendencies. It does not claim to reproduce the complete periodontal ligament, alveolar bone, root morphology, friction, patient compliance or individual biologic response. A displayed movement must not be interpreted as a guarantee that the patient will move by that amount, in that direction, or within a particular time.
      </p>

      <h2>3. AI limitations</h2>
      <p>
        AI-assisted outputs can contain errors, omissions or unsuitable suggestions. BracketMotion restricts AI to a clinician-reviewed decision-support role, but no control system eliminates every error. Do not approve a treatment strategy solely because the software generated it. Automatic cephalometric points and calculated angles depend on image quality and detected landmarks. The treating clinician must correct the positions and review the measurements before accepting them; the research model is not independently cleared as an autonomous diagnostic device.
      </p>

      <h2>4. Clinical records remain essential</h2>
      <p>
        Treatment decisions should be based on an adequate clinical examination and appropriate records. BracketMotion cannot detect every pathology, periodontal limitation, root condition, growth issue, compliance factor or other circumstance that may change treatment.
      </p>

      <h2>5. Sources and references</h2>
      <p>
        BracketMotion's internally authored clinical and mechanics rules are informed by established orthodontic references, including <em>Contemporary Orthodontics</em>, selected peer-reviewed literature and other appropriately reviewed sources. Reference to a textbook, author, publisher, product or company does not imply sponsorship, affiliation or endorsement, and BracketMotion does not redistribute copyrighted textbooks as part of its public knowledge base.
      </p>

      <h2>6. Generic appliances and third-party brands</h2>
      <p>
        Brackets, wires, chains, coils, elastics and other components shown by BracketMotion are generic unless explicitly identified otherwise. Third-party names and trademarks belong to their owners. A visual resemblance to a commercial product does not mean that company sponsors or approves BracketMotion.
      </p>

      <h2>7. Regulatory status</h2>
      <p>
        Unless BracketMotion explicitly states otherwise for a particular released version and jurisdiction, do not assume the service has received regulatory clearance or approval as an autonomous diagnostic system, autonomous treatment planner or substitute for professional orthodontic judgment.
      </p>

      <h2>8. Emergency or urgent care</h2>
      <p>
        BracketMotion is not an emergency service and must not be used to delay urgent examination or treatment. Clinical emergencies and unexpected patient findings require direct professional assessment.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about the intended clinical role of BracketMotion may be sent to <a href="mailto:support@bracketmotion.com">support@bracketmotion.com</a>.
      </p>
    </LegalLayout>
  );
}

function NotFoundPage() {
  return (
    <>
      <main className="legal-page">
        <div className="container legal-content">
          <div className="legal-header">
            <p className="section-kicker">BracketMotion</p>
            <h1>Page not found.</h1>
            <p className="legal-updated"><a href="/">Return to BracketMotion</a></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function RoutedPage() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return <HomePage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  if (path === "/clinical-disclaimer") return <ClinicalDisclaimerPage />;
  return <NotFoundPage />;
}

function AppRoutes() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/app") {
    return <ClinicalAppPage />;
  }

  return (
    <div className="site-shell">
      <Header />
      <RoutedPage />
    </div>
  );
}

export default function App() {
  return (
    <PwaInstallProvider>
      <AppRoutes />
    </PwaInstallProvider>
  );
}
