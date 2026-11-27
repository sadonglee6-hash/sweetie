import React, { Suspense, useMemo, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei/core/Gltf.js";
import { Color, Mesh, MeshStandardMaterial } from "three";
function Bowl({ color, turn }: { color: string; turn: number }) {
  const { scene } = useGLTF(
    "./assets/models/tools/mixing-bowl.glb",
    false,
    false,
  );
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof Mesh && o.material.name === "cream")
        o.material = o.material.clone();
    });
    return clone;
  }, [scene]);
  model.traverse((o) => {
    if (o instanceof Mesh && o.material.name === "cream")
      (o.material as MeshStandardMaterial).color.set(color);
  });
  return (
    <primitive
      object={model}
      position={[0, -0.23, 0]}
      rotation={[0, turn * 0.022, 0]}
    />
  );
}
function mix(base: string, tint: string, ratio: number) {
  return "#" + new Color(base).lerp(new Color(tint), ratio).getHexString();
}
export default function Mixing({
  base,
  onUse,
}: {
  base: string;
  onUse: (c: string) => void;
}) {
  const [tint, setTint] = useState("#ed839b"),
    [ratio, setRatio] = useState(0.2),
    [turn, stir] = useState(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const mixed = mix(base, tint, ratio);
  function whisk(n: number) {
    stir((v) => v + n);
    setRatio((v) => Math.min(0.98, v + n * 0.0025));
  }
  return (
    <div className="mixdesk">
      <div
        className="bowl-stage"
        aria-label="拖动搅拌奶油"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (last.current) {
            whisk(
              Math.min(
                18,
                Math.hypot(
                  last.current.x - e.clientX,
                  last.current.y - e.clientY,
                ),
              ),
            );
            last.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerUp={() => {
          last.current = null;
        }}
        onPointerCancel={() => {
          last.current = null;
        }}
      >
        <Canvas
          camera={{ position: [0, 1.65, 2.65], fov: 42 }}
          frameloop="demand"
          dpr={[1, 1.5]}
        >
          <hemisphereLight args={["#fffff7", "#b68768", 1.8]} />
          <directionalLight position={[-2, 4, 3]} intensity={2.2} />
          <Suspense fallback={null}>
            <Bowl color={mixed} turn={turn} />
          </Suspense>
        </Canvas>
      </div>
      <p>选一滴色素，在碗上画圈，把颜色拌进奶油。</p>
      <label>
        色素{" "}
        <input
          type="color"
          aria-label="色素"
          value={tint}
          onChange={(e) => setTint(e.target.value)}
        />
      </label>{" "}
      <label>
        浓度{" "}
        <input
          type="range"
          aria-label="调色浓度"
          value={ratio}
          min="0"
          max="1"
          step=".01"
          onChange={(e) => setRatio(+e.target.value)}
        />
      </label>
      <div className="book-actions">
        <button onClick={() => whisk(12)}>搅拌一圈</button>
        <button className="ink-button" onClick={() => onUse(mixed)}>
          把这碗颜色用到蛋糕上
        </button>
      </div>
    </div>
  );
}
