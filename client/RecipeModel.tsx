import React, { useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei/core/OrbitControls.js";
import { displayCake } from "../src/cake3d.js";
function Model({ design }: { design: any }) {
  const item = useMemo(() => displayCake(design), [design]);
  useEffect(() => () => item.dispose(), [item]);
  return <primitive object={item.group} dispose={null} />;
}
export default function RecipeModel({ design }: { design: any }) {
  return (
    <Canvas
      camera={{ position: [3.1, 2.3, 4.9], fov: 35 }}
      dpr={[1, 1.65]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={<p>当前浏览器无法显示三维预览。</p>}
    >
      <hemisphereLight args={["#fff1dc", "#b89081", 1.9]} />
      <directionalLight position={[-3, 6, 4]} intensity={3.1} color="#ffead1" />
      <directionalLight position={[4, 2, -3]} intensity={1.3} />
      <Model design={design} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        target={[0, 0.17, 0]}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  );
}
