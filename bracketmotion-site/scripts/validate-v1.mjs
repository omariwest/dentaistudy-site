import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/App.tsx");
const scan = read("../src/ScanWorkflow.tsx");
const ceph = read("../src/CephAnalysis.tsx");
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

const photoFirstGate = [
  'const missingCount = intraoralPhotoSlots.filter((slot) => !photos[slot.key]).length;',
  'const planningReady = missingCount === 0 && !scopeIssue;',
  'activeSection === "Case" ? "Findings" : activeSection === "Findings" ? "Plan" : "Setup"',
  '(activeSection === "Findings" ? diagnosis.approved : planApproved)',
  'if ((section === "Plan" || section === "Setup" || section === "Stages") && !diagnosis.approved)',
  'if ((section === "Setup" || section === "Stages") && !planApproved)',
  'if (section === "Stages" && !setupApproved)',
  'photos: photoInputs,',
  'onApproveDiagnosis',
  'onApprove={approveTreatmentPlan}',
  'onOptionChange={updateTreatmentOption}',
];
photoFirstGate.forEach((token) => requireText(app, token, "photo-first clinical gate"));
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

const exclusions = [
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
];
exclusions.forEach((token) => requireText(app, token, "Gate 4 exclusion"));

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
  `BracketMotion V1 validation passed: ${representativeFamilies.length}/6 representative family profiles, ${clinicalRecordInputs.length} clinical record inputs, five-photo Diagnosis gate, ${exclusions.length} scope exclusions, approval gates, AI photo contract, ceph groups, and PWA invariants.`,
);
