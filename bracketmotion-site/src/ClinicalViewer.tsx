import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const MODEL_URL =
  "https://raw.githubusercontent.com/organui/teeth-3d/main/public/models/teeth.glb";

type ViewName = "Front" | "Right" | "Left" | "Upper" | "Lower";
type TransformMode = "translate" | "rotate";

type StoredTransform = {
  position: Vector3;
  quaternion: Quaternion;
};

export type ClinicalViewerHandle = {
  setView: (view: ViewName) => void;
  showInitial: () => void;
  showTarget: () => void;
  previewMovement: () => void;
};

type Props = {
  onSelectionChange?: (label: string | null) => void;
};

function isTooth(object: Object3D) {
  const id = String(object.userData.structureId || object.name || "");
  return (
    id.includes("incisor") ||
    id.includes("canine") ||
    id.includes("premolar") ||
    id.includes("molar")
  );
}

function labelFor(object: Object3D | null) {
  if (!object) return null;
  const id = String(object.userData.structureId || object.name || "");
  if (!id) return "Selected tooth";
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cloneModel(source: Group) {
  const copy = source.clone(true);

  copy.traverse((object) => {
    if (!(object instanceof Mesh)) return;

    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => material.clone());
    } else {
      object.material = object.material.clone();
    }

    if (!isTooth(object)) return;

    object.userData.bmBase = {
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
    } satisfies StoredTransform;

    object.userData.bmTarget = {
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
    } satisfies StoredTransform;
  });

  return copy;
}

function disposeModel(model: Group) {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function SceneModel({
  model,
  selected,
  onSelect,
}: {
  model: Group;
  selected: Object3D | null;
  onSelect: (object: Object3D) => void;
}) {
  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return;

        const selectedTooth = object === selected;
        material.emissive.set(selectedTooth ? "#6d4cf5" : "#000000");
        material.emissiveIntensity = selectedTooth ? 0.34 : 0;
        material.roughness = 0.55;
        material.needsUpdate = true;
      });
    });
  }, [model, selected]);

  return (
    <primitive
      object={model}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta > 5) return;

        const object = event.object;
        if (!isTooth(object)) return;
        onSelect(object);
      }}
    />
  );
}

function ViewerControls({
  model,
  selected,
  mode,
  view,
  viewNonce,
}: {
  model: Group;
  selected: Object3D | null;
  mode: TransformMode;
  view: ViewName;
  viewNonce: number;
}) {
  const { camera, gl, scene } = useThree();
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const selectedRef = useRef<Object3D | null>(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const bounds = useMemo(() => {
    const box = new Box3().setFromObject(model);
    const center = box.getCenter(new Vector3());
    const radius = Math.max(1, box.getSize(new Vector3()).length() / 2);
    return { center, radius };
  }, [model]);

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.enablePan = true;
    orbit.rotateSpeed = 0.65;
    orbit.zoomSpeed = 0.8;
    orbit.panSpeed = 0.6;
    orbit.minDistance = bounds.radius * 1.15;
    orbit.maxDistance = bounds.radius * 7;
    orbit.target.copy(bounds.center);
    orbitRef.current = orbit;

    const transform = new TransformControls(camera, gl.domElement);
    transform.setMode(mode);
    transform.setSize(0.72);
    scene.add(transform.getHelper());
    transformRef.current = transform;

    const onMouseDown = () => {
      orbit.enabled = false;
    };
    const onMouseUp = () => {
      orbit.enabled = true;
    };
    const onObjectChange = () => {
      const current = selectedRef.current;
      if (!current || !isTooth(current)) return;
      current.userData.bmTarget = {
        position: current.position.clone(),
        quaternion: current.quaternion.clone(),
      } satisfies StoredTransform;
    };

    transform.addEventListener("mouseDown", onMouseDown);
    transform.addEventListener("mouseUp", onMouseUp);
    transform.addEventListener("objectChange", onObjectChange);

    return () => {
      transform.detach();
      transform.removeEventListener("mouseDown", onMouseDown);
      transform.removeEventListener("mouseUp", onMouseUp);
      transform.removeEventListener("objectChange", onObjectChange);
      scene.remove(transform.getHelper());
      transform.dispose();
      orbit.dispose();
      transformRef.current = null;
      orbitRef.current = null;
    };
  }, [bounds.center, bounds.radius, camera, gl.domElement, scene]);

  useEffect(() => {
    const orbit = orbitRef.current;
    const transform = transformRef.current;
    if (!orbit || !transform) return;

    transform.setMode(mode);
    if (selected) transform.attach(selected);
    else transform.detach();
  }, [mode, selected]);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    const direction =
      view === "Right"
        ? new Vector3(-1, 0, 0)
        : view === "Left"
          ? new Vector3(1, 0, 0)
          : view === "Upper"
            ? new Vector3(0, 1, 0)
            : view === "Lower"
              ? new Vector3(0, -1, 0)
              : new Vector3(0, 0, 1);

    camera.up.set(
      0,
      view === "Upper" || view === "Lower" ? 0 : 1,
      view === "Upper" ? -1 : view === "Lower" ? 1 : 0,
    );

    orbit.target.copy(bounds.center);
    camera.position
      .copy(bounds.center)
      .add(direction.multiplyScalar(bounds.radius * 3.15));
    camera.lookAt(bounds.center);
    orbit.update();
  }, [bounds.center, bounds.radius, camera, view, viewNonce]);

  useFrame(() => orbitRef.current?.update());

  return null;
}

function MovementAnimator({
  selected,
  animationNonce,
}: {
  selected: Object3D | null;
  animationNonce: number;
}) {
  const animation = useRef<{
    object: Object3D;
    start: StoredTransform;
    target: StoredTransform;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    if (!selected || !isTooth(selected) || animationNonce === 0) return;

    const base = selected.userData.bmBase as StoredTransform | undefined;
    const storedTarget = selected.userData.bmTarget as StoredTransform | undefined;
    if (!base || !storedTarget) return;

    const target = {
      position: storedTarget.position.clone(),
      quaternion: storedTarget.quaternion.clone(),
    };

    const unchanged =
      target.position.distanceTo(base.position) < 0.001 &&
      1 - Math.abs(target.quaternion.dot(base.quaternion)) < 0.0001;

    if (unchanged) {
      target.position.x += 0.18;
      target.position.y += 0.06;
      target.quaternion.multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.12),
      );
      selected.userData.bmTarget = {
        position: target.position.clone(),
        quaternion: target.quaternion.clone(),
      } satisfies StoredTransform;
    }

    selected.position.copy(base.position);
    selected.quaternion.copy(base.quaternion);

    animation.current = {
      object: selected,
      start: {
        position: base.position.clone(),
        quaternion: base.quaternion.clone(),
      },
      target,
      elapsed: 0,
    };
  }, [animationNonce, selected]);

  useFrame((_, delta) => {
    const current = animation.current;
    if (!current) return;

    current.elapsed += delta;
    const progress = Math.min(1, current.elapsed / 1.15);
    const eased = 1 - Math.pow(1 - progress, 3);

    current.object.position.lerpVectors(
      current.start.position,
      current.target.position,
      eased,
    );
    current.object.quaternion
      .copy(current.start.quaternion)
      .slerp(current.target.quaternion, eased);

    if (progress >= 1) animation.current = null;
  });

  return null;
}

const ClinicalViewer = forwardRef<ClinicalViewerHandle, Props>(
  function ClinicalViewer({ onSelectionChange }, ref) {
    const [model, setModel] = useState<Group | null>(null);
    const [selected, setSelected] = useState<Object3D | null>(null);
    const [mode, setMode] = useState<TransformMode>("translate");
    const [view, setView] = useState<ViewName>("Front");
    const [viewNonce, setViewNonce] = useState(0);
    const [animationNonce, setAnimationNonce] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      let loaded: Group | null = null;

      async function loadModel() {
        setLoading(true);
        setError(null);

        try {
          const response = await fetch(MODEL_URL);
          if (!response.ok) {
            throw new Error(`Model request failed with HTTP ${response.status}.`);
          }

          const data = await response.arrayBuffer();
          const gltf = await new GLTFLoader().parseAsync(data, "");
          loaded = cloneModel(gltf.scene);

          if (cancelled) {
            disposeModel(loaded);
            return;
          }

          setModel(loaded);
        } catch (cause) {
          if (!cancelled) {
            setError(
              cause instanceof Error ? cause.message : "The demo model could not load.",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      void loadModel();

      return () => {
        cancelled = true;
        if (loaded) disposeModel(loaded);
      };
    }, []);

    const selectedLabel = labelFor(selected);

    useEffect(() => {
      onSelectionChange?.(selectedLabel);
    }, [onSelectionChange, selectedLabel]);

    const showInitial = () => {
      if (!selected) return;
      const base = selected.userData.bmBase as StoredTransform | undefined;
      if (!base) return;
      selected.position.copy(base.position);
      selected.quaternion.copy(base.quaternion);
    };

    const showTarget = () => {
      if (!selected) return;
      const target = selected.userData.bmTarget as StoredTransform | undefined;
      if (!target) return;
      selected.position.copy(target.position);
      selected.quaternion.copy(target.quaternion);
    };

    const previewMovement = useCallback(() => {
      if (!selected) return;
      setAnimationNonce((value) => value + 1);
    }, [selected]);

    useImperativeHandle(
      ref,
      () => ({
        setView(nextView) {
          setView(nextView);
          setViewNonce((value) => value + 1);
        },
        showInitial,
        showTarget,
        previewMovement,
      }),
      [selected],
    );

    return (
      <div className="clinical-viewer">
        {loading && (
          <div className="clinical-viewer__message" role="status">
            <strong>Loading segmented demo dentition…</strong>
            <span>Open anatomy model for the 3D proof of concept.</span>
          </div>
        )}

        {error && (
          <div className="clinical-viewer__message is-error" role="alert">
            <strong>3D demo unavailable</strong>
            <span>{error}</span>
          </div>
        )}

        {model && !error && (
          <>
            <Canvas
              camera={{ fov: 35, near: 0.01, far: 1000 }}
              dpr={[1, 1.75]}
              onPointerMissed={() => setSelected(null)}
            >
              <color attach="background" args={["#bfc1c9"]} />
              <ambientLight intensity={1.1} />
              <hemisphereLight args={["#fffdf8", "#8b91a0", 1.6]} />
              <directionalLight position={[-4, 6, 7]} intensity={2.4} />
              <directionalLight position={[5, 1, -5]} intensity={1.4} />
              <SceneModel
                model={model}
                selected={selected}
                onSelect={setSelected}
              />
              <ViewerControls
                model={model}
                selected={selected}
                mode={mode}
                view={view}
                viewNonce={viewNonce}
              />
              <MovementAnimator
                selected={selected}
                animationNonce={animationNonce}
              />
            </Canvas>

            <div className="clinical-viewer__hint">
              Drag to rotate · wheel to zoom · right-drag to pan · click a tooth
            </div>

            <div className="clinical-viewer__controls">
              <div className="clinical-viewer__selection">
                <span>Selected</span>
                <strong>{selectedLabel || "Choose a tooth"}</strong>
              </div>

              <div className="clinical-viewer__control-group">
                <button
                  className={`viewer-mode-button${mode === "translate" ? " is-active" : ""}`}
                  type="button"
                  disabled={!selected}
                  onClick={() => setMode("translate")}
                >
                  Move
                </button>
                <button
                  className={`viewer-mode-button${mode === "rotate" ? " is-active" : ""}`}
                  type="button"
                  disabled={!selected}
                  onClick={() => setMode("rotate")}
                >
                  Rotate
                </button>
                <button
                  className="viewer-mode-button"
                  type="button"
                  disabled={!selected}
                  onClick={showInitial}
                >
                  Initial
                </button>
                <button
                  className="viewer-mode-button"
                  type="button"
                  disabled={!selected}
                  onClick={showTarget}
                >
                  Target
                </button>
                <button
                  className="viewer-preview-button"
                  type="button"
                  disabled={!selected}
                  onClick={previewMovement}
                >
                  Preview movement
                </button>
              </div>
            </div>

            <a
              className="clinical-viewer__credit"
              href="https://github.com/organui/teeth-3d"
              target="_blank"
              rel="noreferrer"
            >
              Demo anatomy: BodyParts3D / DBCLS · CC BY-SA 2.1 JP · adapted by OrganUI
            </a>

          </>
        )}
      </div>
    );
  },
);

export default ClinicalViewer;
