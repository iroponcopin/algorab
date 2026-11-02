"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Box3, type Group, Matrix4, type Mesh, type PerspectiveCamera, Vector3 } from "three";
import { SPRING_EXPANSION, Spring } from "@/design/spring";
import type { ItemKind } from "./recipe-data";
import { disposeVoxelCache, modelFor, pinModel, type VoxelModel } from "./VoxelExtruder";

/** The model's bounds in its own units: the centre and a sphere that holds the whole box. */
function boundsOf(group: Group): { c: Vector3; r: number } {
  group.updateWorldMatrix(true, true);
  const inv = new Matrix4().copy(group.matrixWorld).invert();
  const box = new Box3();
  const p = new Vector3();
  group.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return;
    const toLocal = new Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(toLocal);
      box.expandByPoint(p);
    }
  });
  if (box.isEmpty()) return { c: new Vector3(), r: 1 };
  return { c: box.getCenter(new Vector3()), r: box.getSize(new Vector3()).length() / 2 };
}

const VIEW = new Vector3(0, 0.18, 1).normalize();

function Item({ model, accent }: { model: VoxelModel; accent: string }) {
  const { camera, size } = useThree();
  const holder = useRef<Group>(null);
  const scale = useRef(new Spring(SPRING_EXPANSION, 0.72));
  const aspect = size.width / Math.max(1, size.height);

  useEffect(() => {
    const s = boundsOf(model.group);
    model.group.position.set(-s.c.x, -s.c.y, -s.c.z);
    const vFov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const dist = (s.r / Math.sin(Math.min(vFov, hFov) / 2)) * 1.04;
    camera.position.copy(VIEW).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    scale.current.snap(0.72);
    scale.current.to(1);
  }, [model, aspect, camera]);

  useFrame((_, dt) => {
    scale.current.step(Math.min(dt, 1 / 30));
    holder.current?.scale.setScalar(scale.current.value);
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} />
      <directionalLight position={[-3, 2, -3]} intensity={1} color={accent} />
      <group ref={holder}>
        <primitive object={model.group} />
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.4} />
    </>
  );
}

/**
 * The item as a solid thing that turns by itself and follows a drag. One small scene with no plinth, no lights of its
 * own colour beyond the model's accent, and no wheel zoom, so the page scrolls over it. It stops drawing off screen and
 * in a hidden tab. Only ever mounted where WebGL 2 exists and motion is welcome; the picture under it covers the rest.
 */
export default function ItemTurntable({ url, kind, accent, onReady }: { url: string; kind: ItemKind; accent: string; onReady: (ready: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<VoxelModel | null>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let dead = false;
    onReady(false);
    modelFor(url, kind).then(
      (m) => {
        if (dead) return;
        pinModel(url, kind);
        setModel(m);
        onReady(true);
      },
      () => undefined,
    );
    return () => {
      dead = true;
    };
  }, [url, kind, onReady]);

  useEffect(() => () => disposeVoxelCache(), []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let seen = true;
    const sync = (): void => setLive(seen && !document.hidden);
    const io = new IntersectionObserver((e) => {
      seen = e[0]?.isIntersecting ?? true;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={box} className="rx-turntable">
      <Canvas dpr={[1, 2]} frameloop={live ? "always" : "never"} camera={{ position: [0, 0.5, 6], fov: 26, near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        {model ? <Item key={model.group.uuid} model={model} accent={accent} /> : null}
      </Canvas>
    </div>
  );
}
