import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  MOUSE,
  Vector3,
} from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

type Jaw = "upper" | "lower" | "bite";
type EditMode = "add" | "erase";

type Topology = {
  neighbors: number[][];
  centroids: Float32Array;
  normals: Float32Array;
  diagonal: number;
};

type ScanAsset = {
  jaw: Jaw;
  fileName: string;
  geometry: BufferGeometry;
  topology: Topology;
};

type ToothSegment = {
  id: string;
  jaw: Exclude<Jaw, "bite">;
  label: string;
  faces: number[];
};

const jawLabels: Record<Jaw, string> = {
  upper: "Upper scan",
  lower: "Lower scan",
  bite: "Bite reference",
};

const upperTeeth = [
  "18","17","16","15","14","13","12","11",
  "21","22","23","24","25","26","27","28",
];

const lowerTeeth = [
  "48","47","46","45","44","43","42","41",
  "31","32","33","34","35","36","37","38",
];

function buildTopology(indexed: BufferGeometry): Topology {
  const position = indexed.getAttribute("position");
  const index = indexed.getIndex();

  if (!index) throw new Error("The scan could not be indexed for segmentation.");

  const faceCount = index.count / 3;
  const neighbors = Array.from({ length: faceCount }, () => [] as number[]);
  const centroids = new Float32Array(faceCount * 3);
  const normals = new Float32Array(faceCount * 3);
  const edgeOwner = new Map<string, number>();

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const normal = new Vector3();

  for (let face = 0; face < faceCount; face += 1) {
    const ia = index.getX(face * 3);
    const ib = index.getX(face * 3 + 1);
    const ic = index.getX(face * 3 + 2);

    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);

    centroids[face * 3] = (a.x + b.x + c.x) / 3;
    centroids[face * 3 + 1] = (a.y + b.y + c.y) / 3;
    centroids[face * 3 + 2] = (a.z + b.z + c.z) / 3;

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac).normalize();

    normals[face * 3] = normal.x;
    normals[face * 3 + 1] = normal.y;
    normals[face * 3 + 2] = normal.z;

    const edges: Array<[number, number]> = [
      [ia, ib],
      [ib, ic],
      [ic, ia],
    ];

    edges.forEach(([v1, v2]) => {
      const key = v1 < v2 ? `${v1}:${v2}` : `${v2}:${v1}`;
      const owner = edgeOwner.get(key);

      if (owner === undefined) {
        edgeOwner.set(key, face);
        return;
      }

      neighbors[face].push(owner);
      neighbors[owner].push(face);
    });
  }

  indexed.computeBoundingBox();
  const diagonal = indexed.boundingBox
    ? indexed.boundingBox.getSize(new Vector3()).length()
    : 1;

  return {
    neighbors,
    centroids,
    normals,
    diagonal: Math.max(0.001, diagonal),
  };
}

async function parseScan(file: File, jaw: Jaw): Promise<ScanAsset> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension !== "stl" && extension !== "ply") {
    throw new Error("Use an STL or PLY file.");
  }

  const bytes = await file.arrayBuffer();
  let geometry =
    extension === "stl"
      ? new STLLoader().parse(bytes)
      : new PLYLoader().parse(bytes);

  geometry.deleteAttribute("color");
  geometry.computeVertexNormals();

  const indexed = mergeVertices(geometry, 0.0001);
  indexed.computeVertexNormals();
  geometry.dispose();

  const topology = buildTopology(indexed);
  const display = indexed.toNonIndexed();
  indexed.dispose();

  display.computeVertexNormals();

  const colors = new Float32Array(display.getAttribute("position").count * 3);
  const base = new Color(jaw === "bite" ? "#8aa2b8" : "#ece9e0");

  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = base.r;
    colors[i + 1] = base.g;
    colors[i + 2] = base.b;
  }

  display.setAttribute("color", new BufferAttribute(colors, 3));

  return {
    jaw,
    fileName: file.name,
    geometry: display,
    topology,
  };
}

function facesNearPoint(
  topology: Topology,
  startFace: number,
  point: Vector3,
  brushPercent: number,
) {
  const radius = topology.diagonal * (brushPercent / 100);
  const radiusSq = radius * radius;
  const output = new Set<number>();
  const visited = new Set<number>();
  const queue = [startFace];

  const seedNormal = new Vector3(
    topology.normals[startFace * 3],
    topology.normals[startFace * 3 + 1],
    topology.normals[startFace * 3 + 2],
  );
  const candidateNormal = new Vector3();

  while (queue.length) {
    const face = queue.shift()!;
    if (visited.has(face)) continue;
    visited.add(face);

    const x = topology.centroids[face * 3];
    const y = topology.centroids[face * 3 + 1];
    const z = topology.centroids[face * 3 + 2];

    const dx = x - point.x;
    const dy = y - point.y;
    const dz = z - point.z;

    if (dx * dx + dy * dy + dz * dz > radiusSq) continue;

    candidateNormal.set(
      topology.normals[face * 3],
      topology.normals[face * 3 + 1],
      topology.normals[face * 3 + 2],
    );

    if (candidateNormal.dot(seedNormal) < 0.22) continue;

    output.add(face);
    topology.neighbors[face].forEach((next) => {
      if (!visited.has(next)) queue.push(next);
    });
  }

  return output;
}

function updateScanColors(
  asset: ScanAsset,
  activeFaces: Set<number>,
  segmentFaces: Set<number>,
) {
  const color = asset.geometry.getAttribute("color") as BufferAttribute;
  const base = new Color("#ece9e0");
  const saved = new Color("#71b99a");
  const active = new Color("#6d4cf5");

  const faceCount = asset.geometry.getAttribute("position").count / 3;

  for (let face = 0; face < faceCount; face += 1) {
    const tone = activeFaces.has(face)
      ? active
      : segmentFaces.has(face)
        ? saved
        : base;

    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = face * 3 + corner;
      color.setXYZ(vertex, tone.r, tone.g, tone.b);
    }
  }

  color.needsUpdate = true;
}

function segmentGeometry(asset: ScanAsset, faces: number[]) {
  const source = asset.geometry.getAttribute("position");
  const target = new Float32Array(faces.length * 9);

  faces.forEach((face, outputFace) => {
    for (let corner = 0; corner < 3; corner += 1) {
      const sourceVertex = face * 3 + corner;
      const output = outputFace * 9 + corner * 3;
      target[output] = source.getX(sourceVertex);
      target[output + 1] = source.getY(sourceVertex);
      target[output + 2] = source.getZ(sourceVertex);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(target, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function SegmentMesh({
  asset,
  segment,
}: {
  asset: ScanAsset;
  segment: ToothSegment;
}) {
  const geometry = useMemo(
    () => segmentGeometry(asset, segment.faces),
    [asset, segment.faces],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} raycast={() => null} renderOrder={3}>
      <meshStandardMaterial
        color="#4e9b7b"
        roughness={0.52}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function CameraRig({
  assets,
  alignJaw,
  alignMode,
  jawGroup,
}: {
  assets: ScanAsset[];
  alignJaw: Exclude<Jaw, "bite"> | null;
  alignMode: "translate" | "rotate";
  jawGroup: Group | null;
}) {
  const { camera, gl, scene } = useThree();
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);

  const bounds = useMemo(() => {
    const box = new Box3();

    assets.forEach((asset) => {
      asset.geometry.computeBoundingBox();
      if (asset.geometry.boundingBox) box.union(asset.geometry.boundingBox);
    });

    if (box.isEmpty()) {
      box.setFromCenterAndSize(new Vector3(), new Vector3(10, 10, 10));
    }

    return {
      center: box.getCenter(new Vector3()),
      radius: Math.max(1, box.getSize(new Vector3()).length() / 2),
    };
  }, [assets]);

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.enablePan = true;
    orbit.mouseButtons.RIGHT = MOUSE.PAN;
    orbit.target.copy(bounds.center);
    orbit.minDistance = bounds.radius * 0.8;
    orbit.maxDistance = bounds.radius * 8;

    camera.position
      .copy(bounds.center)
      .add(new Vector3(0, 0, bounds.radius * 2.8));
    camera.lookAt(bounds.center);
    orbit.update();
    orbitRef.current = orbit;

    return () => {
      orbit.dispose();
      orbitRef.current = null;
    };
  }, [bounds.center, bounds.radius, camera, gl.domElement]);

  useEffect(() => {
    if (!jawGroup || !alignJaw) return;

    const transform = new TransformControls(camera, gl.domElement);
    transform.setMode(alignMode);
    transform.setSize(0.8);
    transform.attach(jawGroup);
    scene.add(transform.getHelper());
    transformRef.current = transform;

    const onDown = () => {
      if (orbitRef.current) orbitRef.current.enabled = false;
    };
    const onUp = () => {
      if (orbitRef.current) orbitRef.current.enabled = true;
    };

    transform.addEventListener("mouseDown", onDown);
    transform.addEventListener("mouseUp", onUp);

    return () => {
      transform.detach();
      transform.removeEventListener("mouseDown", onDown);
      transform.removeEventListener("mouseUp", onUp);
      scene.remove(transform.getHelper());
      transform.dispose();
      transformRef.current = null;
    };
  }, [alignJaw, alignMode, camera, gl.domElement, jawGroup, scene]);

  return null;
}

function ScanScene({
  assets,
  segments,
  activeJaw,
  activeFaces,
  savedFaces,
  brushPercent,
  editMode,
  alignJaw,
  alignMode,
  onBrush,
}: {
  assets: ScanAsset[];
  segments: ToothSegment[];
  activeJaw: Exclude<Jaw, "bite">;
  activeFaces: Set<number>;
  savedFaces: Set<number>;
  brushPercent: number;
  editMode: EditMode;
  alignJaw: Exclude<Jaw, "bite"> | null;
  alignMode: "translate" | "rotate";
  onBrush: (faces: Set<number>, mode: EditMode) => void;
}) {
  const upperRef = useRef<Group>(null);
  const lowerRef = useRef<Group>(null);
  const [, forceGroups] = useState(0);

  useEffect(() => {
    forceGroups((value) => value + 1);
  }, [assets.length]);

  const activeAsset = assets.find((asset) => asset.jaw === activeJaw);

  useEffect(() => {
    if (!activeAsset) return;
    updateScanColors(activeAsset, activeFaces, savedFaces);
  }, [activeAsset, activeFaces, savedFaces]);

  const handleBrush = (event: ThreeEvent<PointerEvent>, asset: ScanAsset) => {
    if (alignJaw || asset.jaw !== activeJaw || event.faceIndex == null) return;

    event.stopPropagation();

    const mesh = event.object as Mesh;
    const localPoint = mesh.worldToLocal(event.point.clone());
    const faces = facesNearPoint(
      asset.topology,
      event.faceIndex,
      localPoint,
      brushPercent,
    );

    onBrush(faces, editMode);
  };

  const assetFor = (jaw: Jaw) => assets.find((asset) => asset.jaw === jaw);
  const segmentSet = (jaw: Exclude<Jaw, "bite">) =>
    segments.filter((segment) => segment.jaw === jaw);

  return (
    <>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#fffdf8", "#8b91a0", 1.5]} />
      <directionalLight position={[-5, 7, 8]} intensity={2.3} />
      <directionalLight position={[5, 1, -5]} intensity={1.1} />

      <group ref={upperRef}>
        {assetFor("upper") && (
          <>
            <mesh
              geometry={assetFor("upper")!.geometry}
              onPointerDown={(event) => handleBrush(event, assetFor("upper")!)}
            >
              <meshStandardMaterial
                vertexColors
                roughness={0.58}
                side={DoubleSide}
              />
            </mesh>
            {segmentSet("upper").map((segment) => (
              <SegmentMesh
                asset={assetFor("upper")!}
                segment={segment}
                key={segment.id}
              />
            ))}
          </>
        )}
      </group>

      <group ref={lowerRef}>
        {assetFor("lower") && (
          <>
            <mesh
              geometry={assetFor("lower")!.geometry}
              onPointerDown={(event) => handleBrush(event, assetFor("lower")!)}
            >
              <meshStandardMaterial
                vertexColors
                roughness={0.58}
                side={DoubleSide}
              />
            </mesh>
            {segmentSet("lower").map((segment) => (
              <SegmentMesh
                asset={assetFor("lower")!}
                segment={segment}
                key={segment.id}
              />
            ))}
          </>
        )}
      </group>

      {assetFor("bite") && (
        <mesh geometry={assetFor("bite")!.geometry}>
          <meshStandardMaterial
            color="#8aa2b8"
            transparent
            opacity={0.28}
            roughness={0.65}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <CameraRig
        assets={assets}
        alignJaw={alignJaw}
        alignMode={alignMode}
        jawGroup={
          alignJaw === "upper"
            ? upperRef.current
            : alignJaw === "lower"
              ? lowerRef.current
              : null
        }
      />
    </>
  );
}

function ScanUploadCard({
  jaw,
  asset,
  loading,
  onFile,
  onRemove,
}: {
  jaw: Jaw;
  asset?: ScanAsset;
  loading: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`scan-upload-card${asset ? " is-loaded" : ""}`}>
      <div>
        <span>{jawLabels[jaw]}</span>
        <strong>{asset ? asset.fileName : jaw === "bite" ? "Optional" : "Required"}</strong>
      </div>

      <div className="scan-upload-card__actions">
        {asset && (
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        )}
        <label className="scan-file-button">
          {loading ? "Reading…" : asset ? "Replace" : "Choose file"}
          <input
            type="file"
            accept=".stl,.ply,model/stl,application/sla"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function ScanWorkflow() {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [loadingJaw, setLoadingJaw] = useState<Jaw | null>(null);
  const [error, setError] = useState("");
  const [activeJaw, setActiveJaw] = useState<Exclude<Jaw, "bite">>("upper");
  const [editMode, setEditMode] = useState<EditMode>("add");
  const [brushPercent, setBrushPercent] = useState(2.2);
  const [activeFaces, setActiveFaces] = useState<Set<number>>(new Set());
  const [segments, setSegments] = useState<ToothSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [toothLabel, setToothLabel] = useState("11");
  const [alignJaw, setAlignJaw] = useState<Exclude<Jaw, "bite"> | null>(null);
  const [alignMode, setAlignMode] = useState<"translate" | "rotate">("translate");
  const assetsRef = useRef<ScanAsset[]>([]);

  const activeAsset = assets.find((asset) => asset.jaw === activeJaw);
  const teethForJaw = activeJaw === "upper" ? upperTeeth : lowerTeeth;

  const savedFaces = useMemo(() => {
    const output = new Set<number>();

    segments
      .filter((segment) => segment.jaw === activeJaw)
      .forEach((segment) => {
        segment.faces.forEach((face) => output.add(face));
      });

    return output;
  }, [activeJaw, segments]);

  useEffect(() => {
    if (!teethForJaw.includes(toothLabel)) {
      setToothLabel(teethForJaw[0]);
    }
  }, [teethForJaw, toothLabel]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(
    () => () => {
      assetsRef.current.forEach((asset) => asset.geometry.dispose());
    },
    [],
  );

  const setAsset = async (jaw: Jaw, file: File) => {
    setError("");
    setLoadingJaw(jaw);

    try {
      const next = await parseScan(file, jaw);

      setAssets((current) => {
        current.find((asset) => asset.jaw === jaw)?.geometry.dispose();
        return [...current.filter((asset) => asset.jaw !== jaw), next];
      });

      if (jaw !== "bite") {
        setSegments((current) => current.filter((segment) => segment.jaw !== jaw));
        setActiveFaces(new Set());
        setActiveSegmentId(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan could not be read.");
    } finally {
      setLoadingJaw(null);
    }
  };

  const removeAsset = (jaw: Jaw) => {
    setAssets((current) => {
      current.find((asset) => asset.jaw === jaw)?.geometry.dispose();
      return current.filter((asset) => asset.jaw !== jaw);
    });

    if (jaw !== "bite") {
      setSegments((current) => current.filter((segment) => segment.jaw !== jaw));
      setActiveFaces(new Set());
      setActiveSegmentId(null);
    }
  };

  const applyBrush = (faces: Set<number>, mode: EditMode) => {
    setActiveFaces((current) => {
      const next = new Set(current);

      faces.forEach((face) => {
        if (mode === "add") next.add(face);
        else next.delete(face);
      });

      return next;
    });
  };

  const saveSegment = () => {
    if (!activeAsset || activeFaces.size === 0) return;

    const faces = [...activeFaces];
    const id = activeSegmentId || `${activeJaw}-${toothLabel}-${Date.now()}`;

    setSegments((current) => {
      const others = current.filter((segment) => segment.id !== id);
      return [
        ...others,
        {
          id,
          jaw: activeJaw,
          label: toothLabel,
          faces,
        },
      ];
    });

    setActiveSegmentId(id);
  };

  const editSegment = (segment: ToothSegment) => {
    setActiveJaw(segment.jaw);
    setToothLabel(segment.label);
    setActiveSegmentId(segment.id);
    setActiveFaces(new Set(segment.faces));
    setAlignJaw(null);
  };

  const newSegment = () => {
    setActiveSegmentId(null);
    setActiveFaces(new Set());
  };

  const deleteSegment = (segmentId: string) => {
    setSegments((current) => current.filter((segment) => segment.id !== segmentId));
    if (activeSegmentId === segmentId) newSegment();
  };

  const upperReady = assets.some((asset) => asset.jaw === "upper");
  const lowerReady = assets.some((asset) => asset.jaw === "lower");
  const scanReady = upperReady && lowerReady;
  const movableCount = segments.length;

  return (
    <div className="scan-workflow">
      <div className="scan-workflow__top">
        <div>
          <span className="case-page-kicker">Patient scans</span>
          <h2>Import, align and segment the arches.</h2>
          <p>STL/PLY files are processed locally in the browser during this workflow.</p>
        </div>
        <div className="scan-workflow__status">
          <span>{movableCount}</span>
          <small>movable tooth segments</small>
        </div>
      </div>

      <div className="scan-upload-grid">
        {(["upper", "lower", "bite"] as Jaw[]).map((jaw) => (
          <ScanUploadCard
            jaw={jaw}
            asset={assets.find((asset) => asset.jaw === jaw)}
            loading={loadingJaw === jaw}
            onFile={(file) => void setAsset(jaw, file)}
            onRemove={() => removeAsset(jaw)}
            key={jaw}
          />
        ))}
      </div>

      {error && (
        <div className="scan-error" role="alert">
          <strong>Scan import failed</strong>
          <span>{error}</span>
        </div>
      )}

      {!scanReady ? (
        <div className="scan-empty-stage">
          <div>
            <strong>Upper and lower scans are required.</strong>
            <p>Add ordinary STL or PLY arch scans to start the patient-specific segmentation workflow. A bite reference is optional.</p>
          </div>
        </div>
      ) : (
        <div className="scan-editor">
          <div className="scan-editor__toolbar">
            <div className="scan-editor__toolbar-group">
              <button
                className={activeJaw === "upper" ? "is-active" : ""}
                type="button"
                onClick={() => {
                  setActiveJaw("upper");
                  newSegment();
                }}
              >
                Upper
              </button>
              <button
                className={activeJaw === "lower" ? "is-active" : ""}
                type="button"
                onClick={() => {
                  setActiveJaw("lower");
                  newSegment();
                }}
              >
                Lower
              </button>
            </div>

            <div className="scan-editor__toolbar-group">
              <button
                className={alignJaw === activeJaw ? "is-active" : ""}
                type="button"
                onClick={() => {
                  setAlignMode("translate");
                  setAlignJaw((current) => (current === activeJaw ? null : activeJaw));
                }}
              >
                {alignJaw === activeJaw ? "Finish alignment" : "Align jaw"}
              </button>
              {alignJaw === activeJaw && (
                <>
                  <button
                    className={alignMode === "translate" ? "is-active" : ""}
                    type="button"
                    onClick={() => setAlignMode("translate")}
                  >
                    Move
                  </button>
                  <button
                    className={alignMode === "rotate" ? "is-active" : ""}
                    type="button"
                    onClick={() => setAlignMode("rotate")}
                  >
                    Rotate
                  </button>
                </>
              )}
            </div>

            <div className="scan-editor__toolbar-group">
              <button
                className={editMode === "add" ? "is-active" : ""}
                type="button"
                disabled={alignJaw !== null}
                onClick={() => setEditMode("add")}
              >
                Add brush
              </button>
              <button
                className={editMode === "erase" ? "is-active" : ""}
                type="button"
                disabled={alignJaw !== null}
                onClick={() => setEditMode("erase")}
              >
                Erase
              </button>
            </div>

            <label className="scan-brush-size">
              <span>Brush</span>
              <input
                type="range"
                min="0.8"
                max="6"
                step="0.2"
                value={brushPercent}
                onChange={(event) => setBrushPercent(Number(event.target.value))}
              />
              <small>{brushPercent.toFixed(1)}%</small>
            </label>
          </div>

          <div className="scan-editor__body">
            <div className="scan-canvas">
              <Canvas camera={{ fov: 36, near: 0.01, far: 100000 }} dpr={[1, 1.5]}>
                <color attach="background" args={["#bfc1c9"]} />
                <ScanScene
                  assets={assets}
                  segments={segments}
                  activeJaw={activeJaw}
                  activeFaces={activeFaces}
                  savedFaces={savedFaces}
                  brushPercent={brushPercent}
                  editMode={editMode}
                  alignJaw={alignJaw}
                  alignMode={alignMode}
                  onBrush={applyBrush}
                />
              </Canvas>

              <div className="scan-canvas__hint">
                {alignJaw
                  ? "Use the gizmo to align the active arch · right-drag pans · wheel zooms"
                  : "Click the tooth surface to paint · Add/Erase corrects the boundary · drag background to rotate"}
              </div>
            </div>

            <aside className="scan-segment-panel">
              <div className="scan-segment-panel__heading">
                <div>
                  <span>Tooth segmentation</span>
                  <strong>{activeJaw === "upper" ? "Upper arch" : "Lower arch"}</strong>
                </div>
                <button type="button" onClick={newSegment}>
                  New
                </button>
              </div>

              <label className="scan-tooth-label">
                <span>FDI tooth</span>
                <select
                  value={toothLabel}
                  onChange={(event) => setToothLabel(event.target.value)}
                >
                  {teethForJaw.map((tooth) => (
                    <option value={tooth} key={tooth}>
                      {tooth}
                    </option>
                  ))}
                </select>
              </label>

              <div className="scan-selection-summary">
                <span>Selected surface</span>
                <strong>{activeFaces.size.toLocaleString()} triangles</strong>
                <small>
                  {activeSegmentId
                    ? "Editing an existing tooth segment"
                    : "Paint the crown surface, then save the tooth"}
                </small>
              </div>

              <button
                className="scan-save-segment"
                type="button"
                disabled={activeFaces.size === 0}
                onClick={saveSegment}
              >
                {activeSegmentId ? "Update tooth segment" : "Create movable tooth"}
              </button>

              <div className="scan-segment-list">
                {segments
                  .filter((segment) => segment.jaw === activeJaw)
                  .map((segment) => (
                    <div
                      className={`scan-segment-row${activeSegmentId === segment.id ? " is-active" : ""}`}
                      key={segment.id}
                    >
                      <button type="button" onClick={() => editSegment(segment)}>
                        <span>FDI {segment.label}</span>
                        <small>{segment.faces.length.toLocaleString()} triangles</small>
                      </button>
                      <button
                        className="scan-segment-row__delete"
                        type="button"
                        aria-label={`Delete tooth ${segment.label}`}
                        onClick={() => deleteSegment(segment.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {!segments.some((segment) => segment.jaw === activeJaw) && (
                  <p className="scan-segment-list__empty">No teeth segmented in this arch yet.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="scan-workflow__footer">
        <span>
          {scanReady
            ? movableCount
              ? `${movableCount} independent tooth mesh${movableCount === 1 ? "" : "es"} created.`
              : "Scans are loaded. Segment at least one tooth to verify the movable-tooth path."
            : "Waiting for upper + lower scans."}
        </span>
        <strong>
          {assets.some((asset) => asset.jaw === "bite")
            ? "Bite reference loaded"
            : "Bite reference optional"}
        </strong>
      </div>
    </div>
  );
}
