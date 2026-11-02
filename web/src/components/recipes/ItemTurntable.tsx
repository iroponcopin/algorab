"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  type PerspectiveCamera,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from "three";
import { SPRING_EXPANSION, Spring } from "@/design/spring";
import { asset } from "@/lib/site";

/** One baked shape (web/scripts/build_item_models.py): a quad is 12 position integers, then 8 texture integers. */
interface ShapeFile {
  d?: 1;
  m: { t: string; c?: string; a?: 1; q: number[] }[];
}

const POS = 64;
const TEX = 4096;

async function loadShape(file: string): Promise<Group> {
  const res = await fetch(asset(`models/${file}.json`));
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as ShapeFile;
  const loader = new TextureLoader();
  const group = new Group();
  await Promise.all(
    data.m.map(async (mat) => {
      const tex = await loader.loadAsync(asset(`models/t/${mat.t}`));
      tex.magFilter = NearestFilter;
      tex.minFilter = NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = SRGBColorSpace;
      tex.flipY = false;
      const n = mat.q.length / 20;
      const pos = new Float32Array(n * 12);
      const uv = new Float32Array(n * 8);
      const index = new Uint32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const at = i * 20;
        for (let k = 0; k < 12; k++) pos[i * 12 + k] = (mat.q[at + k] as number) / POS;
        for (let k = 0; k < 8; k++) uv[i * 8 + k] = (mat.q[at + 12 + k] as number) / TEX;
        const v = i * 4;
        index.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new BufferAttribute(pos, 3));
      geo.setAttribute("uv", new BufferAttribute(uv, 2));
      geo.setIndex(new BufferAttribute(index, 1));
      geo.computeVertexNormals();
      const material = new MeshLambertMaterial({
        map: tex,
        side: data.d ? DoubleSide : FrontSide,
        ...(mat.a ? { transparent: true, depthWrite: false, alphaTest: 0.02 } : { alphaTest: 0.5 }),
        ...(mat.c ? { color: new Color(`#${mat.c}`) } : {}),
      });
      group.add(new Mesh(geo, material));
    }),
  );
  return group;
}

function dispose(group: Group): void {
  group.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mat = m.material as MeshLambertMaterial;
    (mat.map as Texture | null)?.dispose();
    mat.dispose();
  });
}

const SOLID_VIEW = new Vector3(0.62, 0.42, 0.8).normalize();
const FLAT_VIEW = new Vector3(0.28, 0.12, 1).normalize();
const SIDE_X = new Vector3(1, 0.2, 0.28).normalize();
const SIDE_Z = new Vector3(0.28, 0.2, 1).normalize();

function Item({ shape, flat, accent, still }: { shape: Group; flat: boolean; accent: string; still: boolean }) {
  const { camera, size } = useThree();
  const holder = useRef<Group>(null);
  const scale = useRef(new Spring(SPRING_EXPANSION, still ? 1 : 0.72));
  const aspect = size.width / Math.max(1, size.height);

  useEffect(() => {
    const box = new Box3().setFromObject(shape);
    const c = box.getCenter(new Vector3());
    const d = box.getSize(new Vector3());
    shape.position.sub(c);
    // A long thing is shown side-on: the camera starts across its longest level axis, so a rifle reads as a rifle.
    const long = Math.max(d.x, d.z) > 1.6 * Math.min(d.x, d.z);
    const view = flat ? FLAT_VIEW : long && d.z > d.x ? SIDE_X : long ? SIDE_Z : SOLID_VIEW;
    // It turns about the vertical, so it must fit that circle across and its own height up.
    const level = Math.hypot(d.x, d.z) / 2 || 1;
    const vFov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const dist = Math.max(level / Math.sin(hFov / 2), (d.y / 2) / Math.tan(vFov / 2) + level * 0.6) * 1.06;
    camera.position.copy(view).multiplyScalar(dist);
    camera.near = dist / 50;
    camera.far = dist * 6;
    (camera as PerspectiveCamera).updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    if (!still) scale.current.to(1);
    return () => {
      shape.position.add(c);
    };
  }, [shape, flat, still, aspect, camera]);

  useFrame((_, dt) => {
    scale.current.step(Math.min(dt, 1 / 30));
    holder.current?.scale.setScalar(scale.current.value);
  });

  return (
    <>
      <ambientLight intensity={2.1} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-3, 2, -3]} intensity={0.8} color={accent} />
      <group ref={holder}>
        <primitive object={shape} />
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} enableZoom={false} autoRotate={!still} autoRotateSpeed={1.4} />
    </>
  );
}

/**
 * The item as the game draws it: its own model, its own textures, nearest-pixel sampling, turning by itself and following
 * a drag. No wheel zoom, so the page scrolls over it; it stops drawing off screen and in a hidden tab. The picture under
 * it stays until the model has arrived, and stays for good where a model cannot be drawn.
 */
export default function ItemTurntable({ file, flat, accent, still, onReady }: { file: string; flat: boolean; accent: string; still: boolean; onReady: (ready: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<Group | null>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let dead = false;
    let made: Group | null = null;
    onReady(false);
    loadShape(file).then(
      (g) => {
        if (dead) {
          dispose(g);
          return;
        }
        made = g;
        setShape(g);
        onReady(true);
      },
      () => undefined,
    );
    return () => {
      dead = true;
      if (made) dispose(made);
    };
  }, [file, onReady]);

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
      <Canvas flat dpr={[1, 2]} frameloop={live ? "always" : "never"} camera={{ position: [0, 0.5, 6], fov: 22, near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        {shape ? <Item key={shape.uuid} shape={shape} flat={flat} accent={accent} still={still} /> : null}
      </Canvas>
    </div>
  );
}
