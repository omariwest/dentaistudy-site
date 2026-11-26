/// <reference lib="webworker" />
/** CephViT inference stays in the worker; no image leaves the browser. */
import * as ort from "onnxruntime-web";
import { cephLandmarks, type CephPoint } from "./cephGeometry";

const INPUT_SIZE = 512;
const HEAT_SIZE = 128;
const HEAT_AREA = HEAT_SIZE * HEAT_SIZE;
const MODEL_PATH = "/models/cephvit-dynamic-int8.onnx";
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
ort.env.wasm.numThreads = 1;
let sessionPromise: Promise<ort.InferenceSession> | null = null;

function reflect(index: number, length: number): number {
  if (index < 0) return -index;
  if (index >= length) return 2 * length - index - 2;
  return index;
}

function darkDecode(heatmaps: Float32Array, width: number, height: number): CephPoint[] {
  const kernel = 11;
  const radius = (kernel - 1) / 2;
  const sigma = kernel / 6;
  const weights = Float32Array.from({ length: kernel }, (_, i) =>
    Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const sum = weights.reduce((acc, value) => acc + value, 0);
  for (let i = 0; i < kernel; i++) weights[i] /= sum;

  return cephLandmarks.map((_, channel) => {
    const offset = channel * HEAT_AREA;
    const horizontal = new Float32Array(HEAT_AREA);
    const smooth = new Float32Array(HEAT_AREA);
    for (let y = 0; y < HEAT_SIZE; y++) {
      for (let x = 0; x < HEAT_SIZE; x++) {
        let value = 0;
        for (let i = -radius; i <= radius; i++) {
          value += heatmaps[offset + y * HEAT_SIZE + reflect(x + i, HEAT_SIZE)] *
            weights[i + radius];
        }
        horizontal[y * HEAT_SIZE + x] = value;
      }
    }
    let best = -Infinity;
    let peak = 0;
    for (let y = 0; y < HEAT_SIZE; y++) {
      for (let x = 0; x < HEAT_SIZE; x++) {
        let value = 0;
        for (let i = -radius; i <= radius; i++) {
          value += horizontal[reflect(y + i, HEAT_SIZE) * HEAT_SIZE + x] *
            weights[i + radius];
        }
        const index = y * HEAT_SIZE + x;
        smooth[index] = Math.log(Math.max(1e-10, value));
        if (smooth[index] > best) {
          best = smooth[index];
          peak = index;
        }
      }
    }
    let x = peak % HEAT_SIZE;
    let y = Math.floor(peak / HEAT_SIZE);
    if (x > 0 && x < HEAT_SIZE - 1 && y > 0 && y < HEAT_SIZE - 1) {
      const cell = (col: number, row: number) => smooth[row * HEAT_SIZE + col];
      const dx = (cell(x + 1, y) - cell(x - 1, y)) / 2;
      const dy = (cell(x, y + 1) - cell(x, y - 1)) / 2;
      const dxx = cell(x + 1, y) - 2 * cell(x, y) + cell(x - 1, y);
      const dyy = cell(x, y + 1) - 2 * cell(x, y) + cell(x, y - 1);
      const dxy = (cell(x + 1, y + 1) - cell(x - 1, y + 1) -
        cell(x + 1, y - 1) + cell(x - 1, y - 1)) / 4;
      const determinant = dxx * dyy - dxy * dxy;
      if (Math.abs(determinant) >= 1e-6) {
        const fractionalX = -(dyy * dx - dxy * dy) / determinant;
        const fractionalY = -(-dxy * dx + dxx * dy) / determinant;
        if (Number.isFinite(fractionalX) && Number.isFinite(fractionalY) &&
            Math.abs(fractionalX) <= 1.5 && Math.abs(fractionalY) <= 1.5) {
          x += fractionalX;
          y += fractionalY;
        }
      }
    }
    return {
      x: Math.max(0, Math.min(width, x * width / HEAT_SIZE)),
      y: Math.max(0, Math.min(height, y * height / HEAT_SIZE)),
    };
  });
}

type InferenceMessage = {
  kind: "run";
  id: number;
  pixels: Float32Array;
  width: number;
  height: number;
};

self.onmessage = async (event: MessageEvent<InferenceMessage>) => {
  const { id, pixels, width, height } = event.data;
  if (event.data.kind !== "run") return;
  try {
    self.postMessage({ kind: "status", id, text: "Loading cephalometric model…" });
    if (!sessionPromise) {
      sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      }).catch((error) => {
        sessionPromise = null;
        throw error;
      });
    }
    const session = await sessionPromise;
    self.postMessage({ kind: "status", id, text: "Detecting 29 landmarks…" });
    const output = await session.run({
      image: new ort.Tensor("float32", pixels, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    });
    const tensor = output.heatmaps;
    if (!tensor || tensor.dims.join(",") !== "1,29,128,128" ||
      !(tensor.data instanceof Float32Array)) {
      throw new Error("Model output format does not match CephViT v1.");
    }
    self.postMessage({ kind: "status", id, text: "Preparing landmark tracing…" });
    const points = darkDecode(tensor.data, width, height);
    self.postMessage({ kind: "result", id, points });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model inference failed.";
    self.postMessage({ kind: "error", id, message });
  }
};
