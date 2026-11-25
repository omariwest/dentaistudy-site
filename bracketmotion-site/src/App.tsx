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
import type {
  ScanPersistenceState,
  StageAiReviewResult,
  StagePersistenceState,
} from "./ScanWorkflow";
import {
  createBracketMotionCase,
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
          <span className="wordmark__text">BracketMotion</span>
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
            <span className="wordmark__text">BracketMotion</span>
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
  { label: "Case", title: "Case Presentation", detail: "Clinical records" },
  { label: "Findings", title: "Diagnosis", detail: "Clinical findings" },
  { label: "Plan", title: "Treatment Plans", detail: "Clinical strategy" },
  { label: "Setup", title: "3D Setup", detail: "Current scan-based workspace" },
  { label: "Stages", title: "Mechanics", detail: "Approved setup and stages" },
] as const;

type ClinicalSection = (typeof clinicalFlow)[number]["label"];
type RecordKey = "history" | "exam" | "scans" | "photos" | "pano" | "ceph" | "cephSummary";

type PhotoKey = "frontal" | "upperOcclusal" | "lowerOcclusal" | "rightBuccal" | "leftBuccal" | "faceFront" | "smile" | "profile" | "pano" | "ceph";
type CasePhoto = { name: string; file: File; previewUrl: string };

const intraoralPhotoSlots: Array<{ key: PhotoKey; title: string }> = [
  { key: "frontal", title: "Frontal" },
  { key: "upperOcclusal", title: "Upper occlusal" },
  { key: "lowerOcclusal", title: "Lower occlusal" },
  { key: "rightBuccal", title: "Right buccal" },
  { key: "leftBuccal", title: "Left buccal" },
];
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

const defaultCaseDetails: CaseDetailsState = {
  age: "24",
  sex: "Not specified",
  patientStage: "Adult",
  growthStatus: "Adult",
  chiefComplaint: "Improve alignment and bite.",
  medicalHistory: "No relevant medical-history flags reported.",
  dentalHistory: "No previous orthodontic treatment.",
  notes: "None reported.",
};

const emptyCaseDetails: CaseDetailsState = {
  age: "",
  sex: "Not specified",
  patientStage: "Not specified",
  growthStatus: "Uncertain",
  chiefComplaint: "",
  medicalHistory: "",
  dentalHistory: "",
  notes: "",
};

const defaultFindings: FindingsState = {
  oralHygiene: "Acceptable",
  periodontalStatus: "Healthy",
  activeCaries: "No",
  restorativeConsiderations: "None",
  missingTeeth: "None",
  impactedTeeth: "None",
  unsuitableTeeth: "None",
  profile: "Straight",
  lipCompetence: "Competent",
  facialVerticalPattern: "Average",
  facialAsymmetry: "None",
  smileConcern: "None",
  molarRight: "Class I",
  molarLeft: "Class I",
  canineRight: "Class I",
  canineLeft: "Class I",
  overjet: "4",
  overbite: "45",
  maxillaryCrowding: "-3",
  mandibularCrowding: "-4",
  upperMidline: "Coincident",
  lowerMidline: "1 mm left",
  midlineDiscrepancy: "1",
  curveOfSpee: "Mild",
  crossbite: "None",
  scissorBite: "None",
  rotations: "Mild lower anterior rotations.",
  skeletalAp: "Class I",
  skeletalVertical: "Average",
  maxillaryIncisors: "Normal",
  mandibularIncisors: "Normal",
  cephConcern: "None",
};

const emptyFindings: FindingsState = Object.fromEntries(
  Object.keys(defaultFindings).map((key) => [key, ""]),
) as FindingsState;

const demoRecords: Record<RecordKey, boolean> = {
  history: true,
  exam: true,
  scans: true,
  photos: true,
  pano: false,
  ceph: false,
  cephSummary: true,
};

const emptyRecords: Record<RecordKey, boolean> = {
  history: false,
  exam: false,
  scans: false,
  photos: false,
  pano: false,
  ceph: false,
  cephSummary: false,
};

type TreatmentOption = {
  title: string;
  aims: string;
  mechanics: string;
  checks: string;
};

const emptyTreatmentOptions = (): TreatmentOption[] =>
  Array.from({ length: 3 }, () => ({ title: "", aims: "", mechanics: "", checks: "" }));

const demoPlan: TreatmentPlanState = {
  problemList:
    "Mild maxillary crowding; moderate mandibular crowding; mild lower anterior rotations; 4 mm overjet; 45% overbite.",
  goals:
    "Resolve crowding and rotations; coordinate the arches; maintain a Class I molar/canine relationship; normalize overjet and overbite while preserving facial balance.",
  primaryStrategy:
    "Non-extraction fixed-appliance treatment. Align and level both arches with progressive NiTi wires, coordinate arch form, then finish on stainless steel with controlled settling as needed.",
  alternativeStrategy:
    "Consider limited space creation if alignment cannot be achieved within the approved arch-form and incisor-position goals. Reassess space requirements before progressing beyond alignment.",
  options: emptyTreatmentOptions(),
  selectedOption: null,
  informationGaps: "",
};

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

type StoredRecordsState = {
  checklist?: Partial<Record<RecordKey, boolean>>;
  details?: Partial<CaseDetailsState>;
  findings?: Partial<FindingsState>;
  diagnosis?: Partial<DiagnosisState>;
};

const viewerViews = ["Front", "Right", "Left", "Upper", "Lower"];

const requiredRecords: Array<{ key: RecordKey; title: string; detail: string }> = [
  { key: "history", title: "History + chief complaint", detail: "Medical, dental and treatment history" },
  { key: "exam", title: "Clinical examination", detail: "Periodontal, facial and occlusal findings" },
  { key: "scans", title: "Upper + lower scans", detail: "STL/PLY with correct bite relationship" },
  { key: "photos", title: "Clinical photographs", detail: "Five intraoral photographs" },
  { key: "pano", title: "Panoramic radiograph", detail: "Required for planning-ready status" },
  { key: "ceph", title: "Lateral cephalogram", detail: "Required for planning-ready status" },
  { key: "cephSummary", title: "Cephalometric summary", detail: "Clinician-entered categorical summary" },
];

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

function RecordStatus({
  complete,
  onAdd,
}: {
  complete: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="record-status">
      <span className={`record-status__pill${complete ? " is-complete" : ""}`}>
        {complete ? "Complete" : "Missing"}
      </span>
      {!complete && (
        <button className="record-status__action" type="button" onClick={onAdd}>
          Add
        </button>
      )}
    </div>
  );
}

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
          <span>Planning status</span>
          <strong>Out of V1 scope</strong>
        </div>
        <p>{scopeIssue} is outside the frozen BracketMotion V1 boundary. Treatment-plan generation is blocked.</p>
      </div>
    );
  }

  return (
    <div className={`readiness-card${planningReady ? " is-ready" : ""}`} role="status">
      <div>
        <span>Planning status</span>
        <strong>{planningReady ? "Planning ready" : "Draft case"}</strong>
      </div>
      <p>
        {planningReady
          ? "All mandatory Gate 2 records are present. The case can move to treatment planning."
          : `${missingCount} required record${missingCount === 1 ? "" : "s"} missing. Planning remains locked.`}
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
  records,
  onCompleteRecord,
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
  records: Record<RecordKey, boolean>;
  onCompleteRecord: (key: RecordKey) => void;
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
          <h1>Case Presentation</h1>
        </div>
        <button className="app-primary-action case-page-primary" type="button" onClick={onOpenFindings}>
          Continue to Diagnosis
        </button>
      </div>

      <ReadinessCard
        planningReady={planningReady}
        missingCount={missingCount}
        scopeIssue={scopeIssue}
      />

      <section className="case-section" aria-labelledby="case-details-title">
        <div className="case-section__heading">
          <div><h2 id="case-details-title">Patient and clinical history</h2></div>
        </div>
        <div className="case-form-grid">
          <label>
            <span>Patient label / case ID</span>
            <input value={caseLabel} onChange={(event) => onCaseLabel(event.target.value)} type="text" />
          </label>
          <label>
            <span>Age at records</span>
            <input
              value={caseDetails.age}
              min="12"
              type="number"
              onChange={(event) => onCaseDetail("age", event.target.value)}
            />
          </label>
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
        <p className="case-photo-note">JPG, PNG or WebP, up to 12 MB each. Images stay in this browser tab; they are not saved to your case yet.</p>
        {photoError && <p className="case-photo-error" role="alert">{photoError}</p>}
      </section>

      <section className="case-section" aria-labelledby="facial-photos-title">
        <div className="case-section__heading">
          <div><h2 id="facial-photos-title">Facial photographs</h2></div>
          <span className="case-photo-count">Additional records</span>
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

      <section className="case-section" aria-labelledby="required-records-title">
        <div className="case-section__heading">
          <div><h2 id="required-records-title">Other clinical records</h2></div>
        </div>
        <div className="record-list">
          {requiredRecords.filter((record) => !["photos", "pano", "ceph"].includes(record.key)).map((record) => (
            <div className="record-row" key={record.key}>
              <div className="record-row__copy">
                <strong>{record.title}</strong>
                <span>{record.detail}</span>
              </div>
              <RecordStatus complete={records[record.key]} onAdd={() => onCompleteRecord(record.key)} />
            </div>
          ))}
        </div>
      </section>
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

        <div className="ai-review-gate">
          <div>
            <strong>AI-assisted draft</strong>
            <p>Generate from entered case details and findings; images are not sent.</p>
          </div>
          <button
            className="ai-review-button"
            type="button"
            disabled={diagnosisLoading || (sessionActive && !planningReady)}
            onClick={sessionActive ? onGenerateDiagnosis : onSignIn}
          >
            {!sessionActive ? "Sign in to generate" : diagnosisLoading ? "Generating…" : "Generate AI draft"}
          </button>
        </div>
        {diagnosisError && <div className="ai-review-error" role="alert">{diagnosisError}</div>}

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
            <div className="field-with-unit"><input value={findings.overjet} onChange={(event) => onFindingChange("overjet", event.target.value)} type="number" /><small>mm</small></div>
          </label>
          <label>
            <span>Overbite</span>
            <div className="field-with-unit"><input value={findings.overbite} onChange={(event) => onFindingChange("overbite", event.target.value)} type="number" /><small>%</small></div>
          </label>
          <label>
            <span>Maxillary crowding / spacing</span>
            <div className="field-with-unit"><input value={findings.maxillaryCrowding} onChange={(event) => onFindingChange("maxillaryCrowding", event.target.value)} type="number" /><small>mm</small></div>
          </label>
          <label>
            <span>Mandibular crowding / spacing</span>
            <div className="field-with-unit"><input value={findings.mandibularCrowding} onChange={(event) => onFindingChange("mandibularCrowding", event.target.value)} type="number" /><small>mm</small></div>
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
            <div className="field-with-unit"><input value={findings.midlineDiscrepancy} onChange={(event) => onFindingChange("midlineDiscrepancy", event.target.value)} type="number" /><small>mm</small></div>
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

      <section className="case-section" aria-labelledby="ceph-title">
        <div className="case-section__heading">
          <div>
            <h2 id="ceph-title">Cephalometric summary</h2>
          </div>
        </div>

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
              : "Complete the required clinical records in Case Presentation and Diagnosis."}
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
            <h2 id="ai-treatment-suggestions">Three editable treatment suggestions</h2>
          </div>
          <span className={"ai-review-status" + (planApproved ? " is-ready" : "")}>
            {planApproved ? "Approved" : "Draft"}
          </span>
        </div>
        <div className="ai-review-gate">
          <div>
            <strong>{suggestionsLoading ? "Generating suggestions…" : "Prepare treatment options"}</strong>
            <p>Uses entered clinical findings and approved diagnosis, not the uploaded images.</p>
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

      <div className="plan-strategy-grid" aria-label="Treatment suggestion options">
        {plan.options.map((option, index) => {
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

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setPassword("");
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
          <div>
            <span>DentAIstudy account</span>
            <h2 id="auth-dialog-title">
              {session ? "Account" : mode === "login" ? "Sign in to BracketMotion" : "Create your account"}
            </h2>
          </div>
          <button type="button" autoFocus aria-label="Close account dialog" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {session ? (
          <div className="auth-dialog__account">
            <div>
              <span>Signed in as</span>
              <strong>{session.user.email || "DentAIstudy user"}</strong>
            </div>
            <p>Your saved BracketMotion cases are private to this Supabase account.</p>
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
            <p>
              Use the same account as DentAIstudy. Saved cases and clinical AI calls
              stay tied to your authenticated user ID.
            </p>

            {mode === "signup" && (
              <label>
                <span>Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
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
                required
                type="email"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
                type="password"
              />
            </label>

            {message && <div className="auth-dialog__message">{message}</div>}

            <button className="app-primary-action" type="submit" disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>

            <button
              className="auth-dialog__switch"
              type="button"
              onClick={() => setMode((current) => current === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Need an account? Create one"
                : "Already have an account? Sign in"}
            </button>
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

function ClinicalAppPage() {
  const [activeSection, setActiveSection] = useState<ClinicalSection>("Case");
  const [showCaseHub, setShowCaseHub] = useState(false);
  const [session, setSession] = useState<BracketMotionSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [savedCases, setSavedCases] = useState<BracketMotionCaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseLabel, setCaseLabel] = useState("Demo Case");
  const [caseDetails, setCaseDetails] = useState<CaseDetailsState>(defaultCaseDetails);
  const [findings, setFindings] = useState<FindingsState>(defaultFindings);
  const [diagnosis, setDiagnosis] = useState<DiagnosisState>(emptyDiagnosis);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const diagnosisRequestRef = useRef(0);
  const [scopeIssue, setScopeIssue] = useState("");
  const [planApproved, setPlanApproved] = useState(false);
  const [setupApproved, setSetupApproved] = useState(false);
  const [plan, setPlan] = useState<TreatmentPlanState>(demoPlan);
  const [records, setRecords] = useState<Record<RecordKey, boolean>>(demoRecords);
  const [photos, setPhotos] = useState<Partial<Record<PhotoKey, CasePhoto>>>({});
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
  const skipNextAutosaveRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const online = useOnlineStatus();

  const visibleRecords: Record<RecordKey, boolean> = {
    ...records,
    photos: intraoralPhotoSlots.every((slot) => Boolean(photos[slot.key])),
    pano: Boolean(photos.pano),
    ceph: Boolean(photos.ceph),
  };
  const missingCount = requiredRecords.filter((record) => !visibleRecords[record.key]).length;
  const planningReady = missingCount === 0 && !scopeIssue;
  const userId = session?.user.id ?? null;
  const accountInitial = (
    String(session?.user.user_metadata?.full_name || session?.user.email || "A")
      .trim()
      .charAt(0) || "A"
  ).toUpperCase();

  const cancelSuggestions = useCallback(() => {
    suggestionRequestRef.current += 1;
    setSuggestionsLoading(false);
  }, []);

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
    setPhotoError("");
  }, [cancelSuggestions]);

  const refreshCases = useCallback(async () => {
    if (!userId) {
      setSavedCases([]);
      return;
    }

    if (!online) {
      setCaseError("You are offline. Reconnect to load saved cases.");
      return;
    }

    setCasesLoading(true);
    setCaseError("");

    try {
      setSavedCases(await listBracketMotionCases());
    } catch {
      setCaseError("Saved cases could not be loaded.");
    } finally {
      setCasesLoading(false);
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

    if (!userId) {
      setSavedCases([]);

      if (previousUserId) {
        setCaseId(null);
        setCaseLabel("Demo Case");
        setCaseDetails(defaultCaseDetails);
        setFindings(defaultFindings);
        setDiagnosis(emptyDiagnosis);
        diagnosisRequestRef.current += 1;
        setDiagnosisLoading(false);
        setDiagnosisError("");
        setRecords(demoRecords);
        setScopeIssue("");
        setPlan(demoPlan);
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
    setPhotoError("");
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
    cancelSuggestions();
    setStageAiReview(null);
  };

  const completeRecord = (key: RecordKey) => {
    if (key === "photos" || key === "pano" || key === "ceph") return;
    setRecords((current) => ({ ...current, [key]: true }));
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
  };

  const updateCaseDetail = (field: keyof CaseDetailsState, value: string) => {
    setCaseDetails((current) => ({ ...current, [field]: value }));
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
  };

  const updateFinding = (field: keyof FindingsState, value: string) => {
    setFindings((current) => ({ ...current, [field]: value }));
    setDiagnosis((current) => ({ ...current, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
  };

  const updateDiagnosis = (field: "summary" | "interpretation" | "informationGaps", value: string) => {
    setDiagnosis((current) => ({ ...current, [field]: value, approved: false }));
    diagnosisRequestRef.current += 1;
    setDiagnosisLoading(false);
    setPlanApproved(false);
    setSetupApproved(false);
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

  const openDemoCase = () => {
    clearLocalPhotos();
    setCaseId(null);
    setCaseLabel("Demo Case");
    setCaseDetails(defaultCaseDetails);
    setFindings(defaultFindings);
    setDiagnosis(emptyDiagnosis);
    setDiagnosisLoading(false);
    setDiagnosisError("");
    setScopeIssue("");
    setPlanApproved(false);
    setSetupApproved(false);
    setPlan(demoPlan);
    setRecords(demoRecords);
    setScanState(null);
    setStageState(null);
    cancelSuggestions();
    setSuggestionsError("");
    setStageAiReview(null);
    setStageAiReviewError("");
    setSaveState("local");
    setShowCaseHub(false);
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
    setRecords({ ...emptyRecords, ...(storedRecords.checklist || {}) });
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
      applySavedCase(await loadBracketMotionCase(savedCaseId));
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
          checklist: records,
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
    records,
    scanState,
    scopeIssue,
    online,
    session,
    setupApproved,
    stageState,
  ]);

  const buildAiPayload = (mode: AiReviewMode) => {
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
          `Overjet: ${findings.overjet} mm`,
          `Overbite: ${findings.overbite}%`,
          `Maxillary crowding/spacing: ${findings.maxillaryCrowding} mm`,
          `Mandibular crowding/spacing: ${findings.mandibularCrowding} mm`,
          `Upper midline: ${findings.upperMidline}`,
          `Lower midline: ${findings.lowerMidline}`,
          `Interarch midline discrepancy: ${findings.midlineDiscrepancy} mm`,
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
        power_chain: scanState?.applianceLayers.powerChain === true,
        closed_coil: scanState?.applianceLayers.coilSpring === true,
        interarch_elastics: scanState?.applianceLayers.elastics === true,
        closing_loop: scanState?.applianceLayers.closingLoop === true,
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
      setDiagnosisError("Complete the required clinical records first.");
      return;
    }
    const request = ++diagnosisRequestRef.current;
    setDiagnosisLoading(true);
    setDiagnosisError("");

    try {
      const result = await invokeBracketMotionClinicalReview({
        ...buildAiPayload("diagnosis_draft"),
        plan: {},
        setup: {},
        mechanics: {},
      });
      if (request !== diagnosisRequestRef.current) return;
      const review = result?.review as ClinicalAiReviewResult | undefined;
      const summary = typeof review?.case_summary === "string" ? review.case_summary.trim() : "";
      const interpretation = typeof review?.clinical_assessment === "string" ? review.clinical_assessment.trim() : "";
      if (!summary || !interpretation) throw new Error("AI_EMPTY_DIAGNOSIS");

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
        setDiagnosisError("The draft could not be generated. Your entered findings remain unchanged.");
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

  const runStageAiReview = async () => {
    if (!session) {
      setAccountOpen(true);
      return;
    }

    if (!online) {
      setStageAiReviewError("Reconnect to run the mechanics review.");
      return;
    }

    setStageAiReviewLoading(true);
    setStageAiReviewError("");

    try {
      const data = await invokeBracketMotionClinicalReview(
        buildAiPayload("stage_review"),
      );
      setStageAiReview((data?.review || null) as StageAiReviewResult | null);
    } catch {
      setStageAiReviewError(
        "The mechanics review could not be generated. Your stages and approvals were not changed.",
      );
    } finally {
      setStageAiReviewLoading(false);
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
    !showCaseHub && (activeSection === "Setup" || activeSection === "Stages");

  return (
    <main className="clinical-app">
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <a className="wordmark app-wordmark" href="/" aria-label="BracketMotion home">
            <span className="wordmark__text">BracketMotion</span>
          </a>
          <span className="app-topbar__divider" aria-hidden="true" />
          <div className="app-case-title">
            <strong>{caseLabel}</strong>
            <span>Permanent dentition · {planningReady ? "Planning ready" : "Draft"}</span>
          </div>
        </div>

        <div className="app-topbar__actions">
          <span
            className={`app-save-state${saveState === "error" || !online ? " is-error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveLabel}
          </span>
          <button
            className="app-quiet-button"
            type="button"
            onClick={() => {
              setShowCaseHub(true);
              if (session) void refreshCases();
            }}
          >
            Cases
          </button>
          <button
            className="app-account-button"
            type="button"
            aria-label={session ? "Account" : "Sign in"}
            onClick={() => setAccountOpen(true)}
          >
            {session ? accountInitial : "A"}
          </button>
        </div>
      </header>

      {!online && (
        <div className="app-offline-banner" role="status">
          Offline — local work stays in this tab, but saved cases, uploads and AI
          review need a connection.
        </div>
      )}

      <nav className="app-flow-nav" aria-label="Case workflow">
        {clinicalFlow.map((item, index) => (
          <button
            className={`app-flow-item${activeSection === item.label && !showCaseHub ? " is-active" : ""}`}
            type="button"
            key={item.label}
            title={item.detail}
            aria-current={activeSection === item.label && !showCaseHub ? "step" : undefined}
            onClick={() => openSection(item.label)}
          >
            <span className="app-flow-item__index">{String(index + 1)}.</span>
            <span className="app-flow-item__copy">
              <strong>{item.title}</strong>
            </span>
          </button>
        ))}
      </nav>

      <div className={`clinical-app__body${has3dWorkspace ? " is-3d-workspace" : ""}`}>
        <section className={`app-workspace${has3dWorkspace ? " is-3d-workspace" : ""}${activeSection === "Case" || activeSection === "Findings" || showCaseHub ? " is-clinical-form" : ""}`}>

          {showCaseHub ? (
            <div className="case-hub">
              <div className="case-workflow-page__header">
                <div>
                  <span className="case-page-kicker">Cases</span>
                  <h1>Open or create a case.</h1>
                </div>
                <button
                  className="app-primary-action case-page-primary"
                  type="button"
                  onClick={startNewCase}
                  disabled={casesLoading || (Boolean(session) && !online)}
                >
                  {session ? (online ? "New case" : "Offline") : "Sign in to save"}
                </button>
              </div>

              {caseError && <div className="case-hub__message is-error">{caseError}</div>}

              <button
                className="case-card"
                type="button"
                onClick={openDemoCase}
              >
                <div>
                  <span>Demo Case</span>
                  <strong>Local example · not saved</strong>
                </div>
                <div className="case-card__status">
                  <span>Demo</span>
                </div>
              </button>

              {!authReady && (
                <div className="case-hub__message">Checking your account…</div>
              )}

              {authReady && !session && (
                <button
                  className="case-signin-card"
                  type="button"
                  onClick={() => setAccountOpen(true)}
                >
                  <strong>Sign in with your DentAIstudy account</strong>
                  <span>Enable private case storage, autosave and clinical AI review.</span>
                </button>
              )}

              {session && casesLoading && (
                <div className="case-hub__message">Loading saved cases…</div>
              )}

              {session &&
                savedCases.map((savedCase) => (
                  <button
                    className={`case-card${caseId === savedCase.id ? " is-current" : ""}`}
                    type="button"
                    onClick={() => void openSavedCase(savedCase.id)}
                    key={savedCase.id}
                  >
                    <div>
                      <span>{savedCase.label}</span>
                      <strong>
                        {savedCase.setup_approved
                          ? "3D setup approved"
                          : savedCase.plan_approved
                            ? "Clinical plan approved"
                            : "Draft"}
                      </strong>
                    </div>
                    <div className="case-card__status">
                      <span>
                        {new Date(savedCase.updated_at).toLocaleDateString()}
                      </span>
                        </div>
                  </button>
                ))}

              {session && !casesLoading && savedCases.length === 0 && (
                <div className="case-hub__message">
                  No saved cases yet. Create your first case above.
                </div>
              )}
            </div>
          ) : activeSection === "Case" ? (
            <CaseRecordsView
              caseLabel={caseLabel}
              onCaseLabel={setCaseLabel}
              caseDetails={caseDetails}
              onCaseDetail={updateCaseDetail}
              records={visibleRecords}
              onCompleteRecord={completeRecord}
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
              }}
              findings={findings}
              onFindingChange={updateFinding}
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

        {!has3dWorkspace && (
          <aside className="app-inspector" aria-label="Case inspector">
            <div className="app-inspector__header">
              <div>
                <span>{showCaseHub ? "Cases" : activeSection} status</span>
                <strong>{scopeIssue ? "Planning blocked" : planningReady ? "Planning ready" : "Draft case"}</strong>
              </div>
            </div>

            <div className="app-inspector__section app-inspector__section--compact">
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
                disabled={!planningReady}
                onClick={() =>
                  setActiveSection(
                    !planApproved ? "Plan" : setupApproved ? "Stages" : "Setup",
                  )
                }
              >
                {!planningReady
                  ? "Complete required records"
                  : !planApproved
                    ? "Review clinical plan"
                    : setupApproved
                      ? "Continue to stages"
                      : "Continue to 3D setup"}
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
            <p className="legal-updated">Last updated: 22 November 2026</p>
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
        <li><strong>AI inputs and outputs:</strong> structured case information sent for treatment-planning assistance and the responses returned to the application.</li>
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
        BracketMotion owns or licenses the software, interface, branding, internally authored rules and original content that make up the service. You retain ownership of your uploaded case content. Third-party software, publications, trademarks and open-source components remain the property of their respective owners and are governed by their applicable licenses.
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
        AI-assisted outputs can contain errors, omissions or unsuitable suggestions. BracketMotion restricts AI to a clinician-reviewed decision-support role, but no control system eliminates every error. Do not approve a treatment strategy solely because the software generated it.
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
