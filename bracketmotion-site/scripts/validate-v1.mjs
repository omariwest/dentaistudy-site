import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/App.tsx");
const scan = read("../src/ScanWorkflow.tsx");
const manifest = JSON.parse(read("../public/manifest.webmanifest"));
const serviceWorker = read("../public/sw.js");

function requireText(source, token, label) {
  if (!source.includes(token)) {
    throw new Error(`V1 validation failed: ${label} is missing (${token}).`);
  }
}

const requiredRecords = [
  "History + chief complaint",
  "Clinical examination",
  "Upper + lower scans",
  "Clinical photographs",
  "Panoramic radiograph",
  "Lateral cephalogram",
  "Cephalometric summary",
];
requiredRecords.forEach((token) => requireText(app, token, "Gate 2 record"));

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
      [app, "<option>Class II</option>"],
      [app, "<option>Proclined</option>"],
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
  `BracketMotion V1 validation passed: ${representativeFamilies.length}/6 representative family profiles, ${requiredRecords.length} Gate 2 records, ${exclusions.length} Gate 4 exclusions, clinical gates, and PWA release invariants.`,
);
