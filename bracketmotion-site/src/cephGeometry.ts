/** Landmark order pinned to NIH/NLM CephViT and Aariz senior-orthodontist JSON. */
export const cephLandmarks = [
  "A", "ANS", "B", "Me", "N", "Or", "Pog", "PNS", "Pn", "R", "S",
  "Ar", "Co", "Gn", "Go", "Po", "LPM", "LIT", "LMT", "UPM", "UIA",
  "UIT", "UMT", "LIA", "Li", "Ls", "N'", "Pog'", "Sn",
] as const;

export type CephLandmark = (typeof cephLandmarks)[number];
export type CephPoint = { x: number; y: number };
export type CephTrace = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  points: CephPoint[];
  approved: boolean;
  corrected: boolean;
};

export type CephAngles = { SNA: number; SNB: number; ANB: number; FMA: number };
export type CephMeasurements = CephAngles & {
  SN_MP: number | null;
  SN_PP: number | null;
  PP_MP: number | null;
  GONIAL: number | null;
  Y_FH: number | null;
  U1_SN: number | null;
  U1_NA: number | null;
  L1_NB: number | null;
  IMPA: number | null;
  INTERINCISAL: number | null;
  ST_CONVEXITY: number | null;
  ST_FH: number | null;
};

function angleAt(a: CephPoint, vertex: CephPoint, b: CephPoint): number | null {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (denominator < 1e-5) return null;
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / denominator));
  return Math.acos(cos) * 180 / Math.PI;
}


// Angular measurements are scale-independent; avoid uncalibrated mm distances.
// Oriented axes preserve U1-SN, IMPA and interincisal obtuse-angle conventions.
function angleBetween(a: CephPoint, b: CephPoint, c: CephPoint, d: CephPoint): number | null {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cd = { x: d.x - c.x, y: d.y - c.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cd.x, cd.y);
  if (denominator < 1e-5) return null;
  const cosine = Math.max(-1, Math.min(1, (ab.x * cd.x + ab.y * cd.y) / denominator));
  return Math.acos(cosine) * 180 / Math.PI;
}

function acutePlaneAngle(a: CephPoint, b: CephPoint, c: CephPoint, d: CephPoint): number | null {
  const angle = angleBetween(a, b, c, d);
  return angle === null ? null : Math.min(angle, 180 - angle);
}

export function cephAngles(points: readonly CephPoint[]): CephMeasurements | null {
  if (points.length !== cephLandmarks.length || points.some((p) =>
    !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const get = (landmark: CephLandmark): CephPoint =>
    points[cephLandmarks.indexOf(landmark)];
  const SNA = angleAt(get("S"), get("N"), get("A"));
  const SNB = angleAt(get("S"), get("N"), get("B"));
  if (SNA === null || SNB === null) return null;
  const po = get("Po"), or = get("Or"), go = get("Go"), me = get("Me");
  if (Math.hypot(po.x - or.x, po.y - or.y) < 1e-5 ||
      Math.hypot(go.x - me.x, go.y - me.y) < 1e-5) return null;
  const fh = Math.atan2(or.y - po.y, or.x - po.x) * 180 / Math.PI;
  const mp = Math.atan2(me.y - go.y, me.x - go.x) * 180 / Math.PI;
  const FMA = Math.abs((((fh - mp + 90) % 180) + 180) % 180 - 90);
  // All extra angles use the same 29 editable landmarks. A degenerate axis
  // yields null for that measurement rather than a plausible-looking number.
  return {
    SNA, SNB, ANB: SNA - SNB, FMA,
    SN_MP: acutePlaneAngle(get("S"), get("N"), go, me),
    SN_PP: acutePlaneAngle(get("S"), get("N"), get("PNS"), get("ANS")),
    PP_MP: acutePlaneAngle(get("PNS"), get("ANS"), go, me),
    GONIAL: angleAt(get("Ar"), go, me),
    Y_FH: acutePlaneAngle(get("S"), get("Gn"), po, or),
    U1_SN: angleBetween(get("N"), get("S"), get("UIA"), get("UIT")),
    U1_NA: acutePlaneAngle(get("N"), get("A"), get("UIA"), get("UIT")),
    L1_NB: acutePlaneAngle(get("N"), get("B"), get("LIA"), get("LIT")),
    IMPA: angleBetween(go, me, get("LIA"), get("LIT")),
    INTERINCISAL: angleBetween(get("UIA"), get("UIT"), get("LIA"), get("LIT")),
    ST_CONVEXITY: angleAt(get("N'"), get("Sn"), get("Pog'")),
    ST_FH: acutePlaneAngle(get("N'"), get("Pog'"), po, or),
  };
}

export function cephAngleSummary(angles: CephAngles): string {
  return `SNA ${angles.SNA.toFixed(1)}°, SNB ${angles.SNB.toFixed(1)}°, ANB ${angles.ANB.toFixed(1)}°, FMA ${angles.FMA.toFixed(1)}°`;
}
