import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import UiSelect from "./UiSelect";
import {
  cephAngles,
  cephAngleSummary,
  cephLandmarks,
  type CephLandmark,
  type CephPoint,
  type CephTrace,
} from "./cephGeometry";

type SourcePhoto = { name: string; file: File; previewUrl: string };
type WorkerResult =
  | { kind: "status"; id: number; text: string }
  | { kind: "result"; id: number; points: CephPoint[] }
  | { kind: "error"; id: number; message: string };

const keyLandmarks: CephLandmark[] = ["S", "N", "A", "B", "Po", "Or", "Go", "Me"];
const modelBytes = 90.5;

async function prepareCephInput(file: File): Promise<{
  input: Float32Array;
  width: number;
  height: number;
}> {
  const bitmap = await createImageBitmap(file);
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    if (!width || !height) throw new Error("Unable to read the radiograph dimensions.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    // The NIH reference inference stretches the image to 512 × 512; channels are BGR / 255.
    context.drawImage(bitmap, 0, 0, 512, 512);
    const rgba = context.getImageData(0, 0, 512, 512).data;
    const pixels = new Float32Array(3 * 512 * 512);
    const plane = 512 * 512;
    for (let i = 0; i < plane; i++) {
      const p = i * 4;
      pixels[i] = rgba[p + 2] / 255;
      pixels[i + plane] = rgba[p + 1] / 255;
      pixels[i + 2 * plane] = rgba[p] / 255;
    }
    return { input: pixels, width, height };
  } finally {
    bitmap.close();
  }
}

export default function CephAnalysis({
  photo,
  trace,
  onTraceChange,
  onApprove,
  onOpenRecords,
}: {
  photo?: SourcePhoto;
  trace: CephTrace | null;
  onTraceChange: (next: CephTrace | null) => void;
  onApprove: (next: CephTrace) => void;
  onOpenRecords: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CephLandmark>("N");
  const [showAll, setShowAll] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const workerRef = useRef<Worker | null>(null);
  const runRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<number | null>(null);

  useEffect(() => () => {
    runRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    runRef.current += 1;
    setBusy(false);
    setProgress("");
    setError("");
    setDimensions({ width: 0, height: 0 });
    dragRef.current = null;
  }, [photo?.previewUrl]);

  const current = photo && trace?.imageUrl === photo.previewUrl ? trace : null;
  const currentAngles = current ? cephAngles(current.points) : null;
  const imageWidth = current?.imageWidth || dimensions.width;
  const imageHeight = current?.imageHeight || dimensions.height;

  const run = async () => {
    if (!photo || busy) return;
    const request = ++runRef.current;
    setBusy(true);
    setError("");
    setProgress("Preparing radiograph…");
    workerRef.current?.terminate();
    workerRef.current = null;
    try {
      const { input, width, height } = await prepareCephInput(photo.file);
      if (request !== runRef.current) return;
      setDimensions({ width, height });
      const worker = new Worker(new URL("./cephInference.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        if (event.data.id !== runRef.current) return;
        if (event.data.kind === "status") {
          setProgress(event.data.text);
          return;
        }
        if (event.data.kind === "error") {
          setError("Automatic tracing could not complete. Please retry on a supported desktop browser.");
          setBusy(false);
          setProgress("");
        } else {
          if (event.data.points.length !== cephLandmarks.length) {
            setError("The model returned an incomplete set of landmarks.");
          } else {
            onTraceChange({
              imageUrl: photo.previewUrl,
              imageWidth: width,
              imageHeight: height,
              points: event.data.points,
              approved: false,
              corrected: false,
            });
            setSelected("N");
          }
          setBusy(false);
          setProgress("");
        }
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      };
      worker.onerror = () => {
        if (request !== runRef.current) return;
        setError("The model could not start in this browser.");
        setBusy(false);
        setProgress("");
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      };
      worker.postMessage({ kind: "run", id: request, pixels: input, width, height }, [input.buffer]);
    } catch {
      if (request !== runRef.current) return;
      setError("Could not read the radiograph. Choose another JPG, PNG or WebP.");
      setBusy(false);
      setProgress("");
    }
  };

  const moveLandmark = (index: number, point: CephPoint) => {
    if (!current) return;
    const nextPoints = current.points.slice();
    nextPoints[index] = {
      x: Math.max(0, Math.min(current.imageWidth, point.x)),
      y: Math.max(0, Math.min(current.imageHeight, point.y)),
    };
    onTraceChange({ ...current, points: nextPoints, corrected: true, approved: false });
  };

  const imageCoords = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const mapped = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  };

  const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current === null) return;
    const point = imageCoords(event);
    if (point) moveLandmark(dragRef.current, point);
  };
  const onStop = () => {
    dragRef.current = null;
  };
  const pointAt = (landmark: CephLandmark) => current?.points[cephLandmarks.indexOf(landmark)];
  const lines: Array<[CephLandmark, CephLandmark]> = [
    ["S", "N"], ["N", "A"], ["N", "B"], ["Po", "Or"], ["Go", "Me"],
  ];
  const pointRadius = Math.max(4, imageWidth / 230);

  return (
    <div className="ceph-tracing">
      <div className="ceph-tracing__heading">
        <div>
          <strong>Automatic landmark tracing</strong>
          <p>CephViT · 29 landmarks · processed in your browser</p>
        </div>
        {current && <span className={current.approved ? "ceph-tracing__status is-approved" : "ceph-tracing__status"}>
          {current.approved ? "Clinician verified" : "Review required"}
        </span>}
      </div>

      {!photo ? (
        <div className="ceph-tracing__empty">
          <p>Add a lateral cephalogram to Clinical Records to start tracing.</p>
          <button className="app-quiet-button" type="button" onClick={onOpenRecords}>
            Open Clinical Records
          </button>
        </div>
      ) : (
        <>
          <div className="ceph-tracing__actions">
            <button type="button" className="app-quiet-button" disabled={busy}
              onClick={() => void run()}>
              {busy ? "Running analysis…" : current ? "Run again" : "Detect landmarks"}
            </button>
            {current && (
              <>
                <button className="app-quiet-button" type="button"
                  onClick={() => setShowAll((value) => !value)}>
                  {showAll ? "Key landmarks" : "All 29 landmarks"}
                </button>
                <div className="ceph-tracing__selector">
                  <UiSelect
                    ariaLabel="Select cephalometric landmark"
                    value={selected}
                    options={cephLandmarks.map((landmark) => landmark)}
                    onChange={(value) => setSelected(value as CephLandmark)}
                  />
                </div>
              </>
            )}
          </div>

          {busy && <p className="ceph-tracing__progress" role="status">{progress || "Processing…"}</p>}
          {error && <p className="case-photo-error" role="alert">{error}</p>}
          <div className="ceph-tracing__viewer">
            {imageWidth > 0 && imageHeight > 0 ? (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="ceph-tracing__svg"
                aria-label="Lateral cephalogram with editable landmark positions"
                onPointerMove={onMove}
                onPointerUp={onStop}
                onPointerCancel={onStop}
              >
                <image href={photo.previewUrl} width={imageWidth} height={imageHeight} />
                {current && lines.map(([a, b]) => {
                  const from = pointAt(a), to = pointAt(b);
                  return from && to ? (
                    <line key={a + b} x1={from.x} y1={from.y}
                      x2={to.x} y2={to.y} className="ceph-tracing__line" />
                  ) : null;
                })}
                {current?.points.map((point, index) => {
                  const landmark = cephLandmarks[index];
                  if (!showAll && !keyLandmarks.includes(landmark) && selected !== landmark) return null;
                  return (
                    <g key={landmark} className="ceph-tracing__landmark">
                      <circle
                        cx={point.x} cy={point.y}
                        r={landmark === selected ? pointRadius * 1.8 : pointRadius * 1.3}
                        className={landmark === selected ? "is-selected" : ""}
                        role="button" tabIndex={0}
                        aria-label={`Move ${landmark} landmark`}
                        onPointerDown={(event) => {
                          setSelected(landmark);
                          dragRef.current = index;
                          event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onKeyDown={(event) => {
                          const delta = event.shiftKey ? 5 : 1;
                          const shifts: Record<string, [number, number]> = {
                            ArrowUp: [0, -delta], ArrowDown: [0, delta],
                            ArrowLeft: [-delta, 0], ArrowRight: [delta, 0],
                          };
                          const shift = shifts[event.key];
                          if (!shift) return;
                          event.preventDefault();
                          setSelected(landmark);
                          moveLandmark(index, { x: point.x + shift[0], y: point.y + shift[1] });
                        }}
                      />
                      <text x={point.x + pointRadius * 1.7} y={point.y - pointRadius * 1.4}
                        fontSize={Math.max(14, imageWidth / 70)}>
                        {landmark}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <img
                src={photo.previewUrl}
                alt="Uploaded lateral cephalogram awaiting landmark tracing"
                onLoad={(event) => setDimensions({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
              />
            )}
          </div>
          <p className="ceph-tracing__caption">Drag each landmark to correct it. Use arrow keys for fine adjustment.</p>
          {current && (
            <>
              <div className="ceph-tracing__measurements" aria-label="Calculated cephalometric angles">
                {(["SNA", "SNB", "ANB", "FMA"] as const).map((name) => (
                  <div key={name}>
                    <span>{name}</span>
                    <strong>{currentAngles ? currentAngles[name].toFixed(1) + "°" : "—"}</strong>
                  </div>
                ))}
              </div>
              <div className="ceph-tracing__approval">
                <small>Verify landmarks.</small>
                <button
                  type="button"
                  className="app-primary-action"
                  disabled={!currentAngles || current.approved || busy}
                  onClick={() => onApprove({ ...current, approved: true })}
                >
                  {current.approved ? "Measurements verified" : "Approve measurements"}
                </button>
              </div>
              {current.approved && currentAngles && (
                <p className="ceph-tracing__confirmed" role="status">
                  {cephAngleSummary(currentAngles)} · Reviewed by clinician
                </p>
              )}
            </>
          )}
          <p className="ceph-tracing__credit">
            CephViT research model, NIH/NLM · <a href="https://huggingface.co/nlm-dir/CephViT"
              target="_blank" rel="noreferrer">Source and attribution</a>
            {" · "}OpenMDW 1.1
            {" · "}Initial model download {modelBytes.toFixed(1)} MB
          </p>
        </>
      )}
    </div>
  );
}
