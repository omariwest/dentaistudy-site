import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClinicalViewerHandle } from "./ClinicalViewer";
import type {
  ScanPersistenceState,
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

function Header() {
  return (
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
  );
}

function Footer() {
  return (
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
  );
}

const workflowSteps = [
  { number: "01", title: "Case", text: "Bring the patient's records and 3D dentition into one workspace." },
  { number: "02", title: "Plan", text: "Compare a primary treatment strategy with a clear alternative." },
  { number: "03", title: "Mechanics", text: "Choose the fixed-appliance mechanics that carry the plan." },
  { number: "04", title: "Movement", text: "See the planned stages unfold on the patient's own dentition." },
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
  { label: "Case", detail: "Records" },
  { label: "Findings", detail: "Review" },
  { label: "Plan", detail: "Strategies" },
  { label: "Setup", detail: "3D target" },
  { label: "Stages", detail: "Mechanics" },
] as const;

type ClinicalSection = (typeof clinicalFlow)[number]["label"];
type RecordKey = "history" | "exam" | "scans" | "photos" | "pano" | "ceph" | "cephSummary";

type CaseDetailsState = {
  age: string;
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
  patientStage: "Adult",
  growthStatus: "Adult",
  chiefComplaint: "Improve alignment and bite.",
  medicalHistory: "No relevant medical-history flags reported.",
  dentalHistory: "No previous orthodontic treatment.",
  notes: "None reported.",
};

const emptyCaseDetails: CaseDetailsState = {
  age: "",
  patientStage: "Adult",
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

const emptyFindings: FindingsState = {
  ...defaultFindings,
  missingTeeth: "",
  impactedTeeth: "",
  unsuitableTeeth: "",
  smileConcern: "",
  overjet: "",
  overbite: "",
  maxillaryCrowding: "",
  mandibularCrowding: "",
  upperMidline: "",
  lowerMidline: "",
  midlineDiscrepancy: "",
  crossbite: "",
  scissorBite: "",
  rotations: "",
  cephConcern: "",
};

const viewerLayers = ["Initial", "Planned", "Upper", "Lower", "Gingiva", "Brackets", "Wire"];
const viewerViews = ["Front", "Right", "Left", "Upper", "Lower"];
const demoStages = ["Initial", "Alignment", "Leveling", "Space", "Finishing", "Final"];

const requiredRecords: Array<{ key: RecordKey; title: string; detail: string }> = [
  { key: "history", title: "History + chief complaint", detail: "Medical, dental and treatment history" },
  { key: "exam", title: "Clinical examination", detail: "Periodontal, facial and occlusal findings" },
  { key: "scans", title: "Upper + lower scans", detail: "STL/PLY with correct bite relationship" },
  { key: "photos", title: "Clinical photographs", detail: "3 facial + 5 intraoral minimum" },
  { key: "pano", title: "Panoramic radiograph", detail: "Required for planning-ready status" },
  { key: "ceph", title: "Lateral cephalogram", detail: "Required for planning-ready status" },
  { key: "cephSummary", title: "Cephalometric summary", detail: "Clinician-entered categorical summary" },
];

const outOfScopeOptions = [
  "Class III correction",
  "Orthognathic surgery",
  "TAD/miniscrew-supported mechanics",
  "Expansion / MARPE",
  "Impacted-tooth traction",
];

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

function CaseRecordsView({
  caseLabel,
  onCaseLabel,
  caseDetails,
  onCaseDetail,
  records,
  onCompleteRecord,
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
  planningReady: boolean;
  missingCount: number;
  scopeIssue: string;
  onOpenFindings: () => void;
}) {
  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div>
          <span className="case-page-kicker">Case records</span>
          <h1>Build a planning-ready case.</h1>
          <p>Only the records BracketMotion needs for the frozen V1 workflow are collected here.</p>
        </div>
        <button className="app-primary-action case-page-primary" type="button" onClick={onOpenFindings}>
          Review findings
        </button>
      </div>

      <ReadinessCard
        planningReady={planningReady}
        missingCount={missingCount}
        scopeIssue={scopeIssue}
      />

      <section className="case-section" aria-labelledby="case-details-title">
        <div className="case-section__heading">
          <div>
            <span>01</span>
            <h2 id="case-details-title">Case details</h2>
          </div>
          <p>Use a patient label rather than unnecessary identifiers.</p>
        </div>

        <div className="case-form-grid">
          <label>
            <span>Case label</span>
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
            <span>Patient stage</span>
            <select
              value={caseDetails.patientStage}
              onChange={(event) => onCaseDetail("patientStage", event.target.value)}
            >
              <option>Adult</option>
              <option>Adolescent</option>
            </select>
          </label>
          <label>
            <span>Growth status</span>
            <select
              value={caseDetails.growthStatus}
              onChange={(event) => onCaseDetail("growthStatus", event.target.value)}
            >
              <option>Adult</option>
              <option>Prepubertal</option>
              <option>Pubertal</option>
              <option>Postpubertal</option>
              <option>Uncertain</option>
            </select>
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
            <span>Relevant medical history</span>
            <input
              value={caseDetails.medicalHistory}
              type="text"
              onChange={(event) => onCaseDetail("medicalHistory", event.target.value)}
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Relevant dental / previous orthodontic history</span>
            <input
              value={caseDetails.dentalHistory}
              type="text"
              onChange={(event) => onCaseDetail("dentalHistory", event.target.value)}
            />
          </label>
          <label className="case-form-grid__wide">
            <span>Allergies / material considerations / clinician notes</span>
            <input
              value={caseDetails.notes}
              type="text"
              onChange={(event) => onCaseDetail("notes", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="case-section" aria-labelledby="required-records-title">
        <div className="case-section__heading">
          <div>
            <span>02</span>
            <h2 id="required-records-title">Required records</h2>
          </div>
          <p>Planning is blocked until every mandatory group is complete.</p>
        </div>

        <div className="record-list">
          {requiredRecords.map((record) => (
            <div className="record-row" key={record.key}>
              <div className="record-row__copy">
                <strong>{record.title}</strong>
                <span>{record.detail}</span>
              </div>
              <RecordStatus
                complete={records[record.key]}
                onAdd={() => onCompleteRecord(record.key)}
              />
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
  planningReady,
  missingCount,
  onBackToCase,
}: {
  scopeIssue: string;
  onScopeIssue: (value: string) => void;
  findings: FindingsState;
  onFindingChange: (field: keyof FindingsState, value: string) => void;
  planningReady: boolean;
  missingCount: number;
  onBackToCase: () => void;
}) {
  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div>
          <span className="case-page-kicker">Clinician-confirmed findings</span>
          <h1>Review the clinical source of truth.</h1>
          <p>BracketMotion reasons from these findings. It does not silently replace them with AI inference.</p>
        </div>
        <button className="app-quiet-button case-page-secondary" type="button" onClick={onBackToCase}>
          Back to records
        </button>
      </div>

      <ReadinessCard
        planningReady={planningReady}
        missingCount={missingCount}
        scopeIssue={scopeIssue}
      />

      <section className="case-section" aria-labelledby="oral-title">
        <div className="case-section__heading">
          <div>
            <span>01</span>
            <h2 id="oral-title">Oral + periodontal</h2>
          </div>
          <p>Treatment-readiness findings stay above malocclusion findings.</p>
        </div>

        <div className="finding-grid">
          <label>
            <span>Oral hygiene</span>
            <select value={findings.oralHygiene} onChange={(event) => onFindingChange("oralHygiene", event.target.value)}><option>Acceptable</option><option>Concern</option></select>
          </label>
          <label>
            <span>Gingival / periodontal status</span>
            <select value={findings.periodontalStatus} onChange={(event) => onFindingChange("periodontalStatus", event.target.value)}><option>Healthy</option><option>Concern</option></select>
          </label>
          <label>
            <span>Active caries / untreated pathology</span>
            <select value={findings.activeCaries} onChange={(event) => onFindingChange("activeCaries", event.target.value)}><option>No</option><option>Yes</option></select>
          </label>
          <label>
            <span>Restorative / prosthetic considerations</span>
            <select value={findings.restorativeConsiderations} onChange={(event) => onFindingChange("restorativeConsiderations", event.target.value)}><option>None</option><option>Present</option></select>
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
            <span>02</span>
            <h2 id="facial-title">Facial + soft tissue</h2>
          </div>
          <p>Clinician-entered findings only.</p>
        </div>

        <div className="finding-grid">
          <label>
            <span>Profile</span>
            <select value={findings.profile} onChange={(event) => onFindingChange("profile", event.target.value)}><option>Convex</option><option>Straight</option><option>Concave</option></select>
          </label>
          <label>
            <span>Lip competence</span>
            <select value={findings.lipCompetence} onChange={(event) => onFindingChange("lipCompetence", event.target.value)}><option>Competent</option><option>Incompetent</option></select>
          </label>
          <label>
            <span>Facial vertical pattern</span>
            <select value={findings.facialVerticalPattern} onChange={(event) => onFindingChange("facialVerticalPattern", event.target.value)}><option>Low</option><option>Average</option><option>High</option></select>
          </label>
          <label>
            <span>Facial asymmetry</span>
            <select value={findings.facialAsymmetry} onChange={(event) => onFindingChange("facialAsymmetry", event.target.value)}><option>None</option><option>Present</option></select>
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
            <span>03</span>
            <h2 id="occlusion-title">Occlusion</h2>
          </div>
          <p>Structured findings for treatment reasoning.</p>
        </div>

        <div className="finding-grid">
          <label>
            <span>Molar relationship — right</span>
            <select value={findings.molarRight} onChange={(event) => onFindingChange("molarRight", event.target.value)}><option>Class I</option><option>Class II</option><option>Class III</option></select>
          </label>
          <label>
            <span>Molar relationship — left</span>
            <select value={findings.molarLeft} onChange={(event) => onFindingChange("molarLeft", event.target.value)}><option>Class I</option><option>Class II</option><option>Class III</option></select>
          </label>
          <label>
            <span>Canine relationship — right</span>
            <select value={findings.canineRight} onChange={(event) => onFindingChange("canineRight", event.target.value)}><option>Class I</option><option>Class II</option><option>Class III</option></select>
          </label>
          <label>
            <span>Canine relationship — left</span>
            <select value={findings.canineLeft} onChange={(event) => onFindingChange("canineLeft", event.target.value)}><option>Class I</option><option>Class II</option><option>Class III</option></select>
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
            <select value={findings.curveOfSpee} onChange={(event) => onFindingChange("curveOfSpee", event.target.value)}><option>Flat</option><option>Mild</option><option>Moderate</option><option>Deep</option></select>
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
            <span>04</span>
            <h2 id="ceph-title">Cephalometric summary</h2>
          </div>
          <p>No proprietary analysis is required.</p>
        </div>

        <div className="finding-grid">
          <label>
            <span>Skeletal AP pattern</span>
            <select value={findings.skeletalAp} onChange={(event) => onFindingChange("skeletalAp", event.target.value)}><option>Class I</option><option>Class II</option><option>Class III</option></select>
          </label>
          <label>
            <span>Vertical skeletal pattern</span>
            <select value={findings.skeletalVertical} onChange={(event) => onFindingChange("skeletalVertical", event.target.value)}><option>Low</option><option>Average</option><option>High</option></select>
          </label>
          <label>
            <span>Maxillary incisors</span>
            <select value={findings.maxillaryIncisors} onChange={(event) => onFindingChange("maxillaryIncisors", event.target.value)}><option>Retroclined</option><option>Normal</option><option>Proclined</option></select>
          </label>
          <label>
            <span>Mandibular incisors</span>
            <select value={findings.mandibularIncisors} onChange={(event) => onFindingChange("mandibularIncisors", event.target.value)}><option>Retroclined</option><option>Normal</option><option>Proclined</option></select>
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
            <span>05</span>
            <h2 id="scope-screen-title">V1 scope screen</h2>
          </div>
          <p>If the primary treatment need is unsupported, planning stops here.</p>
        </div>

        <label className="scope-select">
          <span>Primary unsupported treatment need</span>
          <select value={scopeIssue} onChange={(event) => onScopeIssue(event.target.value)}>
            <option value="">None — within current V1 scope</option>
            {outOfScopeOptions.map((option) => (
              <option value={option} key={option}>{option}</option>
            ))}
          </select>
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
};

type AiReviewMode = "plan_review" | "stage_review";

function ClinicalAiReviewCard({
  mode,
  planningReady,
  planApproved,
  setupApproved,
}: {
  mode: AiReviewMode;
  planningReady: boolean;
  planApproved: boolean;
  setupApproved: boolean;
}) {
  const stageMode = mode === "stage_review";
  const gateReady = stageMode
    ? planningReady && planApproved && setupApproved
    : planningReady;

  return (
    <section className="ai-review-card" aria-labelledby={`ai-review-${mode}`}>
      <div className="ai-review-card__header">
        <div>
          <span>Gemini clinical reasoning</span>
          <h2 id={`ai-review-${mode}`}>
            {stageMode ? "Mechanics review" : "Clinical plan review"}
          </h2>
        </div>
        <span className="ai-review-status">Authentication pending</span>
      </div>

      <p className="ai-review-card__intro">
        BracketMotion can send a structured case to the authenticated server-side
        reasoning endpoint and receive a source-grounded draft for clinician review.
      </p>

      <div className="ai-review-boundaries">
        <div>
          <span>Sources</span>
          <strong>Proffit 2025 only</strong>
          <small>Mechanics claims cite controlled internal source IDs.</small>
        </div>
        <div>
          <span>Output</span>
          <strong>Structured review</strong>
          <small>Concerns, alternatives, stage guidance and missing information.</small>
        </div>
        <div>
          <span>Geometry</span>
          <strong>No write access</strong>
          <small>Gemini cannot move teeth, alter transforms or approve setup.</small>
        </div>
      </div>

      <div className="ai-review-gate">
        <div>
          <span>Clinical gate</span>
          <strong>{gateReady ? "Clinical prerequisites met" : "Prerequisites not met"}</strong>
          <p>
            {stageMode
              ? "Stage review requires planning readiness, Clinical Plan Approval and 3D Setup Approval."
              : "Plan review requires a planning-ready case. The clinician remains responsible for accepting, editing or rejecting the draft."}
          </p>
        </div>
        <button
          className="ai-review-button"
          type="button"
          disabled
          title="Task 10 connects authenticated BracketMotion sessions to this deployed endpoint."
        >
          Sign in required
        </button>
      </div>

      <div className="ai-review-source-note">
        <strong>Live endpoint deployed</strong>
        <p>
          The clinical reasoning service is already server-side and approval-gated.
          Task 10 only supplies the authenticated BracketMotion session needed to call it safely.
        </p>
      </div>
    </section>
  );
}

function TreatmentPlanView({
  planningReady,
  scopeIssue,
  plan,
  planApproved,
  onPlanChange,
  onApprove,
}: {
  planningReady: boolean;
  scopeIssue: string;
  plan: TreatmentPlanState;
  planApproved: boolean;
  onPlanChange: (field: keyof TreatmentPlanState, value: string) => void;
  onApprove: () => void;
}) {
  const planComplete = Object.values(plan).every((value) => value.trim().length > 0);

  if (!planningReady) {
    return (
      <div className="case-workflow-page">
        <div className="case-workflow-page__header">
          <div>
            <span className="case-page-kicker">Treatment plan</span>
            <h1>Planning is not available yet.</h1>
            <p>Complete the mandatory records and clear the V1 scope screen before a treatment plan can be reviewed.</p>
          </div>
        </div>

        <div className="plan-blocked-card" role="status">
          <strong>{scopeIssue ? "Out of V1 scope" : "Case not planning-ready"}</strong>
          <p>
            {scopeIssue
              ? `${scopeIssue} is outside the frozen BracketMotion V1 boundary.`
              : "Return to Case and Findings to complete the missing requirements."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="case-workflow-page">
      <div className="case-workflow-page__header">
        <div>
          <span className="case-page-kicker">Treatment plan</span>
          <h1>Review the strategy before any tooth moves.</h1>
          <p>The plan remains clinician-controlled. Gemini can review the structured strategy, but it cannot approve or alter the treatment geometry.</p>
        </div>
        <span className={`plan-approval-badge${planApproved ? " is-approved" : ""}`}>
          {planApproved ? "Clinical plan approved" : "Approval required"}
        </span>
      </div>

      <section className="case-section" aria-labelledby="problem-list-title">
        <div className="case-section__heading">
          <div>
            <span>01</span>
            <h2 id="problem-list-title">Problem list</h2>
          </div>
          <p>Only clinically relevant problems that drive the plan.</p>
        </div>
        <textarea
          className="plan-textarea"
          value={plan.problemList}
          onChange={(event) => onPlanChange("problemList", event.target.value)}
          rows={4}
        />
      </section>

      <section className="case-section" aria-labelledby="goals-title">
        <div className="case-section__heading">
          <div>
            <span>02</span>
            <h2 id="goals-title">Treatment goals</h2>
          </div>
          <p>Define the intended correction before mechanics are selected.</p>
        </div>
        <textarea
          className="plan-textarea"
          value={plan.goals}
          onChange={(event) => onPlanChange("goals", event.target.value)}
          rows={4}
        />
      </section>

      <div className="plan-strategy-grid">
        <section className="case-section plan-strategy-card is-primary" aria-labelledby="primary-strategy-title">
          <div className="case-section__heading">
            <div>
              <span>03</span>
              <h2 id="primary-strategy-title">Primary strategy</h2>
            </div>
            <span className="strategy-label">Primary</span>
          </div>
          <textarea
            className="plan-textarea"
            value={plan.primaryStrategy}
            onChange={(event) => onPlanChange("primaryStrategy", event.target.value)}
            rows={7}
          />
        </section>

        <section className="case-section plan-strategy-card" aria-labelledby="alternative-strategy-title">
          <div className="case-section__heading">
            <div>
              <span>04</span>
              <h2 id="alternative-strategy-title">Alternative strategy</h2>
            </div>
            <span className="strategy-label is-secondary">Alternative</span>
          </div>
          <textarea
            className="plan-textarea"
            value={plan.alternativeStrategy}
            onChange={(event) => onPlanChange("alternativeStrategy", event.target.value)}
            rows={7}
          />
        </section>
      </div>

      <ClinicalAiReviewCard
        mode="plan_review"
        planningReady={planningReady}
        planApproved={planApproved}
        setupApproved={false}
      />

      <section className={`plan-approval-panel${planApproved ? " is-approved" : ""}`}>
        <div>
          <span>Clinical approval gate</span>
          <strong>{planApproved ? "Plan approved" : "Approve before 3D setup"}</strong>
          <p>
            {planApproved
              ? "The setup workspace is unlocked. Any later plan edit will revoke this approval."
              : planComplete
                ? "BracketMotion does not generate or approve final tooth positions until the clinician approves this strategy."
                : "Complete the problem list, goals, primary strategy and alternative before approval."}
          </p>
        </div>
        <button
          className="app-primary-action plan-approve-button"
          type="button"
          onClick={onApprove}
          disabled={planApproved || !planComplete}
        >
          {planApproved ? "Approved" : planComplete ? "Approve clinical plan" : "Complete plan first"}
        </button>
      </section>
    </div>
  );
}

function SetupWorkspace({
  onSetupApprovalChange,
  clinicalSection,
}: {
  onSetupApprovalChange: (approved: boolean) => void;
  clinicalSection: "Setup" | "Stages";
}) {
  const viewerRef = useRef<ClinicalViewerHandle | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"patient" | "demo">("patient");
  const isStages = clinicalSection === "Stages";
  const showPatientSurface = isStages || workspaceMode === "patient";

  return (
    <div className="setup-workspace">
      <div className="app-viewer-toolbar">
        {isStages ? (
          <div className="app-viewer-toolbar__group" aria-label="Stages workspace">
            <button className="app-tool-button is-selected" type="button">
              Stage + mechanics
            </button>
          </div>
        ) : (
          <>
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
                Demo anatomy
              </button>
            </div>

            {workspaceMode === "demo" && (
              <>
                <div className="app-viewer-toolbar__group" aria-label="Viewer layers">
                  {viewerLayers.map((tool, index) => (
                    <button
                      className={`app-tool-button${index < 2 ? " is-selected" : ""}`}
                      type="button"
                      key={tool}
                      onClick={() => {
                        if (tool === "Initial") viewerRef.current?.showInitial();
                        if (tool === "Planned") viewerRef.current?.showTarget();
                      }}
                      disabled={index > 1}
                      title={index > 1 ? "Layer controls arrive in later 3D/appliance tasks." : undefined}
                    >
                      {tool}
                    </button>
                  ))}
                </div>

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
              </>
            )}
          </>
        )}
      </div>

      <div
        className={`setup-workspace__surface${showPatientSurface ? " is-visible" : ""}`}
        aria-hidden={!showPatientSurface}
      >
        <Suspense
          fallback={
            <div className="clinical-viewer__message" role="status">
              <strong>Preparing patient workspace…</strong>
              <span>Loading local scan and mechanics tools.</span>
            </div>
          }
        >
          <ScanWorkflow
            onSetupApprovalChange={onSetupApprovalChange}
            clinicalView={isStages ? "stages" : "setup"}
          />
        </Suspense>
      </div>

      <div
        className={`setup-workspace__surface${!showPatientSurface ? " is-visible" : ""}`}
        aria-hidden={showPatientSurface}
      >
        <div className="setup-demo-workspace">
          <div className="app-viewport app-viewport--interactive">
            <Suspense
              fallback={
                <div className="clinical-viewer__message" role="status">
                  <strong>Preparing 3D workspace…</strong>
                  <span>Loading the demo anatomy viewer.</span>
                </div>
              }
            >
              <ClinicalViewer ref={viewerRef} onSelectionChange={setSelectedTooth} />
            </Suspense>

            <div className="app-viewport__corner">
              <span>3D proof of concept</span>
              <strong>{selectedTooth || "Select a tooth"}</strong>
            </div>
          </div>

          <div className="app-timeline">
            <button
              className="app-play-button"
              type="button"
              aria-label="Preview selected tooth movement"
              onClick={() => viewerRef.current?.previewMovement()}
              disabled={!selectedTooth}
            >
              ▶
            </button>
            <div className="app-timeline__track">
              {demoStages.map((stage, index) => (
                <button
                  className={`app-stage-chip${index === 0 ? " is-current" : ""}`}
                  type="button"
                  key={stage}
                  disabled={index > 1}
                  onClick={() => {
                    if (index === 0) viewerRef.current?.showInitial();
                    if (index === 1) viewerRef.current?.showTarget();
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClinicalAppPage() {
  const [activeSection, setActiveSection] = useState<ClinicalSection>("Case");
  const [showCaseHub, setShowCaseHub] = useState(false);
  const [caseLabel, setCaseLabel] = useState("Demo Case");
  const [scopeIssue, setScopeIssue] = useState("");
  const [planApproved, setPlanApproved] = useState(false);
  const [setupApproved, setSetupApproved] = useState(false);
  const [plan, setPlan] = useState<TreatmentPlanState>({
    problemList: "Mild maxillary crowding; moderate mandibular crowding; mild lower anterior rotations; 4 mm overjet; 45% overbite.",
    goals: "Resolve crowding and rotations; coordinate the arches; maintain a Class I molar/canine relationship; normalize overjet and overbite while preserving facial balance.",
    primaryStrategy: "Non-extraction fixed-appliance treatment. Align and level both arches with progressive NiTi wires, coordinate arch form, then finish on stainless steel with controlled settling as needed.",
    alternativeStrategy: "Consider limited space creation if alignment cannot be achieved within the approved arch-form and incisor-position goals. Reassess space requirements before progressing beyond alignment.",
  });
  const [records, setRecords] = useState<Record<RecordKey, boolean>>({
    history: true,
    exam: true,
    scans: true,
    photos: true,
    pano: false,
    ceph: false,
    cephSummary: true,
  });

  const missingCount = useMemo(
    () => requiredRecords.filter((record) => !records[record.key]).length,
    [records],
  );
  const planningReady = missingCount === 0 && !scopeIssue;

  const completeRecord = (key: RecordKey) => {
    setRecords((current) => ({ ...current, [key]: true }));
  };

  const updatePlan = (field: keyof TreatmentPlanState, value: string) => {
    setPlan((current) => ({ ...current, [field]: value }));
    setPlanApproved(false);
    setSetupApproved(false);
  };

  const openSection = (section: ClinicalSection) => {
    setShowCaseHub(false);

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
    setCaseLabel("Demo Case");
    setScopeIssue("");
    setPlanApproved(false);
    setSetupApproved(false);
    setPlan({
      problemList: "Mild maxillary crowding; moderate mandibular crowding; mild lower anterior rotations; 4 mm overjet; 45% overbite.",
      goals: "Resolve crowding and rotations; coordinate the arches; maintain a Class I molar/canine relationship; normalize overjet and overbite while preserving facial balance.",
      primaryStrategy: "Non-extraction fixed-appliance treatment. Align and level both arches with progressive NiTi wires, coordinate arch form, then finish on stainless steel with controlled settling as needed.",
      alternativeStrategy: "Consider limited space creation if alignment cannot be achieved within the approved arch-form and incisor-position goals. Reassess space requirements before progressing beyond alignment.",
    });
    setRecords({
      history: true,
      exam: true,
      scans: true,
      photos: true,
      pano: false,
      ceph: false,
      cephSummary: true,
    });
    setShowCaseHub(false);
    setActiveSection("Case");
  };

  const startNewCase = () => {
    setCaseLabel("Untitled Case");
    setScopeIssue("");
    setPlanApproved(false);
    setSetupApproved(false);
    setPlan({
      problemList: "",
      goals: "",
      primaryStrategy: "",
      alternativeStrategy: "",
    });
    setRecords({
      history: false,
      exam: false,
      scans: false,
      photos: false,
      pano: false,
      ceph: false,
      cephSummary: false,
    });
    setShowCaseHub(false);
    setActiveSection("Case");
  };

  return (
    <main className="clinical-app">
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <a className="wordmark app-wordmark" href="/" aria-label="BracketMotion home">
            BracketMotion<span>.</span>
          </a>
          <span className="app-topbar__divider" aria-hidden="true" />
          <div className="app-case-title">
            <strong>{caseLabel}</strong>
            <span>Permanent dentition · {planningReady ? "Planning ready" : "Draft"}</span>
          </div>
        </div>

        <div className="app-topbar__actions">
          <span className="app-save-state">Local preview</span>
          <button
            className="app-quiet-button"
            type="button"
            onClick={() => setShowCaseHub(true)}
          >
            Cases
          </button>
          <button className="app-account-button" type="button" aria-label="Account">A</button>
        </div>
      </header>

      <div className="clinical-app__body">
        <aside className="app-sidebar" aria-label="Case workflow">
          <div className="app-sidebar__heading">
            <span>Clinical flow</span>
            <strong>{caseLabel}</strong>
          </div>

          <nav className="app-flow-nav">
            {clinicalFlow.map((item, index) => (
              <button
                className={`app-flow-item${activeSection === item.label && !showCaseHub ? " is-active" : ""}`}
                type="button"
                key={item.label}
                onClick={() => openSection(item.label)}
              >
                <span className="app-flow-item__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="app-flow-item__copy">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </nav>

          <div className={`app-sidebar__status${scopeIssue ? " is-blocked" : planningReady ? " is-ready" : ""}`}>
            <span>Planning status</span>
            <strong>{scopeIssue ? "Out of V1 scope" : planningReady ? "Planning ready" : "Draft case"}</strong>
            <p>
              {scopeIssue
                ? "Treatment planning is blocked by the scope screen."
                : planningReady
                  ? "All required records are complete."
                  : `${missingCount} required records are still missing.`}
            </p>
          </div>
        </aside>

        <section className={`app-workspace${activeSection === "Case" || activeSection === "Findings" || showCaseHub ? " is-clinical-form" : ""}`}>
          <div className="app-mobile-flow" aria-label="Case workflow">
            {clinicalFlow.map((item) => (
              <button
                className={`app-mobile-flow__item${activeSection === item.label && !showCaseHub ? " is-active" : ""}`}
                type="button"
                key={item.label}
                onClick={() => openSection(item.label)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {showCaseHub ? (
            <div className="case-hub">
              <div className="case-workflow-page__header">
                <div>
                  <span className="case-page-kicker">Cases</span>
                  <h1>Open or create a case.</h1>
                  <p>Task 2 establishes the case-entry workflow. Database persistence arrives in Task 10.</p>
                </div>
                <button
                  className="app-primary-action case-page-primary"
                  type="button"
                  onClick={startNewCase}
                >
                  New case
                </button>
              </div>

              <button
                className="case-card"
                type="button"
                onClick={openDemoCase}
              >
                <div>
                  <span>Demo Case</span>
                  <strong>Permanent dentition</strong>
                </div>
                <div className="case-card__status">
                  <span>{planningReady ? "Planning ready" : "Draft"}</span>
                  <small>Open →</small>
                </div>
              </button>
            </div>
          ) : activeSection === "Case" ? (
            <CaseRecordsView
              caseLabel={caseLabel}
              onCaseLabel={setCaseLabel}
              records={records}
              onCompleteRecord={completeRecord}
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
                setPlanApproved(false);
                setSetupApproved(false);
              }}
              planningReady={planningReady}
              missingCount={missingCount}
              onBackToCase={() => setActiveSection("Case")}
            />
          ) : activeSection === "Plan" ? (
            <TreatmentPlanView
              planningReady={planningReady}
              scopeIssue={scopeIssue}
              plan={plan}
              planApproved={planApproved}
              onPlanChange={updatePlan}
              onApprove={() => {
                setPlanApproved(true);
                setSetupApproved(false);
              }}
            />
          ) : (
            <SetupWorkspace
              onSetupApprovalChange={setSetupApproved}
              clinicalSection={activeSection as "Setup" | "Stages"}
            />
          )}
        </section>

        <aside className="app-inspector" aria-label="Case inspector">
          <div className="app-inspector__header">
            <div>
              <span>Inspector</span>
              <strong>{showCaseHub ? "Cases" : activeSection}</strong>
            </div>
            <button className="app-icon-button" type="button" aria-label="Inspector settings">•••</button>
          </div>

          <div className="app-inspector__section">
            <span className="app-inspector__label">Readiness</span>
            <div className="app-empty-selection">
              <strong>{scopeIssue ? "Planning blocked" : planningReady ? "Planning ready" : "Draft case"}</strong>
              <p>
                {scopeIssue
                  ? scopeIssue
                  : planningReady
                    ? "All mandatory records are present and the V1 scope screen is clear."
                    : `${missingCount} mandatory record${missingCount === 1 ? "" : "s"} still missing.`}
              </p>
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
      </div>
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

export default function App() {
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
