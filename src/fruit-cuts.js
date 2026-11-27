import * as T from "three";

import { isFruitStamp } from "./fruit-catalog.js";
export { fruitCuts, isFruitStamp } from "./fruit-catalog.js";
const tau = 2 * Math.PI;
const fruitSpec = {
  strawberry: {
    w: 0.143,
    h: 0.176,
    d: 0.121,
    skin: "#a82535",
    flesh: "#d9504d",
  },
  blueberry: {
    w: 0.088,
    h: 0.078,
    d: 0.084,
    skin: "#424363",
    flesh: "#a7a58f",
  },
  cherry: { w: 0.129, h: 0.115, d: 0.115, skin: "#8c1a34", flesh: "#9c2841" },
  fig: { w: 0.128, h: 0.158, d: 0.113, skin: "#805574", flesh: "#cd7581" },
  lemon: { w: 0.155, h: 0.151, d: 0.132, skin: "#e0b73e", flesh: "#ecd069" },
  mango: { w: 0.153, h: 0.199, d: 0.123, skin: "#9a9d4f", flesh: "#f2a73a" },
};
function seeded(seed) {
  return () =>
    (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
}
const faces = new Map();
const skinMaterials = new Map();

// Canonical disk UVs are deformed with the fruit contour. Each cap shows the same
// anatomy on both sides, including pith, vessels and achene-filled fig flesh.
function fleshMaterial(fruit) {
  if (faces.has(fruit)) return faces.get(fruit);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 320;
  const c = canvas.getContext("2d");
  const r = 155,
    center = 160,
    rand = seeded(217 + fruit.charCodeAt(0) * 31);
  c.translate(center, center);
  c.scale(r, r);
  function ellipse(x, y, rx, ry, angle, fill) {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x, y, rx, ry, angle, 0, tau);
    c.fill();
  }
  function outline(color, width) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.arc(0, 0, 1 - width / 2, 0, tau);
    c.stroke();
  }
  function radial(stops) {
    const g = c.createRadialGradient(-0.09, -0.08, 0.02, 0, 0, 1.025);
    for (const [p, col] of stops) g.addColorStop(p, col);
    c.fillStyle = g;
    c.fillRect(-1.04, -1.04, 2.08, 2.08);
  }
  function pulp(n, colors, w, h) {
    for (let i = 0; i < n; i++) {
      const a = rand() * tau,
        s = Math.sqrt(rand()) * 0.94;
      ellipse(
        Math.cos(a) * s,
        Math.sin(a) * s,
        w * (0.5 + rand()),
        h * (0.5 + rand()),
        a,
        colors[i % colors.length],
      );
    }
  }
  function fibres(count, inner, outer, tint, width, curve = 0.1) {
    c.strokeStyle = tint;
    c.lineWidth = width;
    for (let i = 0; i < count; i++) {
      const a = (tau * (i + rand() * 0.7)) / count,
        d1 = inner + rand() * 0.11,
        d2 = outer - rand() * 0.12;
      c.beginPath();
      c.moveTo(Math.cos(a) * d1, Math.sin(a) * d1);
      c.quadraticCurveTo(
        Math.cos(a + curve) * 0.6,
        Math.sin(a + curve) * 0.6,
        Math.cos(a) * d2,
        Math.sin(a) * d2,
      );
      c.stroke();
    }
  }
  if (fruit === "strawberry") {
    radial([
      [0, "#f3a192"],
      [0.44, "#ed7971"],
      [0.79, "#d95454"],
      [0.94, "#bf3844"],
      [1, "#b83240"],
    ]);
    fibres(73, 0.2, 0.91, "rgba(255,187,157,.42)", 0.009, 0.055);
    pulp(310, ["#e18072", "#f49886", "#dd7469"], 0.006, 0.011);
    const core = c.createLinearGradient(0, -0.86, 0, 0.65);
    core.addColorStop(0, "#eaa498");
    core.addColorStop(0.52, "#eea396");
    core.addColorStop(1, "#d97770");
    c.fillStyle = core;
    c.beginPath();
    c.moveTo(-0.13, -0.9);
    c.bezierCurveTo(-0.19, -0.62, -0.36, -0.36, -0.24, -0.1);
    c.bezierCurveTo(-0.12, 0.22, -0.08, 0.43, 0.01, 0.68);
    c.bezierCurveTo(0.1, 0.4, 0.28, -0.03, 0.29, -0.25);
    c.bezierCurveTo(0.29, -0.5, 0.14, -0.65, 0.13, -0.91);
    c.closePath();
    c.fill();
    fibres(32, 0.41, 0.95, "rgba(255,210,169,.40)", 0.008, 0.03);
    outline("#b43540", 0.037);
  } else if (fruit === "fig") {
    radial([
      [0, "#a64a59"],
      [0.31, "#c36b78"],
      [0.67, "#d8888b"],
      [0.86, "#e3a7a0"],
      [0.91, "#f4dbb1"],
      [0.968, "#e5c89e"],
      [0.98, "#7e536a"],
      [1, "#734a60"],
    ]);
    fibres(120, 0.18, 0.9, "rgba(126,52,61,.42)", 0.01, 0.26);
    for (let i = 0; i < 840; i++) {
      const a = rand() * tau,
        rr = 0.13 + Math.sqrt(rand()) * 0.72;
      ellipse(
        rr * Math.cos(a),
        rr * Math.sin(a),
        0.005 + rand() * 0.008,
        0.003 + rand() * 0.004,
        a + 0.6,
        ["#f0d4a9", "#e9b795", "#cf8e7c"][i % 3],
      );
    }
    ellipse(-0.01, 0.025, 0.094, 0.14, 0.22, "#ab5f6a");
    fibres(41, 0.15, 0.84, "rgba(254,200,167,.20)", 0.005, 0.22);
  } else if (fruit === "lemon") {
    radial([
      [0, "#fff0c4"],
      [0.79, "#fce5a0"],
      [0.9, "#fbe6a5"],
      [0.952, "#f6e4b7"],
      [0.968, "#ead285"],
      [0.99, "#d9b241"],
      [1, "#d3aa32"],
    ]);
    for (let i = 0; i < 10; i++) {
      const a = ((i - 0.16) * tau) / 10 + 0.016,
        b = ((i + 0.84) * tau) / 10 - 0.016;
      c.fillStyle = i % 2 ? "#f2cd62" : "#efd177";
      c.beginPath();
      c.moveTo(0.08 * Math.cos(a), 0.08 * Math.sin(a));
      c.arc(0, 0, 0.867, a, b);
      c.lineTo(0.08 * Math.cos(b), 0.08 * Math.sin(b));
      c.closePath();
      c.fill();
      c.save();
      c.clip();
      for (let j = 0; j < 75; j++) {
        const ang = a + rand() * (b - a),
          rr = 0.1 + 0.78 * Math.sqrt(rand());
        ellipse(
          Math.cos(ang) * rr,
          Math.sin(ang) * rr,
          0.015 + rand() * 0.022,
          0.003 + rand() * 0.004,
          ang,
          j % 2 ? "rgba(255,240,178,.65)" : "rgba(229,182,68,.50)",
        );
      }
      c.restore();
    }
    ellipse(0.36, -0.22, 0.063, 0.028, -0.63, "#f7e6bb");
    ellipse(-0.43, 0.23, 0.047, 0.026, -0.35, "#f5e7be");
  } else if (fruit === "blueberry") {
    radial([
      [0, "#c8c5ab"],
      [0.49, "#c8c8a6"],
      [0.76, "#b5b69c"],
      [0.85, "#ad9caa"],
      [0.939, "#807994"],
      [0.972, "#514863"],
      [1, "#454661"],
    ]);
    pulp(430, ["rgba(180,170,139,.38)", "rgba(218,216,176,.48)"], 0.011, 0.006);
    for (let i = 0; i < 5; i++) {
      const a = (i * tau) / 5 + 0.25;
      ellipse(
        0.14 * Math.cos(a),
        0.14 * Math.sin(a),
        0.087,
        0.042,
        a,
        "#aa987a",
      );
      ellipse(
        0.32 * Math.cos(a),
        0.32 * Math.sin(a),
        0.039,
        0.017,
        a,
        "#9f9074",
      );
    }
    fibres(26, 0.32, 0.78, "rgba(252,241,190,.28)", 0.011, 0.18);
  } else if (fruit === "cherry") {
    radial([
      [0, "#692036"],
      [0.22, "#8e293f"],
      [0.4, "#ae4c59"],
      [0.76, "#bb535e"],
      [0.94, "#9b3149"],
      [1, "#6e233c"],
    ]);
    fibres(72, 0.23, 0.9, "rgba(244,170,163,.35)", 0.009, 0.15);
    pulp(370, ["rgba(151,46,70,.28)", "rgba(243,151,148,.24)"], 0.01, 0.006);
    ellipse(0, -0.015, 0.256, 0.33, -0.1, "#873d47");
    ellipse(0, -0.045, 0.201, 0.26, -0.08, "#602838");
    c.beginPath();
    c.strokeStyle = "#b66367";
    c.lineWidth = 0.02;
    c.ellipse(0.01, -0.02, 0.22, 0.29, -0.11, 0.1, 2.8);
    c.stroke();
  } else {
    radial([
      [0, "#ffc262"],
      [0.42, "#f9b84e"],
      [0.85, "#eca545"],
      [0.94, "#f2b44f"],
      [1, "#db9940"],
    ]);
    for (let i = 0; i < 350; i++) {
      const x = rand() * 2 - 1,
        y = rand() * 2 - 1;
      ellipse(
        x,
        y,
        0.002 + rand() * 0.004,
        0.023 + rand() * 0.04,
        -0.13,
        "rgba(255,214,113,.40)",
      );
    }
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const m = new T.MeshStandardMaterial({
    map: tex,
    roughness: fruit === "fig" ? 0.69 : 0.43,
    bumpMap: tex,
    bumpScale: 0.0012,
  });
  faces.set(fruit, m);
  return m;
}
function skinMaterial(fruit) {
  if (skinMaterials.has(fruit)) return skinMaterials.get(fruit);
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 256;
  const c = canvas.getContext("2d"),
    rand = seeded(528);
  c.fillStyle = fruitSpec[fruit].skin;
  c.fillRect(0, 0, 384, 256);
  if (fruit === "mango" || fruit === "fig") {
    const g = c.createLinearGradient(0, 256, 0, 0);
    (fruit === "mango"
      ? ["#a2a75a", "#bfab59", "#c67a52", "#aa6161"]
      : ["#796079", "#89758a", "#9a8b8b", "#acaa84"]
    ).forEach((x, i) => g.addColorStop(i / 3, x));
    c.fillStyle = g;
    c.fillRect(0, 0, 384, 256);
  }
  for (let i = 0; i < 2100; i++) {
    const x = rand() * 384,
      y = rand() * 256;
    c.fillStyle = i % 2 ? "rgba(255,229,195,.18)" : "rgba(60,43,52,.10)";
    c.beginPath();
    c.ellipse(x, y, 0.3 + rand() * 0.7, 0.4 + rand() * 1.2, 0, 0, tau);
    c.fill();
  }
  if (fruit === "strawberry")
    for (let row = 0; row < 9; row++)
      for (let i = 0; i < 18; i++) {
        const x = ((i + (row % 2) * 0.5) * 384) / 18,
          y = ((row + 0.5) * 256) / 9;
        c.fillStyle = "#8f303b";
        c.beginPath();
        c.ellipse(x, y, 1.7, 3.5, -0.28, 0, tau);
        c.fill();
        c.fillStyle = "#dcac74";
        c.beginPath();
        c.ellipse(x - 0.3, y - 0.7, 0.85, 2.1, -0.28, 0, tau);
        c.fill();
      }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = T.RepeatWrapping;
  const m = new T.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.0015,
    roughness: fruit === "fig" ? 0.7 : fruit === "blueberry" ? 0.67 : 0.39,
  });
  skinMaterials.set(fruit, m);
  return m;
}
function contour(fruit, a) {
  const p = fruitSpec[fruit],
    s = Math.sin(a),
    c = Math.cos(a);
  if (fruit === "strawberry") return [p.w * c * (1 + 0.37 * s), p.h * s];
  if (fruit === "fig")
    return [p.w * c * (1 - 0.35 * s), p.h * (s + 0.1 * Math.max(0, s) ** 7)];
  if (fruit === "mango") return [p.w * c * (1 - 0.16 * s) + 0.034 * s, p.h * s];
  if (fruit === "cherry")
    return [p.w * c * (1 + 0.06 * s), p.h * (s - 0.13 * Math.max(0, s) ** 8)];
  return [p.w * c, p.h * s];
}
function buffer(points, uvs, indices) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function attach(g, geo, m) {
  const o = new T.Mesh(geo, m);
  g.add(o);
  return o;
}
function cap(group, fruit, start, end, z, back) {
  const pp = [0, 0, z],
    uv = [0.5, 0.5],
    ix = [],
    n = Math.max(12, Math.ceil(((end - start) / tau) * 60));
  for (let i = 0; i <= n; i++) {
    const a = start + ((end - start) * i) / n,
      [x, y] = contour(fruit, a);
    pp.push(x, y, z);
    uv.push(0.5 + 0.482 * Math.cos(a), 0.5 + 0.482 * Math.sin(a));
    if (i) ix.push(0, back ? i + 1 : i, back ? i : i + 1);
  }
  attach(group, buffer(pp, uv, ix), fleshMaterial(fruit));
}
// t moves from the curved back of the fruit to the knife plane, forming a
// solid half with one cut face. A slice has a second cap and narrow peel wall.
function cut(group, fruit, depth, { half = false, start = 0, end = tau } = {}) {
  const n = Math.max(12, Math.ceil(((end - start) / tau) * 60)),
    rows = half ? 14 : 4;
  const pp = [],
    uv = [],
    ix = [];
  const profile = (t) =>
    half
      ? [
          Math.max(0.0001, Math.sin((t * Math.PI) / 2)),
          -depth * Math.cos((t * Math.PI) / 2),
        ]
      : [1 + 0.014 * Math.sin(Math.PI * t), -depth * (1 - t)];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= n; i++) {
      const t = j / rows,
        a = start + ((end - start) * i) / n,
        [x, y] = contour(fruit, a),
        [s, z] = profile(t);
      pp.push(x * s, y * s, z);
      uv.push(i / n, t);
      if (j < rows && i < n) {
        const a0 = j * (n + 1) + i,
          b = a0 + n + 1;
        ix.push(a0, a0 + 1, b, a0 + 1, b + 1, b);
      }
    }
  attach(group, buffer(pp, uv, ix), skinMaterial(fruit));
  cap(group, fruit, start, end, 0, false);
  if (!half) cap(group, fruit, start, end, -depth, true);
  if (end - start < tau - 0.01) {
    for (const [a, reverse] of [
      [start, true],
      [end, false],
    ]) {
      const ps = [],
        us = [],
        indices = [];
      const [x, y] = contour(fruit, a);
      for (let j = 0; j <= rows; j++) {
        const [s, z] = profile(j / rows);
        ps.push(0, 0, z, x * s, y * s, z);
        us.push(
          0.5,
          0.5,
          0.5 + 0.46 * s * Math.cos(a),
          0.5 + 0.46 * s * Math.sin(a),
        );
        if (j < rows) {
          const k = 2 * j;
          indices.push(
            ...(reverse
              ? [k, k + 2, k + 1, k + 1, k + 2, k + 3]
              : [k, k + 1, k + 2, k + 1, k + 3, k + 2]),
          );
        }
      }
      attach(group, buffer(ps, us, indices), fleshMaterial(fruit));
    }
  }
}
function whole(group, fruit) {
  const p = fruitSpec[fruit],
    pos = [],
    uv = [],
    idx = [],
    cols = 48,
    rows = 32;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const t = j / rows,
        s = -Math.cos(Math.PI * t),
        a = (i / cols) * tau;
      let r = Math.sin(Math.PI * t),
        y = p.h * (1 + s),
        bend = 0;
      if (fruit === "fig") {
        r *= 1 - 0.49 * s;
        y += 0.025 * Math.max(0, s) ** 10;
        bend = 0.018 * t * t;
      } else if (fruit === "lemon") {
        r *= 1 - 0.24 * Math.abs(s) ** 4;
        y = y * 1.24 + 0.025 * (s ** 9 + 1);
      } else {
        r *= 1 - 0.13 * s;
        bend = 0.04 * s - 0.018 * Math.max(0, -s) ** 5;
      }
      pos.push(p.w * r * Math.cos(a) + bend, y, p.d * r * Math.sin(a));
      uv.push(i / cols, t);
      if (i < cols && j < rows) {
        const k = j * (cols + 1) + i,
          b = k + cols + 1;
        idx.push(k, b, k + 1, k + 1, b, b + 1);
      }
    }
  attach(group, buffer(pos, uv, idx), skinMaterial(fruit));
  if (fruit === "fig" || fruit === "mango") {
    const stalk = attach(
      group,
      new T.CylinderGeometry(0.005, 0.012, 0.027, 9),
      skinMaterial(fruit),
    );
    stalk.position.set(
      fruit === "fig" ? 0.018 : 0.04,
      2 * p.h + (fruit === "fig" ? 0.026 : 0.005),
      0,
    );
    stalk.rotation.z = -0.19;
  }
}
function settle(group) {
  group.updateMatrixWorld(true);
  // Rotating the cuts also rotates their local bounds. Use the actual vertices
  // so the curved underside touches the cake instead of hovering over it.
  const bounds = new T.Box3().setFromObject(group, true);
  if (!bounds.isEmpty()) group.position.y -= bounds.min.y;
}
function child(g) {
  const o = new T.Group();
  g.add(o);
  return o;
}
function arrangeCuts(g, fruit, style) {
  const content = child(g),
    cutGroup = child(content);
  if (style === "fan") {
    const n = fruit === "mango" ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const q = child(cutGroup);
      cut(q, fruit, fruit === "mango" ? 0.025 : 0.029);
      q.scale.set(0.76, 0.81, 1);
      q.rotation.z = (i - (n - 1) / 2) * 0.18;
      q.position.set((i - (n - 1) / 2) * 0.069, i * 0.012, i * 0.021);
    }
    cutGroup.rotation.x = -0.92;
    cutGroup.rotation.y = -0.17;
  } else {
    const sector =
      style === "semi"
        ? [0, Math.PI]
        : style === "wedge"
          ? [-0.06, Math.PI * 0.42]
          : style === "quarter"
            ? [-Math.PI / 2, Math.PI / 2]
            : [0, tau];
    const half = ["half", "quarter", "wedge"].includes(style),
      depth = half ? fruitSpec[fruit].d : 0.032;
    cut(cutGroup, fruit, depth, { half, start: sector[0], end: sector[1] });
    cutGroup.rotation.x =
      style === "wheel"
        ? -0.82
        : style === "slice"
          ? -1.13
          : style === "semi"
            ? -0.2
            : -0.43;
    cutGroup.rotation.z =
      style === "quarter"
        ? 0.22
        : style === "wedge"
          ? -0.12
          : style === "slice"
            ? 0.26
            : -0.09;
    cutGroup.rotation.y = half ? -0.77 : style === "slice" ? -0.24 : 0.1;
  }
  settle(content);
}
function roundedFruitCube(g, half, mat) {
  const sh = new T.Shape();
  sh.moveTo(-half, -half);
  sh.lineTo(half, -half);
  sh.lineTo(half, half);
  sh.lineTo(-half, half);
  sh.closePath();
  const b = half * 0.13,
    geo = new T.ExtrudeGeometry(sh, {
      depth: half * 1.56,
      bevelEnabled: true,
      bevelSize: b,
      bevelThickness: b,
      bevelSegments: 3,
      curveSegments: 3,
    });
  geo.translate(0, 0, -half * 0.78);
  return attach(g, geo, mat);
}
function diced(g, fruit, helpers) {
  const colours =
    fruit === "mango"
      ? ["#fac058", "#f0aa44", "#f7b84f"]
      : ["#db6866", "#d94851", "#e78377"];
  const rng = seeded(960);
  for (const [i, [x, z]] of [
    [-0.075, -0.044],
    [0.031, -0.079],
    [0.096, 0.008],
    [-0.025, 0.059],
    [-0.114, 0.059],
    [0.037, 0.024],
  ].entries()) {
    const half = 0.037 + rng() * 0.015,
      q = roundedFruitCube(g, half, helpers.material(colours[i % 3], "fruit"));
    q.rotation.set(rng() * 0.2, rng() * 1.45, rng() * 0.12);
    q.position.set(x, half + (i === 5 ? 0.071 : 0), z);
    if (fruit === "strawberry" && i % 2 === 0) {
      const strip = attach(
        g,
        new T.BoxGeometry(half * 1.82, half * 1.71, 0.0035),
        skinMaterial(fruit),
      );
      strip.rotation.copy(q.rotation);
      strip.position.copy(q.position);
      strip.translateZ(half * 0.92);
    }
  }
}
function crushed(g, fruit, h) {
  const p = fruitSpec[fruit],
    rng = seeded(53152),
    juice = h.material(fruit === "blueberry" ? "#765270" : "#933045", "fruit");
  for (let i = 0; i < 6; i++) {
    const a = rng() * tau,
      r = 0.08 * Math.sqrt(rng());
    h.oval(
      g,
      juice,
      Math.cos(a) * r,
      0.014,
      Math.sin(a) * r,
      0.06 + rng() * 0.04,
      0.013,
      0.035 + rng() * 0.03,
      12,
    );
  }
  for (let i = 0; i < 11; i++) {
    const a = rng() * tau,
      r = 0.135 * Math.sqrt(rng()),
      s = 0.025 + rng() * 0.026;
    const m = i % 3 ? skinMaterial(fruit) : h.material(p.flesh, "fruit");
    const chip = attach(g, new T.DodecahedronGeometry(s, 1), m);
    const pos = chip.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k),
        y = pos.getY(k),
        z = pos.getZ(k);
      const uneven =
        1 + 0.13 * Math.sin(82 * x + 31 * z) * Math.cos(49 * y + 72 * z);
      pos.setXYZ(k, x * uneven, y * uneven, z * uneven);
    }
    chip.geometry.computeVertexNormals();
    chip.scale.set(1.04, 0.46 + rng() * 0.29, 0.75);
    chip.rotation.set(rng(), rng(), rng());
    chip.position.set(Math.cos(a) * r, s * 0.6, Math.sin(a) * r);
  }
}
function mangoCheek(g, h) {
  h.oval(g, skinMaterial("mango"), 0, 0.051, 0, 0.188, 0.055, 0.126, 38);
  h.oval(
    g,
    h.material("#eda947", "fruit"),
    0,
    0.062,
    0,
    0.182,
    0.058,
    0.121,
    36,
  );
  for (let i = -2; i <= 2; i++)
    for (let j = -1; j <= 1; j++) {
      const x = i * 0.064,
        z = j * 0.069,
        q = (x / 0.187) ** 2 + (z / 0.13) ** 2;
      if (q > 0.99) continue;
      const m = roundedFruitCube(
        g,
        0.029,
        h.material((i + j) % 2 ? "#f7b346" : "#f9bc52", "fruit"),
      );
      m.scale.set(1.02, 1.13, 1.2);
      m.position.set(x, 0.119 - 0.037 * q, z);
      m.rotation.z = -i * 0.17;
      m.rotation.x = j * 0.19;
    }
}
export function buildFruitStamp(group, id, h) {
  if (!isFruitStamp(id)) return false;
  const [fruit, variant] = id.split("-"),
    style =
      variant ||
      (fruit === "fig" ? "half" : fruit === "lemon" ? "semi" : "whole");
  if (style === "whole") {
    if (fruit === "strawberry") h.strawberry(group);
    else if (fruit === "cherry") h.cherry(group);
    else if (fruit === "blueberry") h.blueberry(group);
    else {
      const q = child(group),
        body = child(q);
      whole(body, fruit);
      body.rotation.z =
        fruit === "fig" ? 0.16 : fruit === "mango" ? -0.84 : 1.14;
      settle(q);
    }
  } else if (style === "dice") diced(group, fruit, h);
  else if (style === "cheek") mangoCheek(group, h);
  else if (style === "crush") crushed(group, fruit, h);
  else if (style === "cluster") {
    [
      [-0.069, -0.055, 0.91],
      [0.063, -0.053, 0.92],
      [0.004, 0.055, 1.02],
    ].forEach(([x, z, s], i) => {
      const q = child(group);
      h.blueberry(q);
      q.position.set(x, 0, z);
      q.rotation.y = i * 2;
      q.scale.setScalar(s);
    });
  } else if (style === "pair") {
    for (const sign of [-1, 1]) {
      const q = child(group);
      h.cherry(q);
      q.position.set(sign * 0.1, 0, sign * 0.036);
      q.scale.setScalar(0.88);
      q.rotation.y = sign === 1 ? Math.PI : 0;
      q.rotation.z = sign * 0.055;
    }
  } else arrangeCuts(group, fruit, style);
  return true;
}

// Original outlines for the enamel number toppers. Paths are in a 100-unit
// square with a y-up baseline. No texture, external font or text plane is used.
const digits = {
  0: [
    "M50 100 C78 100 91 78 91 50 C91 19 76 0 50 0 C23 0 8 21 8 50 C8 80 22 100 50 100 Z",
    "M50 82 C36 82 30 68 30 49 C30 30 36 18 50 18 C63 18 69 30 69 50 C69 69 63 82 50 82 Z",
  ],
  1: [
    "M45 98 L62 98 L62 17 L81 17 L81 1 L22 1 L22 17 L41 17 L41 72 L24 65 L18 79 Z",
  ],
  2: [
    "M12 76 C18 93 34 100 50 100 C72 100 86 88 86 70 C86 53 75 42 60 30 L45 18 L88 18 L88 1 L11 1 L11 15 L45 43 C58 54 65 61 65 69 C65 78 59 83 50 83 C38 83 31 76 27 68 Z",
  ],
  3: [
    "M14 81 C21 94 34 100 51 100 C72 100 85 89 85 73 C85 61 79 55 69 50 C81 47 88 39 88 27 C88 10 73 0 51 0 C33 0 19 5 10 19 L26 30 C31 22 38 17 50 17 C61 17 67 21 67 30 C67 39 60 43 46 43 L36 43 L36 59 L48 59 C58 59 65 63 65 71 C65 79 60 83 51 83 C40 83 35 79 30 72 Z",
  ],
  4: [
    "M55 98 L77 98 L77 39 L90 39 L90 22 L77 22 L77 1 L57 1 L57 22 L9 22 L9 39 Z",
    "M57 73 L30 39 L57 39 Z",
  ],
  5: [
    "M21 98 L83 98 L83 80 L39 80 L37 60 C42 62 48 63 54 63 C75 63 88 52 88 32 C88 11 72 0 50 0 C33 0 20 5 10 17 L24 30 C31 22 38 17 49 17 C61 17 68 22 68 32 C68 42 61 47 50 47 C40 47 34 44 28 40 L16 46 Z",
  ],
  6: [
    "M76 99 L79 82 C57 82 43 75 36 60 C42 65 48 67 57 67 C76 67 89 54 89 35 C89 14 73 0 51 0 C25 0 12 17 12 42 C12 76 37 98 76 99 Z",
    "M51 49 C39 49 33 42 33 33 C33 23 40 17 51 17 C61 17 68 24 68 34 C68 43 61 49 51 49 Z",
  ],
  7: [
    "M12 98 L89 98 L89 82 C67 60 52 33 46 1 L23 1 C30 34 47 61 65 80 L12 80 Z",
  ],
  8: [
    "M50 100 C72 100 86 89 86 73 C86 62 80 55 72 51 C84 46 89 38 89 28 C89 11 73 0 50 0 C26 0 11 11 11 28 C11 39 18 46 28 51 C19 55 14 63 14 73 C14 89 28 100 50 100 Z",
    "M50 84 C40 84 34 79 34 72 C34 65 40 60 50 60 C61 60 66 65 66 72 C66 79 61 84 50 84 Z",
    "M50 43 C38 43 32 38 32 30 C32 22 39 17 50 17 C61 17 68 22 68 30 C68 38 61 43 50 43 Z",
  ],
};
function traceNumber(path, target, invert) {
  const a = path.match(/[MLCZ]|-?\d+(?:\.\d+)?/g);
  let i = 0;
  const coord = (axis) => {
    const v = Number(a[i++]);
    return ((invert ? 100 - v : v) - (axis === "x" ? 50 : 0)) * 0.00305;
  };
  while (i < a.length) {
    const cmd = a[i++];
    if (cmd === "Z") target.closePath();
    else if (cmd === "M") target.moveTo(coord("x"), coord("y"));
    else if (cmd === "L") target.lineTo(coord("x"), coord("y"));
    else if (cmd === "C")
      target.bezierCurveTo(
        coord("x"),
        coord("y"),
        coord("x"),
        coord("y"),
        coord("x"),
        coord("y"),
      );
  }
  return target;
}
export function buildNumberStamp(group, digit, color, material) {
  const invert = digit === 9,
    paths = digits[invert ? 6 : digit];
  if (!paths) return;
  const shape = traceNumber(paths[0], new T.Shape(), invert);
  for (const p of paths.slice(1))
    shape.holes.push(traceNumber(p, new T.Path(), invert));
  const geo = new T.ExtrudeGeometry(shape, {
    depth: 0.033,
    curveSegments: 10,
    bevelEnabled: true,
    bevelThickness: 0.0032,
    bevelSize: 0.0025,
    bevelSegments: 3,
  });
  geo.translate(0, 0.155, -0.0165);
  attach(group, geo, material(color, "gold"));
  const stick = attach(
    group,
    new T.CylinderGeometry(0.007, 0.0075, 0.18, 10),
    material("#b79063", "matte"),
  );
  stick.position.set(
    digit === 7 ? -0.047 : digit === 4 ? 0.045 : 0,
    0.09,
    -0.007,
  );
}
