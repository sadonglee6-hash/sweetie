import * as T from "three";
import { crumbSize, crumbLuminance } from "./crumb-grain.js";

let maps;
export function crumbMaps() {
  if (maps) return maps;
  const raw = atob(crumbLuminance),
    col = new Uint8Array(raw.length * 4);
  const depth = new Uint8Array(col.length),
    rough = new Uint8Array(col.length);
  const surface = new Uint8Array(col.length),
    grain = new Uint8Array(col.length);
  let state = 1107281;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const holes = new Float32Array(raw.length);
  const wrap = (i) => ((i % crumbSize) + crumbSize) % crumbSize;
  for (let k = 0; k < 960; k++) {
    const x = random() * crumbSize,
      y = random() * crumbSize,
      r = 0.35 + 1.55 * random() ** 2;
    for (let iy = Math.floor(y - r); iy <= y + r; iy++)
      for (let ix = Math.floor(x - r); ix <= x + r; ix++) {
        const t = Math.max(
          0,
          1 - Math.hypot((ix + 0.5 - x) * 0.9, iy + 0.5 - y) / r,
        );
        holes[wrap(iy) * crumbSize + wrap(ix)] += t * t;
      }
  }
  for (let i = 0; i < raw.length; i++) {
    const h = raw.charCodeAt(i) / 255,
      k = i * 4;
    const pore = Math.max(0, 0.48 - h),
      light = Math.min(1, 0.58 + 0.47 * Math.pow(h, 0.78));
    col[k] = 255 * light;
    col[k + 1] = 255 * (light - 0.025 * pore);
    col[k + 2] = 255 * (light - 0.085 * pore);
    const d = 255 * (0.1 + 0.85 * Math.pow(h, 0.81)),
      r = 255 * (0.87 + 0.11 * (1 - h));
    for (let j = 0; j < 3; j++) {
      depth[k + j] = d;
      rough[k + j] = r;
    }
    col[k + 3] = depth[k + 3] = rough[k + 3] = 255;
    const x = i % crumbSize,
      y = Math.floor(i / crumbSize);
    let local = 0;
    for (const dy of [-13, -6, 0, 6, 13])
      for (const dx of [-13, -6, 0, 6, 13])
        local += raw.charCodeAt(wrap(y + dy) * crumbSize + wrap(x + dx));
    local /= 25 * 255;
    const mottling =
      0.92 + 0.24 * (local - 0.54) + 0.041 * (h - 0.52) - 0.23 * holes[i];
    surface[k] = Math.min(255, 255 * mottling * 1.024);
    surface[k + 1] = 255 * mottling * 0.972;
    surface[k + 2] = 255 * mottling * 0.9;
    const micro =
      255 *
      (0.53 + 0.11 * (h - 0.52) + 0.24 * (local - 0.54) - 0.42 * holes[i]);
    grain[k] = grain[k + 1] = grain[k + 2] = micro;
    grain[k + 3] = surface[k + 3] = 255;
  }
  function tile(pixels, color = false) {
    const tex = new T.DataTexture(pixels, crumbSize, crumbSize, T.RGBAFormat);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.anisotropy = 6;
    tex.minFilter = T.LinearMipmapLinearFilter;
    tex.magFilter = T.LinearFilter;
    tex.generateMipmaps = true;
    if (color) tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  maps = {
    color: tile(col, true),
    height: tile(depth),
    rough: tile(rough),
    crust: tile(surface, true),
    crustBump: tile(grain),
  };
  return maps;
}
export const grainPeriod = 0.47;
export function grainUV(x, y, seed) {
  return [
    x / grainPeriod +
      0.037 * Math.sin(3.1 * y + 0.71 * x + seed) +
      seed * 0.337,
    y / grainPeriod + 0.03 * Math.sin(4.7 * x - 1.6 * y + seed) + seed * 0.183,
  ];
}
export function toastTone(amount, variation) {
  // Linear multipliers over each recipe's own sponge flavour.
  const t = Math.min(1, Math.max(0, amount)),
    v = 1 + variation;
  return [v * (1 - 0.19 * t), v * (1 - 0.45 * t), v * (1 - 0.65 * t)];
}
