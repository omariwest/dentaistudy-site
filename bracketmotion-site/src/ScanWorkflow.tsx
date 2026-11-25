import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  BufferAttribute,
  CatmullRomCurve3,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  MOUSE,
  Quaternion,
  Vector3,
} from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  downloadBracketMotionScan,
  removeBracketMotionScan,
  uploadBracketMotionScan,
} from "./supabase";
import UiSelect from "./UiSelect";
import NumberInput from "./NumberInput";

type Jaw = "upper" | "lower" | "bite";
type EditMode = "add" | "erase";
type SegmentationInteraction = "orbit" | EditMode;
type SetupMode = "translate" | "rotate";
type VectorTuple = [number, number, number];

type RigidTransform = {
  position: VectorTuple;
  rotation: VectorTuple;
};

type Topology = {
  neighbors: number[][];
  centroids: Float32Array;
  normals: Float32Array;
  diagonal: number;
};

type ScanAsset = {
  jaw: Jaw;
  fileName: string;
  storagePath?: string;
  geometry: BufferGeometry;
  topology: Topology;
};

type ToothSegment = {
  id: string;
  jaw: Exclude<Jaw, "bite">;
  label: string;
  faces: number[];
};

const identityTransform = (): RigidTransform => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0],
});

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

const firstPremolarPair: Record<string, string> = {
  "14": "24",
  "24": "14",
  "44": "34",
  "34": "44",
};

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
  const parsed =
    extension === "stl"
      ? new STLLoader().parse(bytes)
      : new PLYLoader().parse(bytes);

  const triangleGeometry = parsed.index ? parsed.toNonIndexed() : parsed;

  if (
    triangleGeometry.getAttribute("position").count < 3 ||
    triangleGeometry.getAttribute("position").count % 3 !== 0
  ) {
    if (triangleGeometry !== parsed) triangleGeometry.dispose();
    parsed.dispose();
    throw new Error("The scan must contain a triangulated surface mesh.");
  }

  const positionOnly = new BufferGeometry();
  positionOnly.setAttribute(
    "position",
    triangleGeometry.getAttribute("position").clone(),
  );

  if (triangleGeometry !== parsed) triangleGeometry.dispose();
  parsed.dispose();

  const indexed = mergeVertices(positionOnly, 0.0001);
  positionOnly.dispose();
  indexed.computeVertexNormals();

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
  onJawTransform,
}: {
  assets: ScanAsset[];
  alignJaw: Exclude<Jaw, "bite"> | null;
  alignMode: "translate" | "rotate";
  jawGroup: Group | null;
  onJawTransform: (jaw: Exclude<Jaw, "bite">, transform: RigidTransform) => void;
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
    const onObjectChange = () => {
      if (!alignJaw) return;
      onJawTransform(alignJaw, {
        position: [jawGroup.position.x, jawGroup.position.y, jawGroup.position.z],
        rotation: [jawGroup.rotation.x, jawGroup.rotation.y, jawGroup.rotation.z],
      });
    };

    transform.addEventListener("mouseDown", onDown);
    transform.addEventListener("mouseUp", onUp);
    transform.addEventListener("objectChange", onObjectChange);

    return () => {
      transform.detach();
      transform.removeEventListener("mouseDown", onDown);
      transform.removeEventListener("mouseUp", onUp);
      transform.removeEventListener("objectChange", onObjectChange);
      scene.remove(transform.getHelper());
      transform.dispose();
      transformRef.current = null;
    };
  }, [alignJaw, alignMode, camera, gl.domElement, jawGroup, onJawTransform, scene]);

  return null;
}

function ScanScene({
  assets,
  segments,
  activeJaw,
  activeFaces,
  savedFaces,
  brushPercent,
  interactionMode,
  alignJaw,
  alignMode,
  jawTransforms,
  onJawTransform,
  onBrush,
}: {
  assets: ScanAsset[];
  segments: ToothSegment[];
  activeJaw: Exclude<Jaw, "bite">;
  activeFaces: Set<number>;
  savedFaces: Set<number>;
  brushPercent: number;
  interactionMode: SegmentationInteraction;
  alignJaw: Exclude<Jaw, "bite"> | null;
  alignMode: "translate" | "rotate";
  jawTransforms: Record<Exclude<Jaw, "bite">, RigidTransform>;
  onJawTransform: (jaw: Exclude<Jaw, "bite">, transform: RigidTransform) => void;
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

  const handleBrush = (event: ThreeEvent<MouseEvent>, asset: ScanAsset) => {
    if (
      alignJaw ||
      interactionMode === "orbit" ||
      asset.jaw !== activeJaw ||
      event.faceIndex == null ||
      event.delta > 4
    ) {
      return;
    }

    event.stopPropagation();

    const mesh = event.object as Mesh;
    const localPoint = mesh.worldToLocal(event.point.clone());
    const faces = facesNearPoint(
      asset.topology,
      event.faceIndex,
      localPoint,
      brushPercent,
    );

    onBrush(faces, interactionMode);
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

      <group
        ref={upperRef}
        position={jawTransforms.upper.position}
        rotation={jawTransforms.upper.rotation}
      >
        {assetFor("upper") && (
          <>
            <mesh
              geometry={assetFor("upper")!.geometry}
              onClick={(event) => handleBrush(event, assetFor("upper")!)}
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

      <group
        ref={lowerRef}
        position={jawTransforms.lower.position}
        rotation={jawTransforms.lower.rotation}
      >
        {assetFor("lower") && (
          <>
            <mesh
              geometry={assetFor("lower")!.geometry}
              onClick={(event) => handleBrush(event, assetFor("lower")!)}
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
        onJawTransform={onJawTransform}
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


function segmentLocalBox(asset: ScanAsset, segment: ToothSegment) {
  const source = asset.geometry.getAttribute("position");
  const box = new Box3();
  const point = new Vector3();

  segment.faces.forEach((face) => {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = face * 3 + corner;
      point.set(source.getX(vertex), source.getY(vertex), source.getZ(vertex));
      box.expandByPoint(point);
    }
  });

  return box;
}

function transformMatrix(transform: RigidTransform) {
  return new Matrix4().compose(
    new Vector3(...transform.position),
    new Quaternion().setFromEuler(new Euler(...transform.rotation)),
    new Vector3(1, 1, 1),
  );
}

function targetWorldBox(
  asset: ScanAsset,
  segment: ToothSegment,
  jawTransform: RigidTransform,
  toothTransform: RigidTransform,
) {
  const localBox = segmentLocalBox(asset, segment);
  const center = localBox.getCenter(new Vector3());

  const aroundCenter = new Matrix4()
    .makeTranslation(
      center.x + toothTransform.position[0],
      center.y + toothTransform.position[1],
      center.z + toothTransform.position[2],
    )
    .multiply(
      new Matrix4().makeRotationFromEuler(new Euler(...toothTransform.rotation)),
    )
    .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));

  return localBox
    .clone()
    .applyMatrix4(transformMatrix(jawTransform).multiply(aroundCenter));
}

function shrinkBox(box: Box3, factor: number) {
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3()).multiplyScalar(factor);
  return new Box3().setFromCenterAndSize(center, size);
}

function boxDistance(a: Box3, b: Box3) {
  const dx = Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x);
  const dy = Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y);
  const dz = Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function TargetTooth({
  asset,
  segment,
  transform,
  displayTarget,
  selected,
  collision,
  contact,
  onSelect,
  onReady,
}: {
  asset: ScanAsset;
  segment: ToothSegment;
  transform: RigidTransform;
  displayTarget: boolean;
  selected: boolean;
  collision: boolean;
  contact: boolean;
  onSelect: () => void;
  onReady: (id: string, object: Group | null) => void;
}) {
  const prepared = useMemo(() => {
    const geometry = segmentGeometry(asset, segment.faces);
    geometry.computeBoundingBox();
    const center = geometry.boundingBox?.getCenter(new Vector3()) || new Vector3();
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.computeBoundingBox();
    return { geometry, center };
  }, [asset, segment.faces]);

  useEffect(() => () => prepared.geometry.dispose(), [prepared.geometry]);

  const position: VectorTuple = displayTarget
    ? [
        prepared.center.x + transform.position[0],
        prepared.center.y + transform.position[1],
        prepared.center.z + transform.position[2],
      ]
    : [prepared.center.x, prepared.center.y, prepared.center.z];

  const rotation: VectorTuple = displayTarget
    ? transform.rotation
    : [0, 0, 0];

  const registerRef = useCallback(
    (object: Group | null) => onReady(segment.id, object),
    [onReady, segment.id],
  );

  const color = collision
    ? "#c95656"
    : selected
      ? "#6d4cf5"
      : contact
        ? "#d29a3a"
        : "#4e9b7b";

  return (
    <group
      ref={registerRef}
      position={position}
      rotation={rotation}
      userData={{ pivot: prepared.center.toArray() }}
    >
      <mesh
        geometry={prepared.geometry}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

function TargetSetupCamera({
  assets,
  selectedObject,
  transformMode,
  editingEnabled,
  onTransform,
}: {
  assets: ScanAsset[];
  selectedObject: Group | null;
  transformMode: SetupMode;
  editingEnabled: boolean;
  onTransform: (transform: RigidTransform) => void;
}) {
  const { camera, gl, scene } = useThree();
  const orbitRef = useRef<OrbitControls | null>(null);

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
    if (!selectedObject || !editingEnabled) return;

    const transform = new TransformControls(camera, gl.domElement);
    transform.setMode(transformMode);
    transform.setSize(0.75);
    transform.attach(selectedObject);
    scene.add(transform.getHelper());

    const onDown = () => {
      if (orbitRef.current) orbitRef.current.enabled = false;
    };
    const onUp = () => {
      if (orbitRef.current) orbitRef.current.enabled = true;
    };
    const onObjectChange = () => {
      const pivot = selectedObject.userData.pivot as number[] | undefined;
      if (!pivot) return;

      onTransform({
        position: [
          selectedObject.position.x - pivot[0],
          selectedObject.position.y - pivot[1],
          selectedObject.position.z - pivot[2],
        ],
        rotation: [
          selectedObject.rotation.x,
          selectedObject.rotation.y,
          selectedObject.rotation.z,
        ],
      });
    };

    transform.addEventListener("mouseDown", onDown);
    transform.addEventListener("mouseUp", onUp);
    transform.addEventListener("objectChange", onObjectChange);

    return () => {
      transform.detach();
      transform.removeEventListener("mouseDown", onDown);
      transform.removeEventListener("mouseUp", onUp);
      transform.removeEventListener("objectChange", onObjectChange);
      scene.remove(transform.getHelper());
      transform.dispose();
    };
  }, [camera, editingEnabled, gl.domElement, onTransform, scene, selectedObject, transformMode]);

  return null;
}

function TargetSetupScene({
  assets,
  segments,
  jawTransforms,
  targetTransforms,
  plannedExtractionIds,
  selectedId,
  transformMode,
  displayTarget,
  collisionIds,
  contactIds,
  onSelect,
  onTransform,
}: {
  assets: ScanAsset[];
  segments: ToothSegment[];
  jawTransforms: Record<Exclude<Jaw, "bite">, RigidTransform>;
  targetTransforms: Record<string, RigidTransform>;
  plannedExtractionIds: Set<string>;
  selectedId: string | null;
  transformMode: SetupMode;
  displayTarget: boolean;
  collisionIds: Set<string>;
  contactIds: Set<string>;
  onSelect: (id: string) => void;
  onTransform: (id: string, transform: RigidTransform) => void;
}) {
  const objectRefs = useRef(new Map<string, Group>());
  const [registryVersion, setRegistryVersion] = useState(0);

  const registerObject = useCallback((id: string, object: Group | null) => {
    const current = objectRefs.current.get(id);

    if (object) {
      if (current !== object) {
        objectRefs.current.set(id, object);
        setRegistryVersion((value) => value + 1);
      }
      return;
    }

    if (current) {
      objectRefs.current.delete(id);
      setRegistryVersion((value) => value + 1);
    }
  }, []);

  const selectedObject = selectedId
    ? objectRefs.current.get(selectedId) || null
    : null;

  void registryVersion;

  return (
    <>
      <ambientLight intensity={1.05} />
      <hemisphereLight args={["#fffdf8", "#8b91a0", 1.5]} />
      <directionalLight position={[-5, 7, 8]} intensity={2.3} />
      <directionalLight position={[5, 1, -5]} intensity={1.1} />

      {(["upper", "lower"] as const).map((jaw) => {
        const asset = assets.find((item) => item.jaw === jaw);
        if (!asset) return null;

        return (
          <group
            position={jawTransforms[jaw].position}
            rotation={jawTransforms[jaw].rotation}
            key={jaw}
          >
            <mesh geometry={asset.geometry} raycast={() => null}>
              <meshStandardMaterial
                color="#d8d8d5"
                transparent
                opacity={0.13}
                roughness={0.72}
                side={DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {segments
              .filter(
                (segment) =>
                  segment.jaw === jaw &&
                  (!displayTarget || !plannedExtractionIds.has(segment.id)),
              )
              .map((segment) => (
                <TargetTooth
                  asset={asset}
                  segment={segment}
                  transform={targetTransforms[segment.id] || identityTransform()}
                  displayTarget={displayTarget}
                  selected={segment.id === selectedId}
                  collision={collisionIds.has(segment.id)}
                  contact={contactIds.has(segment.id)}
                  onSelect={() => onSelect(segment.id)}
                  onReady={registerObject}
                  key={segment.id}
                />
              ))}
          </group>
        );
      })}

      <TargetSetupCamera
        assets={assets}
        selectedObject={selectedObject}
        transformMode={transformMode}
        editingEnabled={displayTarget}
        onTransform={(transform) => {
          if (selectedId) onTransform(selectedId, transform);
        }}
      />
    </>
  );
}


type ApplianceLayerState = {
  brackets: boolean;
  archwire: boolean;
  powerChain: boolean;
  coilSpring: boolean;
  elastics: boolean;
  closingLoop: boolean;
};

type BracketPrescription = "Roth" | "MBT";
type WireMaterial = "NiTi" | "SS" | "TMA";
type WireSize = "0.014" | "0.016" | "0.016x0.022" | "0.017x0.025" | "0.019x0.025";
type LigatureColor = "None" | "Clear" | "Silver" | "Purple";
type ApplianceStep = "strap" | "wire" | "ties";

type AppliancePreferences = {
  prescription: BracketPrescription;
  material: WireMaterial;
  size: WireSize;
  ligature: LigatureColor;
  bondedTeeth: string[] | null;
};

const defaultAppliancePreferences: AppliancePreferences = {
  prescription: "Roth",
  material: "NiTi",
  size: "0.014",
  ligature: "Silver",
  bondedTeeth: null,
};

type MechanicEndpoints = {
  chainStart: string;
  chainEnd: string;
  coilStart: string;
  coilEnd: string;
  elasticUpper: string;
  elasticLower: string;
  loopStart: string;
  loopEnd: string;
};

type MechanicsScenario = {
  layers: ApplianceLayerState;
  endpoints: MechanicEndpoints;
};

type MechanicsComparison = {
  alternative: MechanicsScenario | null;
  active: "A" | "B";
};

const emptyMechanicsComparison = (): MechanicsComparison => ({
  alternative: null,
  active: "A",
});

export type ScanPersistenceState = {
  version: 1;
  files: Partial<
    Record<Jaw, { fileName: string; storagePath: string }>
  >;
  segments: ToothSegment[];
  jawTransforms: Record<Exclude<Jaw, "bite">, RigidTransform>;
  targetTransforms: Record<string, RigidTransform>;
  plannedExtractions: string[];
  setupApproved: boolean;
  applianceLayers: ApplianceLayerState;
  mechanicEndpoints: MechanicEndpoints;
  appliancePreferences?: AppliancePreferences;
  mechanicsComparison?: MechanicsComparison;
};

export type StagePersistenceState = {
  version: 1;
  stages: Array<{
    id: string;
    title: string;
    progress: number;
    activeUnits: string;
    anchorageUnits: string;
    intendedMovement: string;
    reciprocalEffects: string;
    warning: string;
    controlStrategy: string;
  }>;
};

export type StageAiReviewResult = {
  clinical_assessment?: string;
  concerns?: Array<{
    issue?: string;
    why_it_matters?: string;
    source_ids?: string[];
  }>;
  stage_guidance?: Array<{
    stage?: string;
    active_unit?: string;
    anchorage_unit?: string;
    movement_tendency?: string;
    reciprocal_effects?: string;
    control_strategy?: string;
    source_ids?: string[];
  }>;
  missing_information?: string[];
  boundary?: string;
};

type StageDefinition = {
  id: string;
  title: string;
  progress: number;
  activeUnits: string;
  anchorageUnits: string;
  intendedMovement: string;
  reciprocalEffects: string;
  warning: string;
  controlStrategy: string;
  layers: ApplianceLayerState;
};

function toothTransformChanged(transform: RigidTransform) {
  const translation = new Vector3(...transform.position).length();
  const rotation =
    Math.abs(transform.rotation[0]) +
    Math.abs(transform.rotation[1]) +
    Math.abs(transform.rotation[2]);

  return translation > 0.01 || rotation > 0.005;
}

function labelsBetween(start: string, end: string) {
  const sequence = upperTeeth.includes(start)
    ? upperTeeth
    : lowerTeeth.includes(start)
      ? lowerTeeth
      : [];

  if (!sequence.length || !sequence.includes(end)) return [start, end].filter(Boolean);

  const startIndex = sequence.indexOf(start);
  const endIndex = sequence.indexOf(end);
  const low = Math.min(startIndex, endIndex);
  const high = Math.max(startIndex, endIndex);

  return sequence.slice(low, high + 1);
}

function scaleTargetTransforms(
  targetTransforms: Record<string, RigidTransform>,
  progress: number,
) {
  return Object.fromEntries(
    Object.entries(targetTransforms).map(([id, transform]) => [
      id,
      {
        position: transform.position.map((value) => value * progress) as VectorTuple,
        rotation: transform.rotation.map((value) => value * progress) as VectorTuple,
      },
    ]),
  );
}

function deriveStages({
  segments,
  targetTransforms,
  plannedExtractions,
  applianceLayers,
  endpoints,
}: {
  segments: ToothSegment[];
  targetTransforms: Record<string, RigidTransform>;
  plannedExtractions: Set<string>;
  applianceLayers: ApplianceLayerState;
  endpoints: MechanicEndpoints;
}) {
  const stages: Omit<StageDefinition, "progress">[] = [];
  const movedLabels = segments
    .filter((segment) =>
      toothTransformChanged(targetTransforms[segment.id] || identityTransform()),
    )
    .map((segment) => segment.label);

  const baseLayers: ApplianceLayerState = {
    brackets: true,
    archwire: true,
    powerChain: false,
    coilSpring: false,
    elastics: false,
    closingLoop: false,
  };

  const extractionLabels = segments
    .filter((segment) => plannedExtractions.has(segment.id))
    .map((segment) => segment.label);

  if (extractionLabels.length) {
    stages.push({
      id: "extractions",
      title: "Planned extractions + space preparation",
      activeUnits: extractionLabels.map((label) => `FDI ${label}`).join(", "),
      anchorageUnits:
        "Remaining teeth in the involved arch; anchorage demand is defined by the approved space-closure strategy.",
      intendedMovement:
        "Remove the clinician-selected symmetric first-premolar pair before closing the resulting extraction space toward the approved target.",
      reciprocalEffects:
        "Extraction changes the available space and anchorage balance; subsequent retraction or protraction produces reciprocal effects in the opposing unit.",
      warning:
        "Confirm the planned extraction teeth clinically before treatment. BracketMotion does not decide which teeth should be extracted.",
      controlStrategy:
        "Verify the symmetric extraction prescription, preserve the intended anchorage unit and begin space closure only after the clinician confirms the extraction stage.",
      layers: {
        brackets: true,
        archwire: true,
        powerChain: false,
        coilSpring: false,
        elastics: false,
        closingLoop: false,
      },
    });
  }

  if (movedLabels.length) {
    stages.push({
      id: "alignment",
      title: "Alignment + leveling",
      activeUnits: movedLabels.join(", "),
      anchorageUnits:
        "Remaining bonded teeth in each arch; reinforce locally when differential movement is required.",
      intendedMovement:
        "Progress the segmented teeth toward the approved setup while establishing alignment, leveling and arch coordination.",
      reciprocalEffects:
        "Continuous-wire engagement can redistribute force through neighboring teeth and can produce unwanted tipping while irregularity remains.",
      warning:
        "The 3D path is geometric. It does not predict delivered force, rate of movement or biologic response.",
      controlStrategy:
        "Progress wire stiffness only as engagement permits and monitor arch form, bracket engagement and unwanted tipping.",
      layers: baseLayers,
    });
  }

  const hasSpaceClosure =
    applianceLayers.powerChain ||
    applianceLayers.coilSpring ||
    applianceLayers.closingLoop;

  if (hasSpaceClosure) {
    const activeRanges = [
      applianceLayers.powerChain
        ? labelsBetween(endpoints.chainStart, endpoints.chainEnd)
        : [],
      applianceLayers.coilSpring
        ? labelsBetween(endpoints.coilStart, endpoints.coilEnd)
        : [],
      applianceLayers.closingLoop
        ? labelsBetween(endpoints.loopStart, endpoints.loopEnd)
        : [],
    ].flat();

    const activeLabels = [...new Set(activeRanges.filter(Boolean))];

    stages.push({
      id: "space-closure",
      title: "Space closure",
      activeUnits:
        activeLabels.length > 0
          ? activeLabels.join(", ")
          : "Selected space-closing units",
      anchorageUnits:
        "Remaining bonded teeth in the involved arch; enlarge or reinforce the anchorage unit when differential movement is desired.",
      intendedMovement:
        applianceLayers.closingLoop
          ? "Approximate the selected units while maintaining root-position control through the rectangular wire/loop system."
          : "Approximate the selected units by sliding along the archwire while preserving the approved arch form.",
      reciprocalEffects:
        "The opposing unit receives reciprocal force. Sliding also adds binding/resistance, increasing anchorage demand; incisor torque can add a forward reaction on posterior anchorage.",
      warning:
        "Space closure can lose anchorage or allow unwanted tipping if force, wire stiffness and root-control moments are not matched to the intended movement.",
      controlStrategy:
        "Use a rectangular base wire, define the anchorage requirement explicitly and monitor posterior protraction, incisor torque and root parallelism.",
      layers: {
        brackets: true,
        archwire: true,
        powerChain: applianceLayers.powerChain,
        coilSpring: applianceLayers.coilSpring,
        elastics: false,
        closingLoop: applianceLayers.closingLoop,
      },
    });
  }

  if (applianceLayers.elastics) {
    stages.push({
      id: "interarch",
      title: "Interarch correction",
      activeUnits:
        endpoints.elasticUpper && endpoints.elasticLower
          ? `FDI ${endpoints.elasticUpper} ↔ FDI ${endpoints.elasticLower}`
          : "Selected upper and lower attachment teeth",
      anchorageUnits:
        "Both arches through the complete fixed appliance and stabilizing archwires.",
      intendedMovement:
        "Apply a relative interarch correction along the selected elastic vector while maintaining the approved dental setup.",
      reciprocalEffects:
        "Equal and opposite forces act on both arches. The elastic vector can add vertical components, tooth extrusion and occlusal-plane change in addition to the intended sagittal correction.",
      warning:
        "Interarch elastics can alter incisor inclination, molar vertical position and transverse relationships if the arches are not adequately stabilized.",
      controlStrategy:
        "Use adequate stabilizing wires/full fixed appliances and monitor incisor inclination, molar extrusion, arch width and occlusal plane.",
      layers: {
        brackets: true,
        archwire: true,
        powerChain: false,
        coilSpring: false,
        elastics: true,
        closingLoop: false,
      },
    });
  }

  stages.push({
    id: "finishing",
    title: movedLabels.length ? "Finishing + settling" : "Appliance review",
    activeUnits: movedLabels.length ? movedLabels.join(", ") : "Configured appliance units",
    anchorageUnits: "Full-arch fixed appliance with the stabilized teeth acting as the reference unit.",
    intendedMovement: movedLabels.length
      ? "Complete residual alignment, torque/root-position control, arch coordination and settling to the approved target."
      : "No tooth movements are entered in the approved target. Review appliance and auxiliary placement only.",
    reciprocalEffects: movedLabels.length
      ? "Local torque and settling corrections can redistribute reaction forces through the arch or across both arches."
      : "Potential reactions depend on the clinician's selected mechanics, which are not calculated as delivered forces.",
    warning:
      "Final contact and root-position decisions require clinical and radiographic verification; geometric playback is not a biologic prediction.",
    controlStrategy: movedLabels.length
      ? "Use appropriate final rectangular wires for root control, limit auxiliaries to the remaining objective and remove anchorage auxiliaries once their task is complete."
      : "Define target tooth movements clinically before interpreting staged geometric changes.",
    layers: {
      brackets: true,
      archwire: true,
      powerChain: false,
      coilSpring: false,
      elastics: applianceLayers.elastics,
      closingLoop: false,
    },
  });

  return stages.map((stage, index) => ({
    ...stage,
    progress: (index + 1) / stages.length,
  }));
}

function SegmentBar({
  start,
  end,
  radius,
  color,
}: {
  start: Vector3;
  end: Vector3;
  radius: number;
  color: string;
}) {
  const vector = useMemo(() => end.clone().sub(start), [end, start]);
  const length = vector.length();
  const midpoint = useMemo(
    () => start.clone().add(end).multiplyScalar(0.5),
    [end, start],
  );
  const quaternion = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        vector.clone().normalize(),
      ),
    [vector],
  );

  if (length < 0.001) return null;

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.16} />
    </mesh>
  );
}

function TubePath({
  points,
  radius,
  color,
}: {
  points: Vector3[];
  radius: number;
  color: string;
}) {
  const curve = useMemo(
    () => new CatmullRomCurve3(points.map((point) => point.clone())),
    [points],
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, 56, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.12} />
    </mesh>
  );
}

function GenericBracket({
  anchor,
  orientation,
  scale,
  ligature,
}: {
  anchor: Vector3;
  orientation: Quaternion;
  scale: number;
  ligature: LigatureColor;
}) {
  const width = scale * 1.35;
  const height = scale;
  const depth = scale * 0.42;

  return (
    <group position={anchor} quaternion={orientation}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#d8dde3" metalness={0.68} roughness={0.26} />
      </mesh>
      <mesh position={[0, height * 0.38, depth * 0.18]}>
        <boxGeometry args={[width * 1.14, height * 0.22, depth * 0.48]} />
        <meshStandardMaterial color="#edf0f3" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[0, -height * 0.38, depth * 0.18]}>
        <boxGeometry args={[width * 1.14, height * 0.22, depth * 0.48]} />
        <meshStandardMaterial color="#edf0f3" metalness={0.72} roughness={0.22} />
      </mesh>
      {ligature !== "None" && (
        <mesh position={[0, 0, depth * 0.66]}>
          <torusGeometry args={[scale * 0.52, scale * 0.075, 8, 22]} />
          <meshStandardMaterial
            color={ligature === "Purple" ? "#7050cb" : ligature === "Clear" ? "#f3efe7" : "#a3aab4"}
            transparent={ligature === "Clear"}
            opacity={ligature === "Clear" ? 0.75 : 1}
            roughness={0.45}
          />
        </mesh>
      )}
    </group>
  );
}

function CoilSpring({
  start,
  end,
  scale,
}: {
  start: Vector3;
  end: Vector3;
  scale: number;
}) {
  const points = useMemo(() => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const axis = direction.clone().normalize();
    const helper =
      Math.abs(axis.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const side = new Vector3().crossVectors(axis, helper).normalize();
    const up = new Vector3().crossVectors(side, axis).normalize();
    const turns = Math.max(5, Math.round(length / Math.max(scale * 0.9, 0.5)));
    const count = turns * 10;
    const radius = scale * 0.36;

    return Array.from({ length: count + 1 }, (_, index) => {
      const t = index / count;
      const angle = t * Math.PI * 2 * turns;

      return start
        .clone()
        .lerp(end, t)
        .add(side.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(up.clone().multiplyScalar(Math.sin(angle) * radius));
    });
  }, [end, scale, start]);

  return <TubePath points={points} radius={scale * 0.09} color="#7f8790" />;
}

function ClosingLoop({
  start,
  end,
  scale,
}: {
  start: Vector3;
  end: Vector3;
  scale: number;
}) {
  const points = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    const height = scale * 4.2;

    return [
      start,
      start.clone().lerp(middle, 0.55),
      middle.clone().add(new Vector3(0, height, 0)),
      middle.clone().add(new Vector3(scale * 0.8, height * 1.05, 0)),
      middle.clone().add(new Vector3(scale * 1.05, 0, 0)),
      end,
    ];
  }, [end, scale, start]);

  return <TubePath points={points} radius={scale * 0.1} color="#a9b0b8" />;
}

function ApplianceLayer({
  assets,
  segments,
  jawTransforms,
  targetTransforms,
  layers,
  endpoints,
  bondedTeeth,
  preferences,
}: {
  assets: ScanAsset[];
  segments: ToothSegment[];
  jawTransforms: Record<Exclude<Jaw, "bite">, RigidTransform>;
  targetTransforms: Record<string, RigidTransform>;
  layers: ApplianceLayerState;
  endpoints: MechanicEndpoints;
  bondedTeeth: string[];
  preferences: AppliancePreferences;
}) {
  const anchors = useMemo(() => {
    const map = new Map<
      string,
      {
        point: Vector3;
        jaw: Exclude<Jaw, "bite">;
        orientation: Quaternion;
      }
    >();
    const combined = new Box3();

    segments.forEach((segment) => {
      if (!bondedTeeth.includes(segment.label)) return;
      const asset = assets.find((item) => item.jaw === segment.jaw);
      if (!asset) return;

      const box = targetWorldBox(
        asset,
        segment,
        jawTransforms[segment.jaw],
        targetTransforms[segment.id] || identityTransform(),
      );

      combined.union(box);
      const center = box.getCenter(new Vector3());
      const depth = Math.max(0.6, box.max.z - box.min.z);

      const jawQuaternion = new Quaternion().setFromEuler(
        new Euler(...jawTransforms[segment.jaw].rotation),
      );
      const toothQuaternion = new Quaternion().setFromEuler(
        new Euler(...(targetTransforms[segment.id] || identityTransform()).rotation),
      );

      map.set(segment.label, {
        point: new Vector3(center.x, center.y, box.max.z + depth * 0.08),
        jaw: segment.jaw,
        orientation: jawQuaternion.multiply(toothQuaternion),
      });
    });

    const diagonal = combined.isEmpty()
      ? 60
      : combined.getSize(new Vector3()).length();

    return {
      map,
      scale: Math.max(0.75, Math.min(2.2, diagonal * 0.018)),
    };
  }, [assets, bondedTeeth, jawTransforms, segments, targetTransforms]);

  const sequenceFor = (jaw: Exclude<Jaw, "bite">) =>
    (jaw === "upper" ? upperTeeth : lowerTeeth)
      .map((label) => anchors.map.get(label))
      .filter(
        (
          item,
        ): item is {
          point: Vector3;
          jaw: Exclude<Jaw, "bite">;
          orientation: Quaternion;
        } => Boolean(item),
      )
      .map((item) => item.point);

  const upperWire = sequenceFor("upper");
  const lowerWire = sequenceFor("lower");

  const pointFor = (label: string) => anchors.map.get(label)?.point || null;

  const rangePoints = (startLabel: string, endLabel: string) => {
    const start = anchors.map.get(startLabel);
    const end = anchors.map.get(endLabel);
    if (!start || !end || start.jaw !== end.jaw) return [];

    const sequence = start.jaw === "upper" ? upperTeeth : lowerTeeth;
    const startIndex = sequence.indexOf(startLabel);
    const endIndex = sequence.indexOf(endLabel);
    if (startIndex < 0 || endIndex < 0) return [];

    const low = Math.min(startIndex, endIndex);
    const high = Math.max(startIndex, endIndex);

    return sequence
      .slice(low, high + 1)
      .map((label) => pointFor(label))
      .filter((point): point is Vector3 => Boolean(point));
  };

  const chainPoints = rangePoints(endpoints.chainStart, endpoints.chainEnd);
  const coilStart = pointFor(endpoints.coilStart);
  const coilEnd = pointFor(endpoints.coilEnd);
  const elasticUpper = pointFor(endpoints.elasticUpper);
  const elasticLower = pointFor(endpoints.elasticLower);
  const loopStart = pointFor(endpoints.loopStart);
  const loopEnd = pointFor(endpoints.loopEnd);

  return (
    <group>
      {layers.brackets &&
        [...anchors.map.entries()].map(([label, anchor]) => (
          <GenericBracket
            anchor={anchor.point}
            orientation={anchor.orientation}
            scale={anchors.scale}
            ligature={preferences.ligature}
            key={`bracket-${label}`}
          />
        ))}

      {layers.archwire &&
        [upperWire, lowerWire].map((points, index) =>
          points.length > 1 ? (
            <TubePath
              points={points}
              radius={anchors.scale * 0.09}
              color={preferences.material === "NiTi" ? "#b7bec7" : preferences.material === "SS" ? "#929ba7" : "#a7a1ad"}
              key={index}
            />
          ) : null,
        )}

      {layers.powerChain && chainPoints.length > 1 && (
        <group>
          {chainPoints.map((point, index) => (
            <mesh position={point} key={index}>
              <torusGeometry
                args={[
                  anchors.scale * 0.35,
                  anchors.scale * 0.09,
                  8,
                  18,
                ]}
              />
              <meshStandardMaterial color="#6d4cf5" roughness={0.52} />
            </mesh>
          ))}
          {chainPoints.slice(0, -1).map((point, index) => (
            <SegmentBar
              start={point}
              end={chainPoints[index + 1]}
              radius={anchors.scale * 0.07}
              color="#6d4cf5"
              key={index}
            />
          ))}
        </group>
      )}

      {layers.coilSpring && coilStart && coilEnd && (
        <CoilSpring
          start={coilStart}
          end={coilEnd}
          scale={anchors.scale}
        />
      )}

      {layers.elastics && elasticUpper && elasticLower && (
        <SegmentBar
          start={elasticUpper}
          end={elasticLower}
          radius={anchors.scale * 0.13}
          color="#3aa17e"
        />
      )}

      {layers.closingLoop && loopStart && loopEnd && (
        <ClosingLoop
          start={loopStart}
          end={loopEnd}
          scale={anchors.scale}
        />
      )}
    </group>
  );
}

function StageWorkspace({
  assets,
  segments,
  jawTransforms,
  targetTransforms,
  plannedExtractions,
  baseScenario,
  comparison,
  onSelectScenario,
  onCreateComparison,
  onRemoveComparison,
  onToggleLayer,
  onUpdateEndpoint,
  preferences,
  bondedTeeth,
  sessionActive,
  aiReview,
  aiReviewLoading,
  aiReviewError,
  onRunAiReview,
  onSignIn,
}: {
  assets: ScanAsset[];
  segments: ToothSegment[];
  jawTransforms: Record<Exclude<Jaw, "bite">, RigidTransform>;
  targetTransforms: Record<string, RigidTransform>;
  plannedExtractions: Set<string>;
  baseScenario: MechanicsScenario;
  comparison: MechanicsComparison;
  onSelectScenario: (active: "A" | "B") => void;
  onCreateComparison: () => void;
  onRemoveComparison: () => void;
  onToggleLayer: (layer: "powerChain" | "coilSpring" | "elastics" | "closingLoop") => void;
  onUpdateEndpoint: (endpoint: keyof MechanicEndpoints, value: string) => void;
  preferences: AppliancePreferences;
  bondedTeeth: string[];
  sessionActive: boolean;
  aiReview: StageAiReviewResult | null;
  aiReviewLoading: boolean;
  aiReviewError: string;
  onRunAiReview: () => void;
  onSignIn: () => void;
}) {
  const scenario = comparison.active === "B" && comparison.alternative
    ? comparison.alternative
    : baseScenario;
  const stages = useMemo(
    () =>
      deriveStages({
        segments,
        targetTransforms,
        plannedExtractions,
        applianceLayers: scenario.layers,
        endpoints: scenario.endpoints,
      }),
    [scenario.layers, scenario.endpoints, plannedExtractions, segments, targetTransforms],
  );
  const availableUpper = upperTeeth.filter((label) =>
    bondedTeeth.includes(label) &&
    segments.some((segment) => segment.label === label && !plannedExtractions.has(segment.id)),
  );
  const availableLower = lowerTeeth.filter((label) =>
    bondedTeeth.includes(label) &&
    segments.some((segment) => segment.label === label && !plannedExtractions.has(segment.id)),
  );
  const availableTeeth = [...availableUpper, ...availableLower];
  const inSameArch = (label: string) => availableUpper.includes(label)
    ? availableUpper : availableLower.includes(label) ? availableLower : [];
  const activeMechanics = (
    layers: ApplianceLayerState,
  ) => ([
    layers.powerChain ? "Power chain" : "",
    layers.coilSpring ? "Closed coil" : "",
    layers.elastics ? "Elastics" : "",
    layers.closingLoop ? "Closing loop" : "",
  ].filter(Boolean).join(" · ") || "No auxiliaries");
  const endpointGroups: Array<{
    key: "powerChain" | "coilSpring" | "elastics" | "closingLoop";
    label: string;
    controls: Array<[keyof MechanicEndpoints, string, string[]]>;
  }> = [
    {
      key: "powerChain",
      label: "Power chain",
      controls: [
        ["chainStart", "From", availableTeeth],
        ["chainEnd", "To", inSameArch(scenario.endpoints.chainStart)],
      ],
    },
    {
      key: "coilSpring",
      label: "Closed coil",
      controls: [
        ["coilStart", "From", availableTeeth],
        ["coilEnd", "To", inSameArch(scenario.endpoints.coilStart)],
      ],
    },
    {
      key: "elastics",
      label: "Interarch elastics",
      controls: [
        ["elasticUpper", "Upper", availableUpper],
        ["elasticLower", "Lower", availableLower],
      ],
    },
    {
      key: "closingLoop",
      label: "Closing loop",
      controls: [
        ["loopStart", "From", availableTeeth],
        ["loopEnd", "To", inSameArch(scenario.endpoints.loopStart)],
      ],
    },
  ];
  const [stageStep, setStageStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setStageStep((current) => Math.min(current, stages.length));
  }, [stages.length]);

  useEffect(() => {
    setIsPlaying(false);
    setStageStep(0);
  }, [comparison.active, Boolean(comparison.alternative)]);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setStageStep((current) => {
        if (current >= stages.length) {
          setIsPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPlaying, stages.length]);

  const currentStage = stageStep === 0 ? null : stages[stageStep - 1];
  const progress = currentStage?.progress || 0;
  const playbackTransforms = useMemo(
    () => scaleTargetTransforms(targetTransforms, progress),
    [progress, targetTransforms],
  );
  const playbackLayers: ApplianceLayerState = {
    ...(currentStage?.layers || scenario.layers),
    brackets: scenario.layers.brackets,
    archwire: scenario.layers.archwire,
  };
  const extractionStageReached =
    stageStep > 0 &&
    stages
      .slice(0, stageStep)
      .some((stage) => stage.id === "extractions");
  const playbackExtractions = extractionStageReached
    ? plannedExtractions
    : new Set<string>();
  const playbackSegments = segments.filter(
    (segment) => !playbackExtractions.has(segment.id),
  );

  return (
    <div className="stage-workspace">
      <div className="stage-workspace__header">
        <div>
          <h2>{currentStage ? currentStage.title : "Mechanics & adjustments"}</h2>
          <small>Setup {comparison.active} · illustrative sequence, not elapsed treatment time</small>
        </div>
        <div className="appliance-action-buttons">
          {comparison.alternative ? (
            <button type="button" onClick={onRemoveComparison}>Remove Setup B</button>
          ) : (
            <button type="button" onClick={onCreateComparison}>Compare mechanics</button>
          )}
        </div>
      </div>

      <div className="stage-workspace__body">
        <div className="stage-viewer">
          <Canvas camera={{ fov: 36, near: 0.01, far: 100000 }} dpr={[1, 1.5]}>
            <color attach="background" args={["#bfc1c9"]} />
            <TargetSetupScene
              assets={assets}
              segments={segments}
              jawTransforms={jawTransforms}
              targetTransforms={playbackTransforms}
              plannedExtractionIds={playbackExtractions}
              selectedId={null}
              transformMode="translate"
              displayTarget
              collisionIds={new Set()}
              contactIds={new Set()}
              onSelect={() => undefined}
              onTransform={() => undefined}
            />
            <ApplianceLayer
              assets={assets}
              segments={playbackSegments}
              jawTransforms={jawTransforms}
              targetTransforms={playbackTransforms}
              layers={playbackLayers}
              endpoints={scenario.endpoints}
              preferences={preferences}
              bondedTeeth={bondedTeeth}
            />
          </Canvas>

          <div className="stage-viewer__badge">
            <span>Setup {comparison.active} · {currentStage ? `Stage ${stageStep}` : "Initial"}</span>
            <strong>{currentStage ? "Mechanics overlay" : "Approved starting geometry"}</strong>
          </div>

          <div className="scan-canvas__hint">
            Geometric playback only · not a prediction of biological response
          </div>
        </div>

        <aside className="stage-panel">
          <section className="appliance-panel__section">
            <div className="appliance-panel__heading">
              <span>Mechanics comparison</span>
              <strong>Setup {comparison.active}</strong>
            </div>
            {comparison.alternative && (
              <>
                <div className="appliance-layer-buttons appliance-layer-buttons--panel" aria-label="Compare mechanics setups">
                  {(["A", "B"] as const).map((variant) => (
                    <button
                      type="button"
                      key={variant}
                      className={comparison.active === variant ? "is-active" : ""}
                      aria-pressed={comparison.active === variant}
                      onClick={() => onSelectScenario(variant)}
                    >
                      Setup {variant}
                    </button>
                  ))}
                </div>
                <div className="mechanic-editor">
                  <strong>Setup A: {activeMechanics(baseScenario.layers)}</strong>
                  <strong>Setup B: {activeMechanics(comparison.alternative.layers)}</strong>
                  <p className="appliance-panel__empty">
                    Both use the same approved tooth target. Compare appliance choices and stage sequence, not predicted outcomes.
                  </p>
                </div>
              </>
            )}
            {!comparison.alternative && (
              <p className="appliance-panel__empty">
                Adjust the current setup, or create Setup B to compare a different mechanics approach.
              </p>
            )}
          </section>
          <section className="appliance-panel__section">
            <div className="appliance-panel__heading">
              <span>Active adjustments</span>
              <strong>Setup {comparison.active}</strong>
            </div>
            <div className="appliance-layer-buttons appliance-layer-buttons--panel" aria-label="Mechanical adjustments">
              {([
                ["powerChain", "Power chain"],
                ["coilSpring", "Closed coil"],
                ["elastics", "Elastics"],
                ["closingLoop", "Closing loop"],
              ] as Array<["powerChain" | "coilSpring" | "elastics" | "closingLoop", string]>)
                .map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    className={scenario.layers[key] ? "is-active" : ""}
                    aria-pressed={scenario.layers[key]}
                    onClick={() => onToggleLayer(key)}
                    disabled={key === "elastics"
                      ? availableUpper.length === 0 || availableLower.length === 0
                      : ![availableUpper.length, availableLower.length].some((length) => length > 1)}
                  >
                    {label}
                  </button>
                ))}
            </div>
            {endpointGroups.filter((group) => scenario.layers[group.key]).map((group) => (
              <div className="mechanic-editor" key={group.key}>
                <strong>{group.label}</strong>
                <div className="mechanic-endpoints">
                  {group.controls.map(([field, label, options]) => (
                    <label key={field}>
                      <span>{label}</span>
                      <UiSelect
                        value={options.includes(scenario.endpoints[field]) ? scenario.endpoints[field] : ""}
                        onChange={(value) => onUpdateEndpoint(field, value)}
                        options={[
                          { value: "", label: "Select tooth", disabled: true },
                          ...options.map((value) => ({ value, label: value })),
                        ]}
                        ariaLabel={`Setup ${comparison.active} ${group.label} ${label}`}
                        disabled={options.length === 0}
                      />
                    </label>
                  ))}
                </div>
                {group.controls.some(([field, , options]) => !options.includes(scenario.endpoints[field])) && (
                  <p className="appliance-panel__empty">Select available bonded teeth to display this mechanic.</p>
                )}
              </div>
            ))}
            {!endpointGroups.some((group) => scenario.layers[group.key]) && (
              <p className="appliance-panel__empty">Select an auxiliary to illustrate its placement and stage considerations.</p>
            )}
          </section>

          {currentStage ? (
            <div className="stage-mechanics-card">
              <div>
                <span>Active unit</span>
                <p>{currentStage.activeUnits}</p>
              </div>
              <div>
                <span>Anchorage unit</span>
                <p>{currentStage.anchorageUnits}</p>
              </div>
              <div>
                <span>Intended movement tendency</span>
                <p>{currentStage.intendedMovement}</p>
              </div>
              <div>
                <span>Reciprocal / side-effect tendency</span>
                <p>{currentStage.reciprocalEffects}</p>
              </div>
              <div className="stage-mechanics-card__warning">
                <span>Watch for</span>
                <p>{currentStage.warning}</p>
              </div>
              <div className="stage-mechanics-card__control">
                <span>Control strategy</span>
                <p>{currentStage.controlStrategy}</p>
              </div>
            </div>
          ) : (
            <div className="stage-panel__empty">
              Choose Stage 1 or press Play to review the proposed treatment sequence.
            </div>
          )}

          <div className="stage-panel__source-note">
            <strong>Gemini mechanics review</strong>
            <p>Advisory review only. Gemini cannot change geometry or approve treatment.</p>
            <button
              type="button"
              disabled={aiReviewLoading}
              onClick={sessionActive ? onRunAiReview : onSignIn}
            >
              {!sessionActive
                ? "Sign in to review"
                : aiReviewLoading
                  ? "Reviewing…"
                  : aiReview
                    ? "Refresh review"
                    : "Run mechanics review"}
            </button>
            {aiReviewError && (
              <div className="stage-ai-review__error" role="alert">
                {aiReviewError}
              </div>
            )}
            {aiReview && (
              <div className="stage-ai-review">
                <p>{aiReview.clinical_assessment}</p>
                {aiReview.stage_guidance?.slice(0, 3).map((item, index) => (
                  <div className="stage-ai-review__item" key={`${item.stage}-${index}`}>
                    <strong>{item.stage || "Stage guidance"}</strong>
                    <span>{item.control_strategy || item.movement_tendency}</span>
                    {!!item.source_ids?.length && (
                      <small>{item.source_ids.join(" · ")}</small>
                    )}
                  </div>
                ))}
                {!!aiReview.missing_information?.length && (
                  <small>
                    Missing: {aiReview.missing_information.slice(0, 3).join(" · ")}
                  </small>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="stage-timeline">
        <button
          className="stage-play-button"
          type="button"
          onClick={() => {
            if (stageStep >= stages.length) setStageStep(0);
            setIsPlaying((current) => !current);
          }}
          aria-label={isPlaying ? "Pause stage playback" : "Play stage playback"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>

        <div className="stage-timeline__track" aria-label={`Setup ${comparison.active} illustrative stage sequence`}>
          <button
            className={`stage-timeline__item${stageStep === 0 ? " is-current" : ""}`}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setStageStep(0);
            }}
          >
            <span>00</span>
            Initial
          </button>

          {stages.map((stage, index) => (
            <button
              className={`stage-timeline__item${stageStep === index + 1 ? " is-current" : ""}`}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStageStep(index + 1);
              }}
              key={stage.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {stage.title}
            </button>
          ))}
        </div>
      </div>
    </div>
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
          {loading ? (
            <span className="scan-file-button__loading">
              <span className="clinical-loader" aria-hidden="true" />
              Reading
            </span>
          ) : asset ? "Replace" : "Choose file"}
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

export default function ScanWorkflow({
  onSetupApprovalChange,
  onPersistenceChange,
  onStageStateChange,
  clinicalView = "setup",
  caseId = null,
  userId = null,
  initialState = null,
  sessionActive = false,
  stageAiReview = null,
  stageAiReviewLoading = false,
  stageAiReviewError = "",
  onRunStageAiReview = () => undefined,
  onSignIn = () => undefined,
}: {
  onSetupApprovalChange?: (approved: boolean) => void;
  onPersistenceChange?: (state: ScanPersistenceState) => void;
  onStageStateChange?: (state: StagePersistenceState) => void;
  clinicalView?: "setup" | "stages";
  caseId?: string | null;
  userId?: string | null;
  initialState?: ScanPersistenceState | null;
  sessionActive?: boolean;
  stageAiReview?: StageAiReviewResult | null;
  stageAiReviewLoading?: boolean;
  stageAiReviewError?: string;
  onRunStageAiReview?: () => void;
  onSignIn?: () => void;
}) {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [loadingJaw, setLoadingJaw] = useState<Jaw | null>(null);
  const [error, setError] = useState("");
  const [activeJaw, setActiveJaw] = useState<Exclude<Jaw, "bite">>("upper");
  const [interactionMode, setInteractionMode] =
    useState<SegmentationInteraction>("orbit");
  const [brushPercent, setBrushPercent] = useState(2.2);
  const [activeFaces, setActiveFaces] = useState<Set<number>>(new Set());
  const [segments, setSegments] = useState<ToothSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [toothLabel, setToothLabel] = useState("11");
  const [alignJaw, setAlignJaw] = useState<Exclude<Jaw, "bite"> | null>(null);
  const [alignMode, setAlignMode] = useState<"translate" | "rotate">("translate");
  const [workflowMode, setWorkflowMode] = useState<"segment" | "target" | "appliance">("segment");
  const [jawTransforms, setJawTransforms] = useState<
    Record<Exclude<Jaw, "bite">, RigidTransform>
  >({
    upper: identityTransform(),
    lower: identityTransform(),
  });
  const [targetTransforms, setTargetTransforms] = useState<Record<string, RigidTransform>>({});
  const [plannedExtractions, setPlannedExtractions] = useState<Set<string>>(new Set());
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<SetupMode>("translate");
  const [displayTarget, setDisplayTarget] = useState(true);
  const [setupApproved, setSetupApproved] = useState(false);
  const [applianceStep, setApplianceStep] = useState<ApplianceStep>("strap");
  const [appliancePreferences, setAppliancePreferences] = useState<AppliancePreferences>(defaultAppliancePreferences);
  const [applianceLayers, setApplianceLayers] = useState<ApplianceLayerState>({
    brackets: true,
    archwire: true,
    powerChain: false,
    coilSpring: false,
    elastics: false,
    closingLoop: false,
  });
  const [mechanicsComparison, setMechanicsComparison] = useState<MechanicsComparison>(emptyMechanicsComparison);
  const [mechanicEndpoints, setMechanicEndpoints] = useState<MechanicEndpoints>({
    chainStart: "",
    chainEnd: "",
    coilStart: "",
    coilEnd: "",
    elasticUpper: "",
    elasticLower: "",
    loopStart: "",
    loopEnd: "",
  });
  const assetsRef = useRef<ScanAsset[]>([]);
  const hydrationTokenRef = useRef(0);
  const hydratingRef = useRef(false);

  useEffect(() => {
    const token = hydrationTokenRef.current + 1;
    hydrationTokenRef.current = token;
    hydratingRef.current = true;
    setError("");
    setLoadingJaw(null);
    setActiveFaces(new Set());
    setActiveSegmentId(null);
    setSelectedTargetId(null);
    setAlignJaw(null);
    setInteractionMode("orbit");
    setWorkflowMode("segment");
    setApplianceStep("strap");
    setAppliancePreferences(defaultAppliancePreferences);
    setMechanicsComparison(emptyMechanicsComparison());

    assetsRef.current.forEach((asset) => asset.geometry.dispose());
    setAssets([]);

    if (!caseId || !initialState) {
      setSegments([]);
      setJawTransforms({
        upper: identityTransform(),
        lower: identityTransform(),
      });
      setTargetTransforms({});
      setPlannedExtractions(new Set());
      setSetupApproved(false);
      setApplianceLayers({
        brackets: true,
        archwire: true,
        powerChain: false,
        coilSpring: false,
        elastics: false,
        closingLoop: false,
      });
      setMechanicEndpoints({
        chainStart: "",
        chainEnd: "",
        coilStart: "",
        coilEnd: "",
        elasticUpper: "",
        elasticLower: "",
        loopStart: "",
        loopEnd: "",
      });
      hydratingRef.current = false;
      return;
    }

    const restore = async () => {
      try {
        const restoredAssets: ScanAsset[] = [];

        for (const jaw of ["upper", "lower", "bite"] as Jaw[]) {
          const saved = initialState.files?.[jaw];
          if (!saved?.storagePath) continue;

          const blob = await downloadBracketMotionScan(saved.storagePath);
          if (hydrationTokenRef.current !== token) return;

          const file = new File([blob], saved.fileName, {
            type: blob.type || "application/octet-stream",
          });
          const asset = await parseScan(file, jaw);
          asset.storagePath = saved.storagePath;
          restoredAssets.push(asset);
        }

        if (hydrationTokenRef.current !== token) {
          restoredAssets.forEach((asset) => asset.geometry.dispose());
          return;
        }

        setAssets(restoredAssets);
        setSegments(Array.isArray(initialState.segments) ? initialState.segments : []);
        setJawTransforms(
          initialState.jawTransforms || {
            upper: identityTransform(),
            lower: identityTransform(),
          },
        );
        setTargetTransforms(initialState.targetTransforms || {});
        setPlannedExtractions(
          new Set(
            Array.isArray(initialState.plannedExtractions)
              ? initialState.plannedExtractions
              : [],
          ),
        );
        setSetupApproved(initialState.setupApproved === true);
        setApplianceLayers(
          initialState.applianceLayers || {
            brackets: true,
            archwire: true,
            powerChain: false,
            coilSpring: false,
            elastics: false,
            closingLoop: false,
          },
        );
        setAppliancePreferences({
          ...defaultAppliancePreferences,
          ...(initialState.appliancePreferences || {}),
          bondedTeeth: Array.isArray(initialState.appliancePreferences?.bondedTeeth)
            ? initialState.appliancePreferences.bondedTeeth.filter((label) => typeof label === "string")
            : null,
        });
        const comparison = initialState.mechanicsComparison;
        const alternative = comparison?.alternative;
        setMechanicsComparison({
          alternative: alternative ? {
            layers: { ...alternative.layers },
            endpoints: { ...alternative.endpoints },
          } : null,
          active: alternative && comparison.active === "B" ? "B" : "A",
        });
        setMechanicEndpoints(
          initialState.mechanicEndpoints || {
            chainStart: "",
            chainEnd: "",
            coilStart: "",
            coilEnd: "",
            elasticUpper: "",
            elasticLower: "",
            loopStart: "",
            loopEnd: "",
          },
        );
        setWorkflowMode(initialState.setupApproved ? "target" : "segment");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `Saved scan could not be restored: ${cause.message}`
            : "Saved scan could not be restored.",
        );
      } finally {
        if (hydrationTokenRef.current === token) {
          hydratingRef.current = false;
        }
      }
    };

    void restore();

    return () => {
      if (hydrationTokenRef.current === token) {
        hydrationTokenRef.current += 1;
      }
    };
  }, [caseId]);

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

  const treatmentSegments = useMemo(
    () => segments.filter((segment) => !plannedExtractions.has(segment.id)),
    [plannedExtractions, segments],
  );

  const upperSegmentLabels = useMemo(
    () =>
      upperTeeth.filter((label) =>
        treatmentSegments.some((segment) => segment.label === label),
      ),
    [treatmentSegments],
  );
  const lowerSegmentLabels = useMemo(
    () =>
      lowerTeeth.filter((label) =>
        treatmentSegments.some((segment) => segment.label === label),
      ),
    [treatmentSegments],
  );

  const allSegmentLabels = useMemo(
    () => [...upperSegmentLabels, ...lowerSegmentLabels],
    [lowerSegmentLabels, upperSegmentLabels],
  );
  const bondedLabels = useMemo(
    () => appliancePreferences.bondedTeeth === null
      ? allSegmentLabels
      : allSegmentLabels.filter((label) => appliancePreferences.bondedTeeth?.includes(label)),
    [allSegmentLabels, appliancePreferences.bondedTeeth],
  );

  const setBondedFor = (label: string) => {
    if (!allSegmentLabels.includes(label)) return;
    setAppliancePreferences((current) => {
      const selected = current.bondedTeeth === null ? allSegmentLabels : current.bondedTeeth;
      return {
        ...current,
        bondedTeeth: selected.includes(label)
          ? selected.filter((tooth) => tooth !== label)
          : [...selected, label],
      };
    });
  };

  const sameArchLabels = useCallback(
    (label: string) =>
      upperSegmentLabels.includes(label) ? upperSegmentLabels : lowerSegmentLabels,
    [lowerSegmentLabels, upperSegmentLabels],
  );

  useEffect(() => {
    const upperFirst = upperSegmentLabels[0] || "";
    const upperLast = upperSegmentLabels.at(-1) || "";
    const lowerFirst = lowerSegmentLabels[0] || "";

    setMechanicEndpoints((current) => {
      const chainStart =
        allSegmentLabels.includes(current.chainStart)
          ? current.chainStart
          : upperFirst || lowerFirst;
      const chainOptions = sameArchLabels(chainStart);
      const coilStart =
        allSegmentLabels.includes(current.coilStart)
          ? current.coilStart
          : upperFirst || lowerFirst;
      const coilOptions = sameArchLabels(coilStart);
      const loopStart =
        allSegmentLabels.includes(current.loopStart)
          ? current.loopStart
          : upperFirst || lowerFirst;
      const loopOptions = sameArchLabels(loopStart);

      return {
        chainStart,
        chainEnd: chainOptions.includes(current.chainEnd)
          ? current.chainEnd
          : chainOptions.at(-1) || chainStart,
        coilStart,
        coilEnd: coilOptions.includes(current.coilEnd)
          ? current.coilEnd
          : coilOptions.at(-1) || coilStart,
        elasticUpper: upperSegmentLabels.includes(current.elasticUpper)
          ? current.elasticUpper
          : upperFirst,
        elasticLower: lowerSegmentLabels.includes(current.elasticLower)
          ? current.elasticLower
          : lowerFirst,
        loopStart,
        loopEnd: loopOptions.includes(current.loopEnd)
          ? current.loopEnd
          : loopOptions.at(-1) || loopStart,
      };
    });
  }, [allSegmentLabels, lowerSegmentLabels, sameArchLabels, upperSegmentLabels]);

  useEffect(() => {
    if (!setupApproved && workflowMode === "appliance") {
      setWorkflowMode("target");
    }
  }, [setupApproved, workflowMode]);

  useEffect(() => {
    setTargetTransforms((current) => {
      const next: Record<string, RigidTransform> = {};

      segments.forEach((segment) => {
        next[segment.id] = current[segment.id] || identityTransform();
      });

      return next;
    });

    setPlannedExtractions((current) => {
      const validIds = new Set(segments.map((segment) => segment.id));
      return new Set([...current].filter((id) => validIds.has(id)));
    });

    if (selectedTargetId && !segments.some((segment) => segment.id === selectedTargetId)) {
      setSelectedTargetId(null);
    }
  }, [segments, selectedTargetId]);

  const updateJawTransform = useCallback(
    (jaw: Exclude<Jaw, "bite">, transform: RigidTransform) => {
      setJawTransforms((current) => ({ ...current, [jaw]: transform }));
      setSetupApproved(false);
    },
    [],
  );

  const updateTargetTransform = useCallback(
    (id: string, transform: RigidTransform) => {
      setTargetTransforms((current) => ({ ...current, [id]: transform }));
      setSetupApproved(false);
    },
    [],
  );

  useEffect(() => {
    onSetupApprovalChange?.(setupApproved);
  }, [onSetupApprovalChange, setupApproved]);

  useEffect(() => {
    if (hydratingRef.current) return;

    const files: ScanPersistenceState["files"] = {};
    assets.forEach((asset) => {
      if (!asset.storagePath) return;
      files[asset.jaw] = {
        fileName: asset.fileName,
        storagePath: asset.storagePath,
      };
    });

    onPersistenceChange?.({
      version: 1,
      files,
      segments,
      jawTransforms,
      targetTransforms,
      plannedExtractions: [...plannedExtractions],
      setupApproved,
      applianceLayers,
      mechanicEndpoints,
      appliancePreferences,
      mechanicsComparison,
    });

    const preview = mechanicsComparison.active === "B" && mechanicsComparison.alternative
      ? mechanicsComparison.alternative
      : { layers: applianceLayers, endpoints: mechanicEndpoints };
    const stages = deriveStages({
      segments,
      targetTransforms,
      plannedExtractions,
      applianceLayers: preview.layers,
      endpoints: preview.endpoints,
    }).map(({ layers: _layers, ...stage }) => stage);

    onStageStateChange?.({
      version: 1,
      stages,
    });
  }, [
    applianceLayers,
    appliancePreferences,
    mechanicsComparison,
    assets,
    jawTransforms,
    mechanicEndpoints,
    onPersistenceChange,
    onStageStateChange,
    plannedExtractions,
    segments,
    setupApproved,
    targetTransforms,
  ]);

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

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    try {
      const next = await parseScan(file, jaw);

      if (userId && caseId) {
        try {
          next.storagePath = await uploadBracketMotionScan(
            userId,
            caseId,
            jaw,
            file,
          );
        } catch (uploadError) {
          next.geometry.dispose();
          throw new Error(
            uploadError instanceof Error
              ? `Cloud upload failed: ${uploadError.message}`
              : "Cloud upload failed.",
          );
        }
      }

      setAssets((current) => {
        current.find((asset) => asset.jaw === jaw)?.geometry.dispose();
        return [...current.filter((asset) => asset.jaw !== jaw), next];
      });

      if (jaw !== "bite") {
        setSegments((current) => current.filter((segment) => segment.jaw !== jaw));
        setJawTransforms((current) => ({ ...current, [jaw]: identityTransform() }));
        setActiveFaces(new Set());
        setActiveSegmentId(null);
        setInteractionMode("orbit");
        setWorkflowMode("segment");
        setSetupApproved(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan could not be read.");
    } finally {
      setLoadingJaw(null);
    }
  };

  const removeAsset = (jaw: Jaw) => {
    const currentAsset = assetsRef.current.find((asset) => asset.jaw === jaw);

    if (currentAsset?.storagePath) {
      void removeBracketMotionScan(currentAsset.storagePath).catch(() => {
        setError("The scan was removed locally, but its cloud file could not be deleted.");
      });
    }

    setAssets((current) => {
      current.find((asset) => asset.jaw === jaw)?.geometry.dispose();
      return current.filter((asset) => asset.jaw !== jaw);
    });

    if (jaw !== "bite") {
      setSegments((current) => current.filter((segment) => segment.jaw !== jaw));
      setJawTransforms((current) => ({ ...current, [jaw]: identityTransform() }));
      setActiveFaces(new Set());
      setActiveSegmentId(null);
      setInteractionMode("orbit");
      setWorkflowMode("segment");
      setSetupApproved(false);
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

    setSetupApproved(false);

    setSegments((current) => {
      const sameLabel = current.find(
        (segment) =>
          segment.jaw === activeJaw &&
          segment.label === toothLabel &&
          segment.id !== activeSegmentId,
      );
      const id =
        activeSegmentId ||
        sameLabel?.id ||
        `${activeJaw}-${toothLabel}-${Date.now()}`;

      const reassigned = current
        .filter(
          (segment) =>
            segment.id !== id &&
            !(segment.jaw === activeJaw && segment.label === toothLabel),
        )
        .map((segment) =>
          segment.jaw === activeJaw
            ? {
                ...segment,
                faces: segment.faces.filter((face) => !activeFaces.has(face)),
              }
            : segment,
        )
        .filter((segment) => segment.faces.length > 0);

      setActiveSegmentId(id);

      return [
        ...reassigned,
        {
          id,
          jaw: activeJaw,
          label: toothLabel,
          faces,
        },
      ];
    });
  };

  const editSegment = (segment: ToothSegment) => {
    setActiveJaw(segment.jaw);
    setToothLabel(segment.label);
    setActiveSegmentId(segment.id);
    setActiveFaces(new Set(segment.faces));
    setAlignJaw(null);
    setInteractionMode("orbit");
  };

  const newSegment = () => {
    setActiveSegmentId(null);
    setActiveFaces(new Set());
    setInteractionMode("orbit");
  };

  const deleteSegment = (segmentId: string) => {
    setSegments((current) => current.filter((segment) => segment.id !== segmentId));
    setSetupApproved(false);
    if (activeSegmentId === segmentId) newSegment();
    if (selectedTargetId === segmentId) setSelectedTargetId(null);
  };

  const upperReady = assets.some((asset) => asset.jaw === "upper");
  const lowerReady = assets.some((asset) => asset.jaw === "lower");
  const scanReady = upperReady && lowerReady;
  const movableCount = segments.length;

  const setupAnalysis = useMemo(() => {
    const boxes = new Map<string, Box3>();
    const collisionIds = new Set<string>();
    const contactIds = new Set<string>();

    treatmentSegments.forEach((segment) => {
      const asset = assets.find((item) => item.jaw === segment.jaw);
      if (!asset) return;

      boxes.set(
        segment.id,
        targetWorldBox(
          asset,
          segment,
          jawTransforms[segment.jaw],
          targetTransforms[segment.id] || identityTransform(),
        ),
      );
    });

    const combined = new Box3();
    boxes.forEach((box) => combined.union(box));
    const caseDiagonal = combined.isEmpty()
      ? 0
      : combined.getSize(new Vector3()).length();
    const contactTolerance = Math.max(
      0.05,
      Math.min(0.5, caseDiagonal * 0.004),
    );

    const segmentList = treatmentSegments.filter((segment) => boxes.has(segment.id));

    for (let i = 0; i < segmentList.length; i += 1) {
      for (let j = i + 1; j < segmentList.length; j += 1) {
        const first = segmentList[i];
        const second = segmentList[j];
        const firstBox = boxes.get(first.id)!;
        const secondBox = boxes.get(second.id)!;

        const firstCore = shrinkBox(firstBox, 0.58);
        const secondCore = shrinkBox(secondBox, 0.58);

        if (firstCore.intersectsBox(secondCore)) {
          collisionIds.add(first.id);
          collisionIds.add(second.id);
          continue;
        }

        if (boxDistance(firstBox, secondBox) <= contactTolerance) {
          contactIds.add(first.id);
          contactIds.add(second.id);
        }
      }
    }

    const byLabel = new Map(
      treatmentSegments.map((segment) => [segment.label, segment] as const),
    );
    const incisorLabels = ["11", "21", "31", "41"];
    const metricsReady = incisorLabels.every((label) => byLabel.has(label));

    let overjet: number | null = null;
    let overbite: number | null = null;
    let midline: number | null = null;

    if (metricsReady) {
      const upperBoxes = ["11", "21"].map(
        (label) => boxes.get(byLabel.get(label)!.id)!,
      );
      const lowerBoxes = ["31", "41"].map(
        (label) => boxes.get(byLabel.get(label)!.id)!,
      );

      const upper = upperBoxes[0].clone().union(upperBoxes[1]);
      const lower = lowerBoxes[0].clone().union(lowerBoxes[1]);
      const upperCenter = upper.getCenter(new Vector3());
      const lowerCenter = lower.getCenter(new Vector3());

      overjet = Math.abs(upperCenter.z - lowerCenter.z);
      overbite = Math.max(
        0,
        Math.min(upper.max.y, lower.max.y) -
          Math.max(upper.min.y, lower.min.y),
      );
      midline = Math.abs(upperCenter.x - lowerCenter.x);
    }

    const movedCount =
      treatmentSegments.filter((segment) => {
        const transform = targetTransforms[segment.id] || identityTransform();
        const translation = new Vector3(...transform.position).length();
        const rotation =
          Math.abs(transform.rotation[0]) +
          Math.abs(transform.rotation[1]) +
          Math.abs(transform.rotation[2]);

        return translation > 0.01 || rotation > 0.005;
      }).length +
      segments.filter((segment) => plannedExtractions.has(segment.id)).length;

    const unitWarning =
      caseDiagonal > 0 && (caseDiagonal < 20 || caseDiagonal > 300);

    return {
      boxes,
      collisionIds,
      contactIds,
      metricsReady,
      overjet,
      overbite,
      midline,
      movedCount,
      unitWarning,
    };
  }, [
    assets,
    jawTransforms,
    plannedExtractions,
    segments,
    targetTransforms,
    treatmentSegments,
  ]);

  const selectedSegment =
    segments.find((segment) => segment.id === selectedTargetId) || null;
  const selectedTransform = selectedTargetId
    ? targetTransforms[selectedTargetId] || identityTransform()
    : identityTransform();
  const selectedIsPlannedExtraction = Boolean(
    selectedTargetId && plannedExtractions.has(selectedTargetId),
  );
  const selectedExtractionPartner = selectedSegment
    ? segments.find(
        (segment) =>
          segment.label === firstPremolarPair[selectedSegment.label],
      ) || null
    : null;

  const toggleSelectedExtractionPair = () => {
    if (!selectedSegment || !selectedExtractionPartner) return;

    const pairIds = [selectedSegment.id, selectedExtractionPartner.id];
    setPlannedExtractions((current) => {
      const next = new Set(current);
      const pairSelected = pairIds.every((id) => next.has(id));

      pairIds.forEach((id) => {
        if (pairSelected) next.delete(id);
        else next.add(id);
      });

      return next;
    });
    setSetupApproved(false);
  };

  const setupReady =
    setupAnalysis.metricsReady &&
    setupAnalysis.movedCount > 0 &&
    setupAnalysis.collisionIds.size === 0 &&
    !setupAnalysis.unitWarning;

  const updateSelectedTarget = (
    channel: "position" | "rotation",
    axis: 0 | 1 | 2,
    value: number,
  ) => {
    if (!selectedTargetId || !Number.isFinite(value)) return;

    const current = targetTransforms[selectedTargetId] || identityTransform();
    const next: RigidTransform = {
      position: [...current.position] as VectorTuple,
      rotation: [...current.rotation] as VectorTuple,
    };

    next[channel][axis] =
      channel === "rotation" ? (value * Math.PI) / 180 : value;

    updateTargetTransform(selectedTargetId, next);
  };

  const resetSelectedTarget = () => {
    if (!selectedTargetId) return;
    updateTargetTransform(selectedTargetId, identityTransform());
  };

  const resetAllTargets = () => {
    const next: Record<string, RigidTransform> = {};
    segments.forEach((segment) => {
      next[segment.id] = identityTransform();
    });
    setTargetTransforms(next);
    setPlannedExtractions(new Set());
    setSetupApproved(false);
  };

  const updateScenarioLayer = (key: "powerChain" | "coilSpring" | "elastics" | "closingLoop") => {
    if (mechanicsComparison.active === "B" && mechanicsComparison.alternative) {
      setMechanicsComparison((current) => current.alternative ? {
        ...current,
        alternative: {
          ...current.alternative,
          layers: {
            ...current.alternative.layers,
            [key]: !current.alternative.layers[key],
          },
        },
      } : current);
    } else {
      setApplianceLayers((current) => ({ ...current, [key]: !current[key] }));
    }
  };

  const updateScenarioEndpoint = (key: keyof MechanicEndpoints, value: string) => {
    const apply = (endpoints: MechanicEndpoints) => {
      const next = { ...endpoints, [key]: value };
      const dependent: Partial<Record<keyof MechanicEndpoints, keyof MechanicEndpoints>> = {
        chainStart: "chainEnd",
        coilStart: "coilEnd",
        loopStart: "loopEnd",
      };
      const endKey = dependent[key];
      if (endKey) {
        const sameArch = sameArchLabels(value);
        if (!sameArch.includes(next[endKey])) {
          next[endKey] = sameArch.at(-1) || value;
        }
      }
      return next;
    };
    if (mechanicsComparison.active === "B" && mechanicsComparison.alternative) {
      setMechanicsComparison((current) => current.alternative ? {
        ...current,
        alternative: {
          ...current.alternative,
          endpoints: apply(current.alternative.endpoints),
        },
      } : current);
    } else {
      setMechanicEndpoints((current) => apply(current));
    }
  };

  const createMechanicsComparison = () => {
    setMechanicsComparison({
      alternative: {
        layers: { ...applianceLayers },
        endpoints: { ...mechanicEndpoints },
      },
      active: "B",
    });
  };

  const removeMechanicsComparison = () => {
    setMechanicsComparison(emptyMechanicsComparison());
  };

  if (clinicalView === "stages") {
    return setupApproved ? (
      <StageWorkspace
        assets={assets}
        segments={segments}
        jawTransforms={jawTransforms}
        targetTransforms={targetTransforms}
        plannedExtractions={plannedExtractions}
        baseScenario={{ layers: applianceLayers, endpoints: mechanicEndpoints }}
        comparison={mechanicsComparison}
        onSelectScenario={(active) => setMechanicsComparison((current) =>
          active === "A" || current.alternative ? { ...current, active } : current
        )}
        onCreateComparison={createMechanicsComparison}
        onRemoveComparison={removeMechanicsComparison}
        onToggleLayer={updateScenarioLayer}
        onUpdateEndpoint={updateScenarioEndpoint}
        preferences={appliancePreferences}
        bondedTeeth={bondedLabels}
        sessionActive={sessionActive}
        aiReview={stageAiReview}
        aiReviewLoading={stageAiReviewLoading}
        aiReviewError={stageAiReviewError}
        onRunAiReview={onRunStageAiReview}
        onSignIn={onSignIn}
      />
    ) : (
      <div className="stage-blocked">
        <strong>3D setup approval required.</strong>
        <p>Return to Setup and approve the target before reviewing treatment stages.</p>
      </div>
    );
  }

  return (
    <div className={`scan-workflow${scanReady ? " is-ready" : ""}`}>
      {workflowMode !== "appliance" && (
        <>
      <div className="scan-workflow__top">
        <div>
          <h2>
            {workflowMode === "segment"
              ? "Scan and segmentation"
              : workflowMode === "target"
                ? "3D target"
                : "Appliances"}
          </h2>
        </div>
        <div className="scan-workflow__status">
          <span>
            {workflowMode === "segment"
              ? movableCount
              : workflowMode === "target"
                ? setupAnalysis.movedCount
                : Object.values(applianceLayers).filter(Boolean).length}
          </span>
          <small>
            {workflowMode === "segment"
              ? "movable tooth segments"
              : workflowMode === "target"
                ? setupApproved
                  ? "setup approved"
                  : "teeth moved in target"
                : "visible appliance layers"}
          </small>
        </div>
      </div>

      <div className={`scan-upload-grid${scanReady ? " is-ready" : ""}`}>
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

        </>
      )}

      {scanReady && (
        <div className="scan-phase-tabs" aria-label="Scan and setup workflow">
          <button
            className={workflowMode === "segment" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkflowMode("segment")}
          >
            <span>1</span>
            Segmentation
          </button>
          <button
            className={workflowMode === "target" ? "is-active" : ""}
            type="button"
            disabled={segments.length === 0}
            onClick={() => {
              setWorkflowMode("target");
              setDisplayTarget(true);
              setAlignJaw(null);
              if (!selectedTargetId && segments[0]) setSelectedTargetId(segments[0].id);
            }}
          >
            <span>2</span>
            Target setup
          </button>
          <button
            className={workflowMode === "appliance" ? "is-active" : ""}
            type="button"
            disabled={!setupApproved}
            onClick={() => setWorkflowMode("appliance")}
          >
            <span>3</span>
            Appliances
          </button>
        </div>
      )}

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
      ) : workflowMode === "segment" ? (
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
                  setInteractionMode("orbit");
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
                className={interactionMode === "orbit" ? "is-active" : ""}
                type="button"
                disabled={alignJaw !== null}
                onClick={() => setInteractionMode("orbit")}
              >
                Orbit
              </button>
              <button
                className={interactionMode === "add" ? "is-active" : ""}
                type="button"
                disabled={alignJaw !== null}
                onClick={() => setInteractionMode("add")}
              >
                Add brush
              </button>
              <button
                className={interactionMode === "erase" ? "is-active" : ""}
                type="button"
                disabled={alignJaw !== null}
                onClick={() => setInteractionMode("erase")}
              >
                Erase
              </button>
            </div>

            {interactionMode !== "orbit" && alignJaw === null && (
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
            )}
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
                  interactionMode={interactionMode}
                  alignJaw={alignJaw}
                  alignMode={alignMode}
                  jawTransforms={jawTransforms}
                  onJawTransform={updateJawTransform}
                  onBrush={applyBrush}
                />
              </Canvas>

              <div className="scan-canvas__hint">
                {alignJaw
                  ? "Use the gizmo to align the active arch · right-drag pans · wheel zooms"
                  : interactionMode === "orbit"
                    ? "Orbit mode · drag to rotate · right-drag pans · wheel zooms · choose Add brush or Erase before editing"
                    : `${interactionMode === "add" ? "Add brush" : "Erase"} mode · click a tooth surface to edit · drag to rotate`}
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
                <UiSelect
                  value={toothLabel}
                  onChange={setToothLabel}
                  options={teethForJaw}
                  ariaLabel="FDI tooth"
                />
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
      ) : workflowMode === "target" ? (
        <div className="target-setup">
          <div className="target-setup__toolbar">
            <div className="target-toolbar-group">
              <button
                className={!displayTarget ? "is-active" : ""}
                type="button"
                onClick={() => setDisplayTarget(false)}
              >
                Initial
              </button>
              <button
                className={displayTarget ? "is-active" : ""}
                type="button"
                onClick={() => setDisplayTarget(true)}
              >
                Target
              </button>
            </div>

            <div className="target-toolbar-group">
              <button
                className={targetMode === "translate" ? "is-active" : ""}
                type="button"
                disabled={!displayTarget || !selectedTargetId || selectedIsPlannedExtraction}
                onClick={() => setTargetMode("translate")}
              >
                Move
              </button>
              <button
                className={targetMode === "rotate" ? "is-active" : ""}
                type="button"
                disabled={!displayTarget || !selectedTargetId || selectedIsPlannedExtraction}
                onClick={() => setTargetMode("rotate")}
              >
                Rotate
              </button>
            </div>

            <div className="target-toolbar-group target-toolbar-group--right">
              <button
                type="button"
                disabled={!selectedTargetId}
                onClick={resetSelectedTarget}
              >
                Reset tooth
              </button>
              <button type="button" onClick={resetAllTargets}>
                Reset all
              </button>
            </div>
          </div>

          <div className="target-setup__body">
            <div className="target-canvas">
              <Canvas
                camera={{ fov: 36, near: 0.01, far: 100000 }}
                dpr={[1, 1.5]}
                onPointerMissed={() => setSelectedTargetId(null)}
              >
                <color attach="background" args={["#bfc1c9"]} />
                <TargetSetupScene
                  assets={assets}
                  segments={segments}
                  jawTransforms={jawTransforms}
                  targetTransforms={targetTransforms}
                  plannedExtractionIds={plannedExtractions}
                  selectedId={selectedTargetId}
                  transformMode={targetMode}
                  displayTarget={displayTarget}
                  collisionIds={setupAnalysis.collisionIds}
                  contactIds={setupAnalysis.contactIds}
                  onSelect={(id) => {
                    setSelectedTargetId(id);
                    setDisplayTarget(true);
                  }}
                  onTransform={updateTargetTransform}
                />
              </Canvas>

              <div className="target-canvas__legend">
                <span><i className="is-selected" /> Selected</span>
                <span><i className="is-contact" /> Near contact</span>
                <span><i className="is-collision" /> Potential collision</span>
              </div>

              <div className="scan-canvas__hint">
                Target setup starts from Initial · move/rotate teeth or mark a symmetric first-premolar extraction pair · right-drag pans · wheel zooms
              </div>
            </div>

            <aside className="target-panel">
              <div className="target-panel__status">
                <span>3D setup</span>
                <strong>{setupApproved ? "Approved" : "Draft target"}</strong>
                <small>
                  {setupApproved
                    ? "Any target or jaw change will revoke approval."
                    : `${setupAnalysis.movedCount} target change${setupAnalysis.movedCount === 1 ? "" : "s"} from Initial.`}
                </small>
              </div>

              <div className="target-tooth-strip" aria-label="Segmented teeth">
                {segments.map((segment) => (
                  <button
                    className={[
                      selectedTargetId === segment.id ? "is-active" : "",
                      plannedExtractions.has(segment.id) ? "is-extraction" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    onClick={() => {
                      setSelectedTargetId(segment.id);
                      setDisplayTarget(true);
                    }}
                    key={segment.id}
                  >
                    {segment.label}
                  </button>
                ))}
              </div>

              <section className="target-panel__section">
                <div className="target-panel__heading">
                  <span>Selected tooth</span>
                  <strong>{selectedSegment ? `FDI ${selectedSegment.label}` : "None"}</strong>
                </div>

                {selectedSegment ? (
                  <>
                    {firstPremolarPair[selectedSegment.label] && (
                      <div className={`target-extraction-card${selectedIsPlannedExtraction ? " is-active" : ""}`}>
                        <div>
                          <span>Extraction plan</span>
                          <strong>
                            {selectedIsPlannedExtraction
                              ? "Symmetric first-premolar pair planned"
                              : "Keep tooth in final setup"}
                          </strong>
                          <small>
                            {selectedExtractionPartner
                              ? `FDI ${selectedSegment.label} + FDI ${selectedExtractionPartner.label}`
                              : "Segment the contralateral first premolar to use this V1 extraction workflow."}
                          </small>
                        </div>
                        <button
                          type="button"
                          disabled={!selectedExtractionPartner}
                          onClick={toggleSelectedExtractionPair}
                        >
                          {selectedIsPlannedExtraction
                            ? "Keep pair"
                            : "Plan extraction pair"}
                        </button>
                      </div>
                    )}

                    {selectedIsPlannedExtraction ? (
                      <p className="target-panel__empty">
                        This tooth stays visible in Initial and is omitted from the planned Target after the extraction stage.
                      </p>
                    ) : (
                      <>
                        <div className="target-value-grid">
                          {(["X", "Y", "Z"] as const).map((axis, index) => (
                            <div className="number-field" key={axis}>
                              <label htmlFor={`target-position-${axis}`}>{axis} mm</label>
                              <NumberInput
                                id={`target-position-${axis}`}
                                label={`${axis} position`}
                                step="0.1"
                                value={selectedTransform.position[index].toFixed(2)}
                                onChange={(value) =>
                                  updateSelectedTarget(
                                    "position",
                                    index as 0 | 1 | 2,
                                    Number(value),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>

                        <div className="target-value-grid">
                          {(["Rx", "Ry", "Rz"] as const).map((axis, index) => (
                            <div className="number-field" key={axis}>
                              <label htmlFor={`target-rotation-${axis}`}>{axis} °</label>
                              <NumberInput
                                id={`target-rotation-${axis}`}
                                label={`${axis} rotation`}
                                step="1"
                                value={(
                                  (selectedTransform.rotation[index] * 180) /
                                  Math.PI
                                ).toFixed(1)}
                                onChange={(value) =>
                                  updateSelectedTarget(
                                    "rotation",
                                    index as 0 | 1 | 2,
                                    Number(value),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="target-panel__empty">Select a segmented tooth in the model or tooth strip.</p>
                )}
              </section>

              <section className="target-panel__section">
                <div className="target-panel__heading">
                  <span>Geometry checks</span>
                  <strong>Current target</strong>
                </div>

                <div className="target-check-grid">
                  <div>
                    <span>Overjet</span>
                    <strong>
                      {setupAnalysis.overjet === null
                        ? "—"
                        : `${setupAnalysis.overjet.toFixed(1)} mm`}
                    </strong>
                  </div>
                  <div>
                    <span>Overbite</span>
                    <strong>
                      {setupAnalysis.overbite === null
                        ? "—"
                        : `${setupAnalysis.overbite.toFixed(1)} mm`}
                    </strong>
                  </div>
                  <div>
                    <span>Midline</span>
                    <strong>
                      {setupAnalysis.midline === null
                        ? "—"
                        : `${setupAnalysis.midline.toFixed(1)} mm`}
                    </strong>
                  </div>
                </div>

                <p className="target-check-note">
                  Geometric estimates use FDI 11/21/31/41 and the current aligned scan axes. Imported scan units are expected to be millimetres.
                </p>

                {!setupAnalysis.metricsReady && (
                  <div className="target-warning is-info">
                    Segment FDI 11, 21, 31 and 41 to enable overjet, overbite and dental-midline checks.
                  </div>
                )}

                {setupAnalysis.unitWarning && (
                  <div className="target-warning">
                    Scan scale looks inconsistent with ordinary millimetre dental models. Setup approval is blocked until the source units are corrected.
                  </div>
                )}

                {setupAnalysis.collisionIds.size > 0 && (
                  <div className="target-warning">
                    Potential gross collision detected in {setupAnalysis.collisionIds.size} tooth segments. Resolve the red teeth before approval.
                  </div>
                )}
              </section>

              <section className="target-approval">
                <div>
                  <span>3D Setup Approval</span>
                  <strong>
                    {setupApproved
                      ? "Setup approved"
                      : setupReady
                        ? "Ready for clinician approval"
                        : "Approval requirements not met"}
                  </strong>
                  <p>
                    {setupApproved
                      ? "This target is now the approved geometric setup for the next staging step."
                      : setupAnalysis.unitWarning
                        ? "Correct the scan scale first."
                        : !setupAnalysis.metricsReady
                          ? "Complete the four incisor segments needed for geometry checks."
                          : setupAnalysis.movedCount === 0
                            ? "Move at least one tooth from Initial to create a target setup."
                            : setupAnalysis.collisionIds.size > 0
                              ? "Resolve gross collision warnings before approval."
                              : "Review the target and approve it before staging."}
                  </p>
                </div>

                <button
                  className="target-approve-button"
                  type="button"
                  disabled={!setupReady || setupApproved}
                  onClick={() => setSetupApproved(true)}
                >
                  {setupApproved ? "Approved" : "Approve 3D setup"}
                </button>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <div className="appliance-workspace">
          <div className="appliance-workspace__toolbar">
            <div className="appliance-layer-buttons" aria-label="Appliance setup steps">
              {([
                ["strap", "1. Strap-Up"],
                ["wire", "2. Archwire"],
                ["ties", "3. O-Ties & Aux"],
              ] as Array<[ApplianceStep, string]>).map(([step, label]) => (
                <button
                  key={step}
                  type="button"
                  className={applianceStep === step ? "is-active" : ""}
                  aria-pressed={applianceStep === step}
                  onClick={() => setApplianceStep(step)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="appliance-workspace__body">
            <div className="appliance-canvas">
              <Canvas camera={{ fov: 36, near: 0.01, far: 100000 }} dpr={[1, 1.5]}>
                <color attach="background" args={["#bfc1c9"]} />
                <TargetSetupScene
                  assets={assets}
                  segments={segments}
                  jawTransforms={jawTransforms}
                  targetTransforms={targetTransforms}
                  plannedExtractionIds={plannedExtractions}
                  selectedId={null}
                  transformMode="translate"
                  displayTarget
                  collisionIds={setupAnalysis.collisionIds}
                  contactIds={setupAnalysis.contactIds}
                  onSelect={() => undefined}
                  onTransform={() => undefined}
                />
                <ApplianceLayer
                  assets={assets}
                  segments={treatmentSegments}
                  jawTransforms={jawTransforms}
                  targetTransforms={targetTransforms}
                  layers={applianceLayers}
                  endpoints={mechanicEndpoints}
                  preferences={appliancePreferences}
                  bondedTeeth={bondedLabels}
                />
              </Canvas>

              <div className="scan-canvas__hint">
                Generic fixed-appliance visualization on the approved target · rotate, pan and zoom to inspect
              </div>
            </div>

            <aside className="appliance-panel">
              <div className="appliance-panel__status">
                <span>Appliance setup</span>
                <strong>
                  {applianceStep === "strap" ? "Strap-Up" : applianceStep === "wire" ? "Archwire" : "O-Ties & Auxiliaries"}
                </strong>
                <small>
                  {bondedLabels.length} bonded teeth · {appliancePreferences.prescription} · {appliancePreferences.size} {appliancePreferences.material}
                </small>
              </div>

              {applianceStep === "strap" && (
                <>
                  <section className="appliance-panel__section">
                    <div className="appliance-panel__heading">
                      <span>Bracket prescription</span>
                      <strong>0.022 slot</strong>
                    </div>
                    <div className="appliance-layer-buttons appliance-layer-buttons--panel" aria-label="Bracket prescription">
                      {(["Roth", "MBT"] as BracketPrescription[]).map((prescription) => (
                        <button
                          key={prescription}
                          type="button"
                          className={appliancePreferences.prescription === prescription ? "is-active" : ""}
                          aria-pressed={appliancePreferences.prescription === prescription}
                          onClick={() => setAppliancePreferences((current) => ({ ...current, prescription }))}
                        >
                          {prescription}
                        </button>
                      ))}
                    </div>
                    <p className="appliance-panel__empty">
                      Prescription label only; generic bracket geometry is unchanged.
                    </p>
                  </section>

                  <section className="appliance-panel__section">
                    <div className="appliance-panel__heading">
                      <span>Bonded teeth</span>
                      <strong>{bondedLabels.length} / {allSegmentLabels.length}</strong>
                    </div>
                    <div className="appliance-action-buttons">
                      <button
                        type="button"
                        onClick={() => setAppliancePreferences((current) => ({ ...current, bondedTeeth: null }))}
                        disabled={allSegmentLabels.length === 0}
                      >
                        Bond all
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppliancePreferences((current) => ({ ...current, bondedTeeth: [] }))}
                        disabled={bondedLabels.length === 0}
                      >
                        Remove all
                      </button>
                    </div>
                    {([
                      ["Upper right", upperTeeth.slice(0, 8)],
                      ["Upper left", upperTeeth.slice(8)],
                      ["Lower right", lowerTeeth.slice(0, 8)],
                      ["Lower left", lowerTeeth.slice(8)],
                    ] as Array<[string, string[]]>).map(([label, teeth]) => (
                      <div className="appliance-jaw-group" key={label}>
                        <span>{label}</span>
                        <div className="appliance-tooth-grid">
                          {teeth.map((tooth) => (
                            <button
                              type="button"
                              key={tooth}
                              aria-label={"Bracket FDI " + tooth}
                              aria-pressed={bondedLabels.includes(tooth)}
                              className={bondedLabels.includes(tooth) ? "is-active" : ""}
                              disabled={!allSegmentLabels.includes(tooth)}
                              onClick={() => setBondedFor(tooth)}
                            >
                              {tooth}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="appliance-layer-buttons appliance-layer-buttons--panel">
                      <button
                        type="button"
                        className={applianceLayers.brackets ? "is-active" : ""}
                        aria-pressed={applianceLayers.brackets}
                        onClick={() => setApplianceLayers((current) => ({ ...current, brackets: !current.brackets }))}
                      >
                        {applianceLayers.brackets ? "Brackets shown" : "Show brackets"}
                      </button>
                    </div>
                  </section>
                </>
              )}

              {applianceStep === "wire" && (
                <>
                  <section className="appliance-panel__section">
                    <div className="appliance-panel__heading">
                      <span>Wire material</span>
                      <strong>{appliancePreferences.material}</strong>
                    </div>
                    <div className="appliance-layer-buttons appliance-layer-buttons--panel" aria-label="Wire material">
                      {(["NiTi", "SS", "TMA"] as WireMaterial[]).map((material) => (
                        <button
                          type="button"
                          key={material}
                          className={appliancePreferences.material === material ? "is-active" : ""}
                          aria-pressed={appliancePreferences.material === material}
                          onClick={() => setAppliancePreferences((current) => ({ ...current, material }))}
                        >
                          {material}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="appliance-panel__section">
                    <div className="appliance-panel__heading">
                      <span>Wire dimension</span>
                      <strong>Inches</strong>
                    </div>
                    <div className="appliance-wire-sizes" aria-label="Wire dimension">
                      {([
                        ["0.014", '.014"'],
                        ["0.016", '.016"'],
                        ["0.016x0.022", '.016" × .022"'],
                        ["0.017x0.025", '.017" × .025"'],
                        ["0.019x0.025", '.019" × .025"'],
                      ] as Array<[WireSize, string]>).map(([size, label]) => (
                        <button
                          type="button"
                          key={size}
                          className={appliancePreferences.size === size ? "is-active" : ""}
                          aria-pressed={appliancePreferences.size === size}
                          onClick={() => setAppliancePreferences((current) => ({ ...current, size }))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="appliance-panel__empty">
                      Wire type and size are recorded separately from bracket prescription. Cross-section is illustrative.
                    </p>
                    <div className="appliance-layer-buttons appliance-layer-buttons--panel">
                      <button
                        type="button"
                        className={applianceLayers.archwire ? "is-active" : ""}
                        aria-pressed={applianceLayers.archwire}
                        onClick={() => setApplianceLayers((current) => ({ ...current, archwire: !current.archwire }))}
                      >
                        {applianceLayers.archwire ? "Wire shown" : "Show wire"}
                      </button>
                    </div>
                  </section>
                </>
              )}

              {applianceStep === "ties" && (
                <section className="appliance-panel__section">
                  <div className="appliance-panel__heading">
                    <span>O-Tie ligature</span>
                    <strong>{appliancePreferences.ligature}</strong>
                  </div>
                  <div className="appliance-wire-sizes" aria-label="O-Tie selection">
                    {(["None", "Clear", "Silver", "Purple"] as LigatureColor[]).map((ligature) => (
                      <button
                        type="button"
                        key={ligature}
                        className={appliancePreferences.ligature === ligature ? "is-active" : ""}
                        aria-pressed={appliancePreferences.ligature === ligature}
                        onClick={() => setAppliancePreferences((current) => ({ ...current, ligature }))}
                      >
                        {ligature}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {applianceStep === "ties" && (
                <section className="appliance-panel__section">
                  <div className="appliance-panel__heading">
                    <span>Auxiliaries</span>
                    <strong>Visual overlay</strong>
                  </div>
                  <div className="appliance-layer-buttons appliance-layer-buttons--panel" aria-label="Auxiliary mechanics">
                    {([
                      ["powerChain", "Power chain"],
                      ["coilSpring", "Closed coil"],
                      ["elastics", "Elastics"],
                      ["closingLoop", "Closing loop"],
                    ] as Array<[keyof ApplianceLayerState, string]>).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={applianceLayers[key] ? "is-active" : ""}
                        aria-pressed={applianceLayers[key]}
                        onClick={() => setApplianceLayers((current) => ({ ...current, [key]: !current[key] }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {applianceStep === "ties" && (
                <section className="appliance-panel__section">
                  <div className="appliance-panel__heading">
                    <span>Active mechanics</span>
                    <strong>Endpoints</strong>
                  </div>

                {applianceLayers.powerChain && (
                  <div className="mechanic-editor">
                    <strong>Power chain</strong>
                    <div className="mechanic-endpoints">
                      <label>
                        <span>From</span>
                        <UiSelect
                          value={mechanicEndpoints.chainStart}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              chainStart: value,
                            }))
                          }
                          options={allSegmentLabels}
                          ariaLabel="Power chain from"
                        />
                      </label>
                      <label>
                        <span>To</span>
                        <UiSelect
                          value={mechanicEndpoints.chainEnd}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              chainEnd: value,
                            }))
                          }
                          options={sameArchLabels(mechanicEndpoints.chainStart)}
                          ariaLabel="Power chain to"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {applianceLayers.coilSpring && (
                  <div className="mechanic-editor">
                    <strong>Closed-coil spring</strong>
                    <div className="mechanic-endpoints">
                      <label>
                        <span>From</span>
                        <UiSelect
                          value={mechanicEndpoints.coilStart}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              coilStart: value,
                            }))
                          }
                          options={allSegmentLabels}
                          ariaLabel="Closed-coil spring from"
                        />
                      </label>
                      <label>
                        <span>To</span>
                        <UiSelect
                          value={mechanicEndpoints.coilEnd}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              coilEnd: value,
                            }))
                          }
                          options={sameArchLabels(mechanicEndpoints.coilStart)}
                          ariaLabel="Closed-coil spring to"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {applianceLayers.elastics && (
                  <div className="mechanic-editor">
                    <strong>Interarch elastic</strong>
                    <div className="mechanic-endpoints">
                      <label>
                        <span>Upper</span>
                        <UiSelect
                          value={mechanicEndpoints.elasticUpper}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              elasticUpper: value,
                            }))
                          }
                          options={upperSegmentLabels}
                          ariaLabel="Interarch elastic upper"
                        />
                      </label>
                      <label>
                        <span>Lower</span>
                        <UiSelect
                          value={mechanicEndpoints.elasticLower}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              elasticLower: value,
                            }))
                          }
                          options={lowerSegmentLabels}
                          ariaLabel="Interarch elastic lower"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {applianceLayers.closingLoop && (
                  <div className="mechanic-editor">
                    <strong>Basic closing loop</strong>
                    <div className="mechanic-endpoints">
                      <label>
                        <span>From</span>
                        <UiSelect
                          value={mechanicEndpoints.loopStart}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              loopStart: value,
                            }))
                          }
                          options={allSegmentLabels}
                          ariaLabel="Closing loop from"
                        />
                      </label>
                      <label>
                        <span>To</span>
                        <UiSelect
                          value={mechanicEndpoints.loopEnd}
                          onChange={(value) =>
                            setMechanicEndpoints((current) => ({
                              ...current,
                              loopEnd: value,
                            }))
                          }
                          options={sameArchLabels(mechanicEndpoints.loopStart)}
                          ariaLabel="Closing loop to"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {!applianceLayers.powerChain &&
                  !applianceLayers.coilSpring &&
                  !applianceLayers.elastics &&
                  !applianceLayers.closingLoop && (
                    <p className="appliance-panel__empty">
                      Turn on a supported active mechanic from the toolbar to place and inspect it.
                    </p>
                  )}
                </section>
              )}

              <div className="appliance-boundary-note">
                <strong>Visualization boundary</strong>
                <p>
                  Brackets, wire, chain, coil, elastics and loop are generic geometry. Exact bracket prescription, force magnitude and biological response are not inferred here.
                </p>
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
