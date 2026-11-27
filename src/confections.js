import * as T from "three";
import { crumbMaps } from "./baked-materials.js";
import { coverStamp, coverTypes } from "./cover-stamps.js";
import {
  buildFruitStamp,
  buildNumberStamp,
  isFruitStamp,
} from "./fruit-cuts.js";

const TAU = Math.PI * 2;
const matCache = new Map();
const stampCache = new Map();
const textures = new Map();
const v = (x, y, z) => new T.Vector3(x, y, z);

function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function pastryTexture(kind) {
  if (textures.has(kind)) return textures.get(kind);
  if (kind === "sponge") return crumbMaps().color;
  const cn = document.createElement("canvas");
  cn.width = cn.height = 256;
  const ctx = cn.getContext("2d");
  const rng = random(7924);
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const f = 239 + rng() * 13;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = f;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const map = new T.CanvasTexture(cn);
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.colorSpace = T.SRGBColorSpace;
  map.repeat.set(4, 2);
  textures.set(kind, map);
  return map;
}

export function material(color, kind = "cream") {
  const key = kind + (color?.isColor ? color.getHexString() : color);
  if (matCache.has(key)) return matCache.get(key);
  const gloss = {
    fruit: 0.3,
    seed: 0.55,
    leaf: 0.52,
    cream: 0.62,
    flower: 0.61,
    pearl: 0.26,
    gold: 0.28,
    metal: 0.3,
    ceramic: 0.24,
    chocolate: 0.42,
    ribbon: 0.43,
    matte: 0.78,
  };
  const m = new T.MeshStandardMaterial({
    color,
    roughness: gloss[kind] ?? 0.6,
    metalness:
      kind === "gold"
        ? 0.56
        : kind === "metal"
          ? 0.78
          : kind === "pearl"
            ? 0.13
            : 0.015,
  });
  if (
    kind === "cream" ||
    kind === "fruit" ||
    kind === "chocolate" ||
    kind === "sponge"
  ) {
    const map = pastryTexture(kind === "sponge" ? "sponge" : "fine");
    m.bumpMap = map;
    m.bumpScale = kind === "sponge" ? 0.014 : 0.0016;
    if (kind === "sponge") {
      const grain = crumbMaps();
      m.map = grain.color;
      m.bumpMap = grain.height;
      m.bumpScale = 0.013;
      m.roughnessMap = grain.rough;
      m.roughness = 0.98;
      m.metalness = 0;
      m.userData.sweetieCrumb = true;
    } else if (kind === "cream") {
      m.roughness = 0.6;
      m.metalness = 0;
      m.bumpScale = 0.002;
    }
  }
  if (
    kind === "flower" ||
    kind === "leaf" ||
    kind === "ribbon" ||
    kind === "gold"
  )
    m.side = T.DoubleSide;
  matCache.set(key, m);
  return m;
}

function mesh(group, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, mat);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function oval(g, mat, x, y, z, rx, ry, rz, seg = 18) {
  const m = mesh(
    g,
    new T.SphereGeometry(1, seg, Math.max(8, Math.floor(seg * 0.65))),
    mat,
    x,
    y,
    z,
  );
  m.scale.set(rx, ry, rz);
  return m;
}

function curveTube(g, mat, points, r, segments = 16) {
  return mesh(
    g,
    new T.TubeGeometry(new T.CatmullRomCurve3(points), segments, r, 6, false),
    mat,
  );
}

function profileGeometry(point, cols = 48, rows = 24) {
  const pos = [],
    uv = [],
    idx = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const [x, y, z] = point((i / cols) * TAU, j / rows);
      pos.push(x, y, z);
      uv.push(i / cols, j / rows);
      if (j < rows && i < cols) {
        const a = j * (cols + 1) + i,
          c = a + cols + 1;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function extruded(g, shape, depth, mat, bevel = 0.004) {
  return mesh(
    g,
    new T.ExtrudeGeometry(shape, {
      depth,
      curveSegments: 14,
      bevelEnabled: bevel > 0,
      bevelSegments: 3,
      bevelSize: bevel,
      bevelThickness: bevel,
    }),
    mat,
  );
}

function petal(
  g,
  mat,
  theta,
  rad,
  y,
  width,
  length,
  lift = 1,
  openness = 0.45,
) {
  const pos = [],
    idx = [],
    W = 8,
    H = 10;
  for (let j = 0; j <= H; j++) {
    const t = j / H;
    for (let i = 0; i <= W; i++) {
      const s = (i / W) * 2 - 1;
      const w = width * Math.pow(Math.sin(Math.PI * (0.04 + 0.94 * t)), 0.65);
      let r = rad + length * openness * t * t + 0.14 * w * s * s * t;
      let h =
        y +
        length * lift * (t - 0.37 * t * t * t) -
        length * 0.14 * s * s * t +
        0.007 * Math.cos(7 * s + theta) * t * t * t * t;
      pos.push(
        Math.cos(theta) * r - Math.sin(theta) * w * s,
        h,
        Math.sin(theta) * r + Math.cos(theta) * w * s,
      );
      if (i < W && j < H) {
        const a = j * (W + 1) + i,
          b = a + W + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  mesh(g, geo, mat);
}

function rose(g, color) {
  const m = material(color, "flower");
  for (let ring = 0; ring < 4; ring++) {
    const count = [4, 6, 8, 10][ring],
      rad = [0.008, 0.023, 0.044, 0.071][ring];
    for (let i = 0; i < count; i++)
      petal(
        g,
        m,
        (i / count) * TAU + ring * 0.72,
        rad,
        [0.05, 0.033, 0.017, 0.003][ring],
        0.026 + 0.012 * ring,
        0.123 - ring * 0.004,
        1.15 - ring * 0.13,
        0.12 + ring * 0.19,
      );
  }
  oval(g, m, 0, 0.085, 0, 0.025, 0.035, 0.025);
}

function leaf(
  g,
  theta,
  rad,
  y,
  width = 0.032,
  length = 0.09,
  color = "#647343",
) {
  petal(g, material(color, "leaf"), theta, rad, y, width, length, 0.31, 1.1);
}

function ribbon(g, color) {
  const m = material(color, "ribbon"),
    dark = material(new T.Color(color).multiplyScalar(0.83), "ribbon");
  const strip = (path, width, mat, tail = false) => {
    const p = [],
      idx = [],
      n = 28;
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        a = path(t),
        w = width * (tail ? 1 - 0.28 * t : 0.38 + 0.65 * Math.sin(Math.PI * t));
      p.push(
        a.x,
        a.y + w * 0.5,
        a.z + w * 0.14,
        a.x,
        a.y - w * 0.48,
        a.z - w * 0.16,
      );
      if (i < n) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    geom.setIndex(idx);
    geom.computeVertexNormals();
    mesh(g, geom, mat);
  };
  for (const dir of [-1, 1]) {
    strip(
      (t) =>
        v(
          dir * (0.013 + 0.205 * Math.sin(Math.PI * t)),
          0.077 + 0.063 * Math.sin(Math.PI * t) - 0.022 * Math.sin(t * TAU),
          0.053 * Math.sin(TAU * t),
        ),
      0.098,
      m,
    );
    strip(
      (t) =>
        v(
          dir * (0.016 + 0.113 * t + 0.038 * Math.sin(t * 3)),
          0.06 - 0.148 * t,
          0.004 + 0.034 * Math.sin(t * 4),
        ),
      0.057,
      dark,
      true,
    );
  }
  oval(g, m, 0, 0.073, 0.015, 0.038, 0.045, 0.039);
}

function cherry(g) {
  const m = material("#8e152a", "fruit");
  const geo = profileGeometry(
    (a, t) => {
      const phi = t * Math.PI,
        shoulder = Math.sin(phi);
      const seam = Math.exp(-11 * (1 - Math.cos(a - 0.5)));
      const r =
        0.121 *
        shoulder *
        (0.96 + 0.12 * t) *
        (1 - 0.073 * seam * shoulder + 0.034 * Math.cos(a * 2));
      const yy =
        0.105 * (1 - Math.cos(phi)) +
        0.003 -
        0.031 * Math.pow(t, 9) +
        0.007 * Math.sin(a) * shoulder * shoulder;
      return [r * Math.cos(a) + 0.006 * t, yy, r * Math.sin(a) * 0.96];
    },
    38,
    23,
  );
  mesh(g, geo, m);
  curveTube(
    g,
    material("#59603a", "leaf"),
    [
      v(0.006, 0.181, 0),
      v(0.004, 0.26, 0.006),
      v(0.03, 0.362, -0.011),
      v(0.084, 0.432, -0.024),
    ],
    0.0055,
    18,
  );
  oval(
    g,
    material("#65552f", "leaf"),
    0.084,
    0.432,
    -0.024,
    0.009,
    0.011,
    0.008,
    10,
  );
}

function strawberry(g, leafy = true) {
  const aRad = (t) =>
    0.151 * Math.pow(Math.sin(Math.PI * t), 0.69) * (1.25 - 0.66 * t);
  mesh(
    g,
    profileGeometry(
      (a, t) => {
        const r = aRad(t) * (1 + 0.018 * Math.sin(3 * a + 1.2));
        return [
          r * Math.cos(a) + 0.018 * t * t,
          0.325 * t - 0.006,
          r * Math.sin(a) * 0.88,
        ];
      },
      40,
      27,
    ),
    material("#b92233", "fruit"),
  );
  const sm = material("#f7cd83", "seed");
  for (let row = 1; row <= 8; row++) {
    const t = row / 9.5,
      n = Math.max(5, Math.round(aRad(t) * 105));
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.42 * (row % 2)) / n) * TAU,
        r = aRad(t) * (1 + 0.018 * Math.sin(3 * a + 1.2));
      const s = oval(
        g,
        sm,
        (r + 0.001) * Math.cos(a) + 0.018 * t * t,
        t * 0.325 - 0.006,
        (r + 0.001) * Math.sin(a) * 0.88,
        0.003,
        0.0057,
        0.0026,
        8,
      );
      s.rotation.y = -a;
    }
  }
  if (!leafy) return;
  for (let i = 0; i < 6; i++)
    leaf(
      g,
      (i * TAU) / 6,
      0.041,
      0.006,
      0.027,
      0.104,
      i % 2 ? "#657d47" : "#71884b",
    );
}

function daisy(g, color = "#fcf5d9") {
  const m = material(color, "flower");
  for (let i = 0; i < 14; i++)
    petal(g, m, (i * TAU) / 14, 0.022, 0.014, 0.023, 0.095, 0.37, 1);
  oval(g, material("#e4b541", "matte"), 0, 0.034, 0, 0.045, 0.025, 0.045);
}

function rosette(g, color) {
  const m = material(color),
    cent = (t) => {
      const angle = TAU * (1.7 * t + 0.13),
        r = 0.077 * (1 - t) ** 0.82;
      return v(
        Math.cos(angle) * r + 0.018 * t * t,
        0.041 + 0.105 * t + 0.04 * t * t * t,
        Math.sin(angle) * r,
      );
    };
  const p = [],
    uv = [],
    idx = [],
    rows = 78,
    cols = 24;
  for (let j = 0; j <= rows; j++) {
    const t = j / rows,
      c = cent(t),
      tangent = cent(Math.min(1, t + 0.001))
        .sub(cent(Math.max(0, t - 0.001)))
        .normalize();
    const ang = TAU * (1.7 * t + 0.13),
      radial = v(Math.cos(ang), 0, Math.sin(ang));
    radial.addScaledVector(tangent, -tangent.dot(radial)).normalize();
    const b = tangent.clone().cross(radial).normalize();
    const section =
      0.057 *
      (0.24 + 0.76 * (1 - t) ** 0.65) *
      Math.min(1, 0.55 + t * 20) *
      Math.min(1, (1 - t) * 16);
    for (let i = 0; i <= cols; i++) {
      const a = (i / cols) * TAU,
        rr = section * (1 + 0.17 * Math.cos(8 * a - 0.5 * t));
      const point = c
        .clone()
        .addScaledVector(radial, rr * Math.cos(a))
        .addScaledVector(b, rr * Math.sin(a));
      p.push(point.x, Math.max(0.002, point.y), point.z);
      uv.push(i / cols, t);
      if (i < cols && j < rows) {
        const k = j * (cols + 1) + i,
          n = k + cols + 1;
        idx.push(k, k + 1, n, k + 1, n + 1, n);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  mesh(g, geo, m);
  const core = profileGeometry(
    (a, t) => {
      const r = 0.097 * (1 - t) ** 0.69;
      return [r * Math.cos(a), 0.153 * t, r * Math.sin(a)];
    },
    30,
    15,
  );
  mesh(g, core, m);
  oval(g, m, 0, 0.022, 0, 0.096, 0.026, 0.099);
}

function shell(g, color) {
  const m = material(color);
  const geo = profileGeometry(
    (a, t) => {
      const bulb = Math.pow(Math.sin(Math.PI * t), 0.59) * (1.44 - 0.95 * t);
      const pleat =
        1 + 0.13 * Math.cos(11 * a - 0.43 * t) + 0.025 * Math.cos(22 * a);
      const r = 0.098 * bulb * pleat;
      return [
        r * Math.cos(a),
        Math.max(0.002, 0.052 * bulb - 0.084 * bulb * pleat * Math.sin(a)),
        0.257 * (t - 0.43) + 0.01 * Math.cos(a) * bulb,
      ];
    },
    56,
    24,
  );
  mesh(g, geo, m);
}

function piped(g, type, color) {
  if (type === "pipe-shell") {
    shell(g, color);
    return;
  }
  if (type === "pipe-star") {
    rosette(g, color);
    return;
  }
  if (type === "pipe-rose") {
    rose(g, color);
    return;
  }
  if (type === "pipe-leaf") {
    for (const d of [-1, 1])
      petal(
        g,
        material(color, "leaf"),
        0.25 + d * 0.32,
        0,
        0.003,
        0.035,
        0.153,
        0.6,
        1,
      );
    return;
  }
  const kind = type.slice(5);
  const cfg = {
    round: [0.082, 0.128, 0, 0],
    star: [0.108, 0.18, 8, 0.16],
    shell: [0.098, 0.133, 10, 0.13],
    wave: [0.102, 0.117, 9, 0.18],
    ruffle: [0.115, 0.16, 12, 0.21],
  }[kind] ?? [0.1, 0.16, 9, 0.16];
  const [radius, height, ribs, amp] = cfg;
  const geo = profileGeometry(
    (a, t) => {
      const twist =
        (kind === "star" ? 0.9 : kind === "ruffle" ? 1.35 : 0.38) * t;
      let body =
        Math.pow(1 - t, 0.66) *
        (0.87 + 0.22 * Math.sin(Math.min(1, t * 4) * Math.PI * 0.7));
      body *= 0.69 + 0.31 * Math.min(1, t * 12);
      const ridge =
        1 +
        amp *
          (Math.cos(ribs * (a - twist)) +
            0.22 * Math.cos(2 * ribs * (a - twist)));
      const r = radius * body * ridge,
        lean = (kind === "shell" ? 0.091 : 0.017) * Math.pow(t, 1.8);
      return [
        r * Math.cos(a) * (kind === "shell" ? 1.31 : 1) + lean,
        height * t +
          0.002 +
          (kind === "wave"
            ? 0.013 * Math.sin(3 * a) * Math.sin(Math.PI * t)
            : 0),
        r * Math.sin(a) * (kind === "ruffle" ? 0.87 : 1),
      ];
    },
    kind === "round" ? 24 : 64,
    18,
  );
  mesh(g, geo, material(color));
}

function shapeStamp(g, type, color) {
  const sh = new T.Shape();
  if (type === "heart") {
    sh.moveTo(0, 0);
    sh.bezierCurveTo(-0.018, 0.021, -0.13, 0.067, -0.119, 0.139);
    sh.bezierCurveTo(-0.113, 0.196, -0.043, 0.212, 0, 0.151);
    sh.bezierCurveTo(0.05, 0.214, 0.115, 0.194, 0.118, 0.139);
    sh.bezierCurveTo(0.124, 0.072, 0.033, 0.031, 0, 0);
  } else if (type === "star" || type === "crown") {
    if (type === "star") {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 0.055 : 0.126,
          x = r * Math.cos(a),
          y = r * Math.sin(a) + 0.13;
        i ? sh.lineTo(x, y) : sh.moveTo(x, y);
      }
    } else {
      sh.moveTo(-0.15, 0);
      sh.lineTo(-0.18, 0.19);
      sh.lineTo(-0.078, 0.105);
      sh.lineTo(0, 0.242);
      sh.lineTo(0.074, 0.104);
      sh.lineTo(0.174, 0.185);
      sh.lineTo(0.147, 0);
    }
    sh.closePath();
  } else if (type === "moon") {
    sh.absarc(0, 0.133, 0.12, 0.89, 5.43, false);
    sh.bezierCurveTo(-0.054, 0.077, -0.054, 0.18, 0.076, 0.225);
  } else if (type === "butterfly") {
    for (const d of [-1, 1]) {
      const wing = new T.Shape();
      wing.moveTo(0, 0.055);
      wing.bezierCurveTo(d * 0.07, 0.23, d * 0.16, 0.23, d * 0.138, 0.159);
      wing.bezierCurveTo(d * 0.13, 0.114, d * 0.07, 0.079, d * 0.057, 0.077);
      wing.bezierCurveTo(d * 0.135, 0.077, d * 0.098, -0.021, 0, 0.047);
      const m = extruded(g, wing, 0.006, material(color, "flower"), 0.002);
      m.rotation.y = d * 0.33;
    }
    return;
  }
  const obj = extruded(
    g,
    sh,
    0.023,
    material(
      color,
      type === "crown" || type === "star" || type === "moon"
        ? "gold"
        : "chocolate",
    ),
    0.005,
  );
  obj.rotation.x = -0.11;
}

function miscStamp(g, type, color) {
  if (type === "blueberry") {
    const m = material("#454867", "fruit");
    oval(g, m, 0, 0.076, 0, 0.088, 0.079, 0.085, 24);
    const ring = mesh(
      g,
      new T.TorusGeometry(0.02, 0.005, 6, 15),
      material("#343347", "matte"),
      0,
      0.151,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++)
      petal(g, m, (i * TAU) / 5, 0.01, 0.148, 0.008, 0.018, 0.43, 0.52);
  } else if (type === "macaron") {
    const mat = material(color, "matte");
    oval(g, mat, 0, 0.049, 0, 0.145, 0.047, 0.145, 28);
    oval(g, material("#fff0d3"), 0, 0.091, 0, 0.134, 0.033, 0.134, 28);
    oval(g, mat, 0, 0.135, 0, 0.146, 0.048, 0.146, 28);
    const crumbs = material(new T.Color(color).multiplyScalar(0.9), "sponge");
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * TAU;
      oval(
        g,
        crumbs,
        0.136 * Math.cos(a),
        0.117 + 0.002 * Math.sin(i),
        0.136 * Math.sin(a),
        0.011,
        0.008,
        0.011,
        8,
      );
    }
  } else if (type === "candle") {
    mesh(
      g,
      new T.CylinderGeometry(0.029, 0.03, 0.41, 20),
      material(color),
      0,
      0.206,
      0,
    );
    const helix = [];
    for (let i = 0; i < 65; i++) {
      const a = i * 0.5;
      helix.push(
        v(0.028 * Math.cos(a), 0.014 + (0.386 * i) / 64, 0.028 * Math.sin(a)),
      );
    }
    curveTube(g, material("#fff5d4"), helix, 0.0035, 64);
    curveTube(
      g,
      material("#6c5340", "matte"),
      [v(0, 0.409, 0), v(-0.002, 0.424, 0), v(0.002, 0.433, 0)],
      0.003,
      6,
    );
    const flame = oval(
      g,
      material("#ffd286", "pearl"),
      0.003,
      0.457,
      0,
      0.018,
      0.041,
      0.017,
    );
    flame.rotation.z = -0.15;
  } else if (type === "lily") {
    const lm = material("#667752", "leaf");
    curveTube(
      g,
      lm,
      [v(0, 0, 0), v(0.018, 0.14, 0), v(-0.044, 0.267, 0), v(-0.081, 0.25, 0)],
      0.005,
    );
    for (let i = 0; i < 3; i++) {
      const y = 0.1 + i * 0.061,
        x = -0.037 - 0.013 * i;
      curveTube(
        g,
        lm,
        [
          v(0.006, y + 0.012, 0),
          v(x, y + 0.048, 0),
          v(x - 0.016, y + 0.015, 0),
        ],
        0.0035,
      );
      const b = mesh(
        g,
        profileGeometry(
          (a, t) => {
            const r = 0.034 * (1 - 0.64 * t);
            return [
              r * Math.cos(a),
              t * 0.04 + 0.01 * Math.cos(6 * a) * (1 - t),
              r * Math.sin(a),
            ];
          },
          24,
          12,
        ),
        material("#fff9e7", "flower"),
        x - 0.016,
        y - 0.014,
        0,
      );
      b.rotation.z = -0.18;
    }
    leaf(g, 1, 0, 0.01, 0.027, 0.133);
  } else if (type === "chocolate") {
    const m = mesh(
      g,
      new T.BoxGeometry(0.176, 0.224, 0.041),
      material("#58352e", "chocolate"),
      0,
      0.105,
      0,
    );
    m.rotation.z = 0.19;
    m.rotation.x = -0.24;
    for (let i = 0; i < 4; i++)
      curveTube(
        g,
        material("#ac8b71", "chocolate"),
        [
          v(-0.068, 0.035 + i * 0.038, 0.029),
          v(-0.002, 0.069 + i * 0.038, 0.034),
          v(0.061, 0.059 + i * 0.038, 0.027),
        ],
        0.0024,
        8,
      );
  } else if (type === "lace") {
    const m = material(color);
    for (let row = 0; row < 3; row++) {
      const pts = [],
        sag = 0.046 + row * 0.021;
      for (let j = 0; j <= 32; j++) {
        const t = j / 32,
          x = (t - 0.5) * 0.326,
          q = 1 - (2 * t - 1) ** 2;
        pts.push(
          v(
            x,
            -sag * q - 0.002 * row,
            -0.02 * (2 * t - 1) ** 2 + 0.006 + row * 0.002,
          ),
        );
      }
      curveTube(g, m, pts, row === 2 ? 0.006 : 0.0044, 32);
    }
    for (let i = 0; i <= 18; i++) {
      const t = i / 18,
        x = (t - 0.5) * 0.326,
        q = 1 - (2 * t - 1) ** 2,
        r = 0.004 + q * 0.0025;
      oval(
        g,
        m,
        x,
        -0.091 * q,
        -0.02 * (2 * t - 1) ** 2 + 0.01,
        r,
        r * 1.22,
        r * 0.65,
        8,
      );
    }
    for (const sign of [-1, 1])
      oval(g, m, sign * 0.16, 0.002, -0.014, 0.014, 0.013, 0.009);
  } else if (["sugar", "coconut", "gold"].includes(type)) {
    const rng = random(324);
    const m = material(
      type === "gold" ? "#d9a548" : type === "coconut" ? "#f9ecd4" : "#fffdf1",
      type === "gold" ? "gold" : "matte",
    );
    const n = type === "gold" ? 15 : 36;
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU,
        r = Math.sqrt(rng()) * 0.2,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      let flake;
      if (type === "gold") {
        flake = mesh(
          g,
          new T.IcosahedronGeometry(0.022 * rng() + 0.009, 0),
          m,
          x,
          0.006,
          z,
        );
        flake.scale.y = 0.14;
      } else {
        flake = oval(
          g,
          m,
          x,
          0.006,
          z,
          type === "sugar" ? 0.005 : 0.017,
          0.004,
          0.005,
          8,
        );
      }
      flake.rotation.y = rng() * TAU;
    }
  } else if (type === "truffle") {
    oval(
      g,
      material("#5d3e35", "chocolate"),
      0,
      0.094,
      0,
      0.109,
      0.103,
      0.109,
      26,
    );
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.04,
        r = Math.sqrt(0.107 ** 2 - x * x),
        pts = [];
      for (let j = 0; j <= 14; j++) {
        const a = (j * Math.PI) / 14;
        pts.push(
          v(
            x + 0.006 * Math.sin(a * 3),
            0.094 + r * Math.sin(a),
            r * Math.cos(a),
          ),
        );
      }
      curveTube(g, material("#a68066", "chocolate"), pts, 0.0035);
    }
  } else if (type === "marshmallow") {
    const geo = profileGeometry(
      (a, t) => {
        const r =
          0.098 *
          (0.9 + 0.1 * Math.sin(Math.PI * t)) *
          (1 + 0.045 * Math.cos(4 * a - t * 4));
        return [r * Math.cos(a), t * 0.17, r * Math.sin(a)];
      },
      32,
      16,
    );
    mesh(g, geo, material(color));
    oval(g, material(color), 0, 0.17, 0, 0.089, 0.008, 0.089);
  } else {
    oval(g, material(color, "pearl"), 0, 0.036, 0, 0.039, 0.037, 0.039, 18);
  }
}

// A stamp is assembled once, then batched by material. Hundreds of strawberry
// seeds or piping ridges share the same compact geometry for every repeat.
function bake(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map(),
    normalMatrix = new T.Matrix3(),
    p = new T.Vector3(),
    n = new T.Vector3();
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    const geo = obj.geometry,
      mat = obj.material,
      b = buckets.get(mat) ?? { p: [], n: [], uv: [], idx: [] };
    buckets.set(mat, b);
    const gpos = geo.attributes.position,
      gn = geo.attributes.normal,
      gu = geo.attributes.uv,
      offset = b.p.length / 3;
    normalMatrix.getNormalMatrix(obj.matrixWorld);
    for (let i = 0; i < gpos.count; i++) {
      p.fromBufferAttribute(gpos, i).applyMatrix4(obj.matrixWorld);
      b.p.push(p.x, p.y, p.z);
      if (gn) {
        n.fromBufferAttribute(gn, i).applyMatrix3(normalMatrix).normalize();
        b.n.push(n.x, n.y, n.z);
      } else b.n.push(0, 1, 0);
      b.uv.push(gu ? gu.getX(i) : 0, gu ? gu.getY(i) : 0);
    }
    const index = geo.index;
    for (let i = 0; i < (index ? index.count : gpos.count); i++)
      b.idx.push(offset + (index ? index.getX(i) : i));
    geo.dispose();
  });
  return [...buckets].map(([m, b]) => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(b.n, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
    g.setIndex(b.idx);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { geometry: g, material: m };
  });
}

export const defaultTint = {
  bow: "#b57182",
  heart: "#c77884",
  butterfly: "#d6a1aa",
  star: "#ddb56b",
  moon: "#d8b15c",
  crown: "#d6b064",
  rose: "#dca4a9",
  daisy: "#fff3d9",
  macaron: "#c1c59c",
  marshmallow: "#f1c9ca",
  candle: "#d899a8",
  number: "#cf9a58",
  pearl: "#fff1d9",
  "pipe-leaf": "#94a47f",
  "pipe-kiss": "#e6a9bd",
  "pipe-hem": "#e6a9bd",
  "pipe-scallop": "#fff1d6",
  "pipe-sprig": "#347b55",
  "pipe-field-daisy": "#fff7df",
  "satin-bow": "#f2c8ca",
};
export function stamp(type, custom) {
  const isNumber = type === "number" || /^number-[0-9]$/.test(type);
  const color = custom || defaultTint[isNumber ? "number" : type] || "#fff1db";
  const key = type + color;
  if (stampCache.has(key)) return stampCache.get(key);
  const group = new T.Group();
  if (coverTypes.has(type))
    coverStamp(group, type, color, {
      mesh,
      oval,
      curveTube,
      profileGeometry,
      material,
      shell,
      strawberry,
    });
  else if (type.startsWith("pipe-")) piped(group, type, color);
  else if (isNumber)
    buildNumberStamp(
      group,
      type === "number" ? 1 : Number(type.slice(7)),
      color,
      material,
    );
  else if (isFruitStamp(type))
    buildFruitStamp(group, type, {
      material,
      oval,
      strawberry,
      cherry,
      blueberry: (berry) => miscStamp(berry, "blueberry"),
    });
  else if (type === "rose") rose(group, color);
  else if (type === "daisy") daisy(group, color);
  else if (type === "bow") ribbon(group, color);
  else if (["heart", "star", "crown", "moon", "butterfly"].includes(type))
    shapeStamp(group, type, color);
  else miscStamp(group, type, color);
  const result = bake(group);
  stampCache.set(key, result);
  return result;
}
