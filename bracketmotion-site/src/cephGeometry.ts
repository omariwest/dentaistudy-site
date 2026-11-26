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

export function cephAngles(points: readonly CephPoint[]): CephAngles | null {
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
  return { SNA, SNB, ANB: SNA - SNB, FMA };
}

export function cephAngleSummary(angles: CephAngles): string {
  return \`SNA \${angles.SNA.toFixed(1)}°, SNB \${angles.SNB.toFixed(1)}°, ANB \${angles.ANB.toFixed(1)}°, FMA \${angles.FMA.toFixed(1)}°\`;
}
