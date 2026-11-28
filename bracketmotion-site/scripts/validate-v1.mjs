import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/App.tsx");
const css = read("../src/styles.css");
const scan = read("../src/ScanWorkflow.tsx");
const ceph = read("../src/CephAnalysis.tsx");
const cephWorker = read("../src/cephInference.worker.ts");
const cephGeometry = read("../src/cephGeometry.ts");
const clinicalAI = read("../supabase/functions/bracketmotion-clinical-reasoning/index.ts");
const index = read("../index.html");
const manifest = JSON.parse(read("../public/manifest.webmanifest"));
const serviceWorker = read("../public/sw.js");
const finalBrandMark = read("../public/icons/bracketmotion-icon.svg");

function requireText(source, token, label) {
  if (!source.includes(token)) {
    throw new Error(`V1 validation failed: ${label} is missing (${token}).`);
  }
}

const clinicalRecordInputs = [
  "Patient label / case ID",
  "Patient and clinical history",
  "Chief complaint / treatment goal",
  "Medical history",
  "Dental / orthodontic history",
  "Allergies / habits / clinical notes",
  "Five intraoral photographs",
  "Facial photographs",
  "Radiographic records",
];
clinicalRecordInputs.forEach((token) => requireText(app, token, "clinical records input"));
if (app.includes("Additional clinical records") || app.includes("RecordStatus") || app.includes('"Local Case"')) {
  throw new Error("V1 validation failed: obsolete clinical record checklist or demo label remains.");
}
[
  'chiefComplaint: "Improve my smile."',
  'medicalHistory: "Not provided"',
  'dentalHistory: "Not provided"',
  'notes: "Not provided"',
  'placeholder="Patient name or case ID"',
].forEach((token) => requireText(app, token, "neutral new-case defaults"));

const recordPage = app.split("function CaseRecordsView(")[1]?.split("function FindingsView(")[0] || "";
const diagnosisPage = app.split("function FindingsView(")[1]?.split("type TreatmentPlanState")[0] || "";
const recordCards = ["case-details-title", "intraoral-photos-title", "facial-photos-title", "radiographs-title"];
const cardPositions = recordCards.map((id) => recordPage.indexOf(`aria-labelledby="${id}"`));
if (cardPositions.some((position) => position < 0) ||
    cardPositions.some((position, index) => index > 0 && position <= cardPositions[index - 1]) ||
    recordPage.includes('className="case-content-column"')) {
  throw new Error("V1 validation failed: Clinical Records grid must preserve natural mobile reading order.");
}
const rightColumn = diagnosisPage.lastIndexOf('className="case-content-column"');
const facial = diagnosisPage.indexOf('aria-labelledby="facial-title"');
const cephSection = diagnosisPage.indexOf('aria-labelledby="ceph-title"');
if (rightColumn < 0 || facial <= rightColumn || cephSection <= facial) {
  throw new Error("V1 validation failed: Diagnosis facial and cephalometry sections must keep their layout order.");
}
for (const removed of [
  'aria-labelledby="scope-screen-title"',
  'onScopeIssue',
  'ceph-tracing__clinical-fields',
  'Primary unsupported treatment need',
]) {
  if (diagnosisPage.includes(removed)) {
    throw new Error(`V1 validation failed: removed clinical UI returned (${removed}).`);
  }
}
for (const selector of [
  ".case-workflow-page__header {", ".readiness-card {", ".case-section {",
  ".ai-review-card {", ".plan-blocked-card {", ".plan-strategy-grid {",
  ".plan-approval-panel {",
]) {
  const start = css.indexOf(selector);
  const end = css.indexOf("}", start);
  if (start < 0 || end < 0 || !css.slice(start, end).includes("width: min(1280px, 100%);")) {
    throw new Error(`V1 validation failed: workflow width is inconsistent (${selector}).`);
  }
}
if (!css.includes(".ceph-tracing__viewer {\n  display: grid;\n  grid-template-rows: minmax(0, 1fr);") ||
    !css.includes(".ceph-tracing__svg {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  height: 100%;\n  min-height: 0;")) {
  throw new Error("V1 validation failed: cephalogram SVG must fit the bounded viewer without clipping.");
}
if (!css.includes("height: clamp(340px, calc(100dvh - 210px), 730px);") ||
    css.includes(".ceph-tracing__progress") ||
    ceph.includes('className="ceph-tracing__progress"') ||
    !ceph.includes('{busy ? progress || "Preparing image…" : current ? "Run again" : "Detect landmarks"}') ||
    !ceph.includes('<span aria-live="polite">') || ceph.includes('<span role="status" aria-live="polite">') ||
    !ceph.includes('preserveAspectRatio="xMidYMid meet"') ||
    !cephWorker.includes('text: "Preparing analysis…"') ||
    !cephWorker.includes('text: "Finding landmarks…"') ||
    !cephWorker.includes('text: "Finishing tracing…"')) {
  throw new Error("V1 validation failed: cephalometric viewer size or inline progress has regressed.");
}
const diagnosisSource = app.split("function FindingsView(")[1]?.split("function TreatmentPlanView(")[0] || "";
const planSource = app.split("function TreatmentPlanView(")[1]?.split("function AuthDialog(")[0] || "";
for (const [label, source, busy] of [
  ["Diagnosis", diagnosisSource, "diagnosisLoading"],
  ["Treatment", planSource, "suggestionsLoading"],
]) {
  if (!source.includes(`className="ai-review-gate" aria-busy={${busy}}`) ||
      !source.includes(`aria-busy={${busy}}`)) {
    throw new Error(`V1 validation failed: ${label} working button must expose progress state.`);
  }
}
if (!ceph.includes('aria-busy={busy} onClick={() => void run()}') ||
    !css.includes('.ai-review-button[aria-busy="true"],') ||
    !css.includes('.ceph-tracing__actions > .app-quiet-button[aria-busy="true"]') ||
    !css.includes('animation: clinical-action-shimmer 1.45s linear infinite;') ||
    !css.includes('@keyframes clinical-action-shimmer')) {
  throw new Error("V1 validation failed: meaningful clinical action shimmer is missing.");
}
for (const id of ["diagnosis-draft-title", "occlusion-title", "oral-title", "facial-title"]) {
  requireText(diagnosisPage, `aria-labelledby="${id}" aria-busy={diagnosisLoading}`, "draft heading shimmer state");
}
if (!css.includes('.case-section[aria-busy="true"] .case-section__heading h2 {') ||
    !css.includes('background-clip: text;') ||
    !css.includes('animation: clinical-action-shimmer 1.45s linear infinite;') ||
    !css.includes('@media (prefers-reduced-motion: reduce)') ||
    css.includes(".scope-select") || css.includes(".scope-warning") ||
    css.includes(".ceph-tracing__clinical-fields") ||
    !ceph.includes('<section className="ceph-tracing__empty-result" aria-label="Measurements">') ||
    ceph.includes("ReactNode") || ceph.includes("{children}") ||
    !app.includes('Clinician-verified numeric measurements:')) {
  throw new Error("V1 validation failed: diagnosis shimmer and uncluttered measured cephalometry have regressed.");
}

if (css.includes(".case-workflow-page--split") || app.includes("case-workflow-page--split")) {
  throw new Error("V1 validation failed: obsolete split-layout overrides remain.");
}

const photoFirstGate = [
  'const missingCount = intraoralPhotoSlots.filter((slot) => !photos[slot.key]).length;',
  'const planningReady = missingCount === 0 && !scopeIssue;',
  'const cephVerified = Boolean(photos.ceph && cephTrace?.approved && cephAngles(cephTrace.points));',
  'const canOpenTreatment = planningReady && diagnosis.approved && cephVerified;',
  'activeSection === "Case" ? "Findings" : activeSection === "Findings" ? "Plan" : "Setup"',
  '(activeSection === "Findings" ? canOpenTreatment : planApproved)',
  'if ((section === "Plan" || section === "Setup" || section === "Stages") && !canOpenTreatment)',
  'if ((section === "Setup" || section === "Stages") && !planApproved)',
  'if (section === "Stages" && !setupApproved)',
  'photos: photoInputs,',
  'onApproveDiagnosis',
  'canOpenTreatment={canOpenTreatment}',
  'disabled={!canOpenTreatment}',
  'if (!canOpenTreatment || !plan.problemList.trim() || !plan.goals.trim()) return;',
  'if (!canOpenTreatment) {',
  'planningReady={canOpenTreatment}',
  'onApprove={approveTreatmentPlan}',
  'onOptionChange={updateTreatmentOption}',
];
photoFirstGate.forEach((token) => requireText(app, token, "photo-first clinical gate"));
const cephChanges = app.split('onCephTraceChange={(next) => {')[1]?.split('onOpenRecords={() =>', 1)[0] || "";
const cephReapproval = cephChanges.split('onApproveCeph={(next) => {')[1] || "";
const cephEdits = cephChanges.split('onApproveCeph={(next) => {')[0] || "";
if (!cephEdits.includes('if (cephTrace?.approved) {') ||
    !cephEdits.includes('setDiagnosis((current) => ({ ...current, approved: false }));') ||
    !cephEdits.includes('setPlanApproved(false);') ||
    !cephReapproval.includes('setCephTrace(next);') ||
    cephReapproval.includes('setDiagnosis((current) => ({ ...current, approved: false }));') ||
    !ceph.includes('corrected: true, approved: false') ||
    !ceph.includes('if (current?.approved) onTraceChange({ ...current, approved: false });') ||
    !app.includes('if (key !== "ceph" || photos.ceph) {')) {
  throw new Error("V1 validation failed: cephalometric approval and edited-landmark invalidation must preserve the review flow.");
}

["frontal", "upperOcclusal", "lowerOcclusal", "rightBuccal", "leftBuccal"].forEach((slot) => {
  requireText(app, `{ key: "${slot}",`, "five-photo input");
});
["Skeletal analysis", "Dental analysis", "Soft tissue analysis"].forEach((title) => {
  requireText(ceph, title, "cephalometric analysis group");
});
["SN_MP", "SN_PP", "PP_MP", "IMPA", "INTERINCISAL"].forEach((name) => {
  requireText(cephGeometry, name, "additional cephalometric measurement");
});
["sanitizePhotos", "inlineData", "diagnosisSchema", "gates.diagnosis_approved"].forEach((token) => {
  requireText(clinicalAI, token, "single Gemini clinical review");
});
if (ceph.includes("Initial model download") || ceph.includes("Source and attribution")) {
  throw new Error("V1 validation failed: clinical workspace contains developer metadata.");
}

const representativeFamilies = [
  {
    name: "Class I crowding — non-extraction",
    checks: [
      [app, "maxillaryCrowding"],
      [app, "mandibularCrowding"],
      [scan, 'title: "Alignment + leveling"'],
    ],
  },
  {
    name: "Class I spacing",
    checks: [
      [app, "maxillaryCrowding"],
      [scan, 'title: "Space closure"'],
      [scan, "powerChain"],
      [scan, "coilSpring"],
    ],
  },
  {
    name: "Symmetric first-premolar extraction",
    checks: [
      [scan, "firstPremolarPair"],
      [scan, 'title: "Planned extractions + space preparation"'],
      [scan, "plannedExtractions"],
      [scan, "closingLoop"],
    ],
  },
  {
    name: "Selected Class II Division 1",
    checks: [
      [app, '"Class II"'],
      [app, '"Proclined"'],
      [scan, 'title: "Interarch correction"'],
      [scan, "elastics"],
    ],
  },
  {
    name: "Selected deep bite",
    checks: [
      [app, "curveOfSpee"],
      [app, "overbite"],
      [scan, '["X", "Y", "Z"]'],
      [scan, 'title: "Alignment + leveling"'],
    ],
  },
  {
    name: "Selected anterior open bite",
    checks: [
      [app, "overbite"],
      [scan, "vertical components, tooth extrusion"],
      [scan, "elasticUpper"],
      [scan, "elasticLower"],
    ],
  },
];

representativeFamilies.forEach((family) => {
  family.checks.forEach(([source, token]) =>
    requireText(source, token, `representative family: ${family.name}`),
  );
});

[
  "Clinical Plan Approval",
  "3D Setup Approval",
  "plannedExtractionIds",
  "Potential collision",
  "Overjet",
  "Overbite",
  "Midline",
].forEach((token) => {
  const source = token === "Clinical Plan Approval" ? app : scan;
  requireText(source, token, "end-to-end clinical gate");
});

if (manifest.start_url !== "/app" || manifest.display !== "standalone") {
  throw new Error("V1 validation failed: PWA manifest start/display mode regressed.");
}
if (manifest.id !== "/app") {
  throw new Error("V1 validation failed: PWA manifest ID regressed.");
}
if (manifest.theme_color !== "#000000") {
  throw new Error("V1 validation failed: final BracketMotion PWA theme color regressed.");
}
requireText(index, "/favicon.ico", "final favicon ICO");
requireText(index, "/icons/favicon-32.png", "final 32px favicon");
requireText(index, "/icons/favicon-16.png", "final 16px favicon");
requireText(finalBrandMark, "BracketMotion black standalone mark", "final BracketMotion brand mark");
if (finalBrandMark.includes("#6d4cf5")) {
  throw new Error("V1 validation failed: temporary purple favicon artwork is still active.");
}
requireText(app, "NavigatorWithInstall", "modern browser install API");
requireText(app, "beforeinstallprompt", "legacy browser install fallback");
requireText(app, "installAvailable", "live install readiness state");
requireText(app, "Preparing install…", "install dialog pending action");
requireText(app, "Install BracketMotion", "install dialog primary action");
if (app.includes('<img src="/icons/bracketmotion-icon.svg"')) {
  throw new Error("V1 validation failed: favicon artwork must not be inserted into visible BracketMotion wordmarks.");
}
if (app.includes("Open web app")) {
  throw new Error("V1 validation failed: install fallback must not imitate installation by navigating to the web app.");
}
if (!manifest.icons?.some((icon) => icon.sizes === "192x192")) {
  throw new Error("V1 validation failed: 192x192 PWA icon missing.");
}
if (!manifest.icons?.some((icon) => icon.sizes === "512x512")) {
  throw new Error("V1 validation failed: 512x512 PWA icon missing.");
}
requireText(serviceWorker, 'fetch("/app"', "first-install app-shell cache");
requireText(serviceWorker, 'url.pathname.startsWith("/assets/")', "static asset cache");
if (serviceWorker.includes("supabase.co")) {
  throw new Error("V1 validation failed: service worker must not cache Supabase patient traffic.");
}

console.log(
  `BracketMotion V1 validation passed: ${representativeFamilies.length}/6 representative family profiles, ${clinicalRecordInputs.length} clinical record inputs, balanced workflow cards, five-photo Diagnosis gate, ${exclusions.length} scope exclusions, approval gates, AI photo contract, ceph groups, and PWA invariants.`,
);
