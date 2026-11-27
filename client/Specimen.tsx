import React, { Suspense, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei/core/Gltf.js";
import { OrbitControls } from "@react-three/drei/core/OrbitControls.js";
import { Box3, Vector3 } from "three";
const entries = [
  [
    "香草蛋糕胚",
    "cakes/sponge",
    "松软的烘焙气孔在切面上最明显。用刮刀薄薄抹一层奶油，就能接住细小的蛋糕屑。",
  ],
  [
    "草莓",
    "fruits/strawberry",
    "整颗草莓适合围边。切成扇片会露出浅色果心，小丁则适合藏在夹层里。",
  ],
  [
    "贝壳奶油",
    "frosting/shell",
    "星齿留下的纵向沟纹会接住侧光。让后一朵压住前一朵的尾尖，就能连成贝壳花边。",
  ],
  [
    "缎带结",
    "decorations/bow",
    "先确定蝴蝶结的中心，再转动蛋糕检查两条垂带，让它们顺着侧面落下。",
  ],
  [
    "抹面刮刀",
    "tools/palette-knife",
    "蘸取一小刀奶油，贴着表面抹开。重复经过同一处时，用收平动作理顺刀痕。",
  ],
];
function ObjectView({ file }: { file: string }) {
  const { scene } = useGLTF("./assets/models/" + file + ".glb", false, false);
  const object = useMemo(() => {
    const group = scene.clone(true),
      bounds = new Box3().setFromObject(group),
      size = bounds.getSize(new Vector3()),
      scale = 1.85 / Math.max(size.x, size.y, size.z, 0.01),
      center = bounds.getCenter(new Vector3());
    group.scale.multiplyScalar(scale);
    group.position.sub(center.multiplyScalar(scale));
    return group;
  }, [scene]);
  return <primitive object={object} dispose={null} />;
}
export default function Specimen() {
  const [i, index] = useState(0);
  return (
    <div className="specimen">
      <label>
        观察实物{" "}
        <select value={i} onChange={(e) => index(+e.target.value)}>
          {entries.map(([n], i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="bowl-stage">
        <Canvas
          frameloop="demand"
          camera={{ position: [1.65, 1.3, 2.8], fov: 40 }}
          dpr={[1, 1.55]}
        >
          <hemisphereLight args={["#fff3e0", "#b28d74", 1.9]} />
          <directionalLight position={[-3, 5, 3]} intensity={2.5} />
          <Suspense fallback={null}>
            <ObjectView file={entries[i][1]} />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={1.6}
            maxDistance={5}
          />
        </Canvas>
      </div>
      <p>{entries[i][2]}</p>
    </div>
  );
}
