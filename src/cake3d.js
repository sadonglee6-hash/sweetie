import * as T from "three";
import {
  cakeOutline as outline,
  cakeRadiusAt as radiusAt,
  cakeParameterAt,
} from "./cake-shapes.js";
import { crumbMaps, grainUV, toastTone } from "./baked-materials.js";
import { fruitSection, sectionGeometry } from "./fruit-section.js";
export { outline };
import { makeCakeLettering, settleLettering } from "./cake-lettering.js";
import {
  CreamPainter,
  handPaletteKnife,
  fillingColumn,
} from "./cream-paint.js";
import { stamp, material, pastryTexture } from "./confections.js";

const TAU = Math.PI * 2,
  v = (x, y, z) => new T.Vector3(x, y, z);
const limit = (x, a, b) => Math.min(b, Math.max(a, x));
const flavors = {
  vanilla: "#f4dba2",
  cocoa: "#865749",
  berry: "#e2b3ad",
  matcha: "#bec88e",
  velvet: "#ad5559",
};
const fillings = {
  "matcha-cream": "#b5c88c",
  cherry: "#a03e4a",
  peach: "#f4b573",
  caramel: "#b87b45",
  ganache: "#704536",
  nuts: "#bd965e",
  cream: "#fff0d5",
  "berry-cream": "#ecb8bd",
  "cocoa-cream": "#a27e68",
  strawberry: "#c96369",
  mango: "#f6ba59",
  blueberry: "#786781",
  cookie: "#75635c",
  pudding: "#efd69a",
  mochi: "#f5dfd5",
  jam: "#ae4a58",
};
const defaults = {
  shape: "round",
  size: 6,
  height: "standard",
  layers: 1,
  flavor: "vanilla",
  fillings: [],
  finish: "smooth",
  color: "#fff2dd",
  color2: "#ddb0bc",
  coverage: 0,
  items: [],
  board: "ivory",
  box: "none",
  ribbon: "#b77a85",
};
const floorY = -0.76;

function dims(d) {
  const radius = 1.32 * (Number(d.size) / 6) ** 0.64;
  const ratio = Number(d.heightRatio);
  const h =
    d.height === "tall" && Number.isFinite(ratio) && ratio > 0
      ? radius * 2 * limit(ratio, 0.25, 1.15)
      : ({ standard: 0.79, tall: 1.07, low: 0.52 }[d.height] ?? 0.79) *
        (0.88 + (0.12 * radius) / 1.32);
  const tiers = Array.from({ length: limit(d.layers | 0, 1, 3) }, (_, i) => ({
    radius: radius * 0.76 ** i,
    h: h * 0.84 ** i,
  }));
  let y = 0;
  for (const t of tiers) {
    t.y = y;
    y += t.h;
  }
  return {
    radius,
    height: y,
    topRadius: tiers.at(-1).radius,
    tiers,
    baseBoard: radius * (d.shape === "square" ? 1.48 : 1.28),
  };
}

function skin(
  shape,
  radius,
  profile,
  start = 0,
  end = TAU,
  mod = null,
  paint = null,
) {
  const pos = [],
    uv = [],
    colors = [],
    idx = [],
    n = Math.max(12, Math.round((120 * (end - start)) / TAU)),
    rows = profile.length;
  const color = new T.Color();
  for (let j = 0; j < rows; j++) {
    const [rr, y, side] = profile[j];
    for (let i = 0; i <= n; i++) {
      const a = start + ((end - start) * i) / n,
        o = outline(shape, a),
        r = rr * radius + (mod?.(a, y, rr, side) ?? 0);
      pos.push(o.x * r, y, o.z * r);
      uv.push(
        side ? i / n : 0.5 + 0.5 * o.x * rr,
        side ? y : 0.5 + 0.5 * o.z * rr,
      );
      if (paint) {
        paint(a, y, rr, side, color);
        colors.push(color.r, color.g, color.b);
      }
      if (j < rows - 1 && i < n) {
        const k = j * (n + 1) + i,
          b = k + n + 1;
        idx.push(k, b, k + 1, k + 1, b, b + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  if (paint) geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Repair normal discontinuity where the closed ring meets the UV seam.
  if (end - start > TAU - 0.00001) {
    const norm = geo.attributes.normal,
      p = v(0, 0, 0),
      q = v(0, 0, 0);
    for (let j = 0; j < rows; j++) {
      const i = j * (n + 1);
      p.fromBufferAttribute(norm, i);
      q.fromBufferAttribute(norm, i + n);
      p.add(q).normalize();
      norm.setXYZ(i, p.x, p.y, p.z);
      norm.setXYZ(i + n, p.x, p.y, p.z);
    }
  }
  return geo;
}

function profile(y, h, r, bevel = 0.018, lines = 1) {
  const b = Math.min(bevel, h * 0.23),
    edge = 1 - b / Math.max(0.05, r);
  const out = [
    [0.0001, y, 0],
    [edge, y, 0],
    [1 - 0.32 * (1 - edge), y + 0.22 * b, 1],
    [1, y + b, 1],
  ];
  for (let i = 1; i <= lines; i++)
    out.push([1, y + b + ((h - 2 * b) * i) / lines, 1]);
  out.push(
    [1 - 0.18 * (1 - edge), y + h - 0.38 * b, 1],
    [1 - 0.55 * (1 - edge), y + h - 0.12 * b, 1],
    [edge, y + h, 0],
    [0.74, y + h + 0.0008, 0],
    [0.42, y + h + 0.0012, 0],
    [0.0001, y + h + 0.0015, 0],
  );
  return out;
}
function add(g, geo, m, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    if (o.userData.ownMat) {
      o.material.map?.dispose();
      o.material.dispose();
    } else if (o.userData.localMat) o.material.dispose();
  });
  g.clear();
}

const spongeMats = new Map(),
  crustMats = new Map();
function crustMaterial(base) {
  if (!crustMats.has(base)) {
    const m = base.clone(),
      maps = crumbMaps();
    m.map = maps.crust;
    m.bumpMap = maps.crustBump;
    m.bumpScale = 0.006;
    m.roughness = 0.86;
    crustMats.set(base, m);
  }
  return crustMats.get(base);
}
function breadMaterial(color) {
  if (!spongeMats.has(color)) {
    const m = material(color, "sponge").clone();
    m.vertexColors = true;
    m.bumpScale = 0.009;
    m.userData.sweetieCrumb = true;
    spongeMats.set(color, m);
  }
  return spongeMats.get(color);
}
function layerEdges(t, filled) {
  const h = filled ? t.h * 0.155 : 0,
    center = t.y + t.h * 0.5;
  return { tier: t, low: center - h * 0.5, high: center + h * 0.5 };
}
function seamShift(edges, y, x, z) {
  if (!edges || Math.abs(edges.low - edges.high) < 0.0001) return 0;
  const t = edges.tier,
    local = (y - t.y) / t.h;
  if (local <= 0 || local >= 1) return 0;
  const weight =
    local < 0.43 ? local / 0.43 : local > 0.58 ? (1 - local) / 0.42 : 1;
  const nx = x / t.radius,
    nz = z / t.radius;
  return (
    weight *
    t.h *
    (0.0054 * Math.sin(4.9 * nx + 1.4 * nz + 0.8 * t.y) +
      0.004 * Math.cos(2.2 * nx - 6.4 * nz) +
      0.0018 * Math.sin(11.3 * nx + 4.5 * nz))
  );
}
function dressBread(
  geo,
  profileRows,
  y,
  h,
  edges,
  { bakedTop, bakedBottom },
  seed,
) {
  const p = geo.attributes.position,
    uv = geo.attributes.uv,
    cols = p.count / profileRows.length,
    colors = [];
  for (let j = 0; j < profileRows.length; j++) {
    const [rr, yy, side] = profileRows[j];
    let along = 0;
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i,
        x = p.getX(k),
        z = p.getZ(k);
      if (i) along += Math.hypot(x - p.getX(k - 1), z - p.getZ(k - 1));
      const a = Math.atan2(z, x),
        co = side ? grainUV(along, yy, seed) : grainUV(x, z, seed + 0.81);
      uv.setXY(k, ...co);
      const lower = bakedBottom ? Math.exp(-Math.max(0, yy - y) / 0.027) : 0;
      const upper = bakedTop ? Math.exp(-Math.max(0, y + h - yy) / 0.028) : 0;
      const warm = side
        ? 0.43 + 0.32 * Math.max(lower, upper)
        : yy > y + h * 0.5
          ? bakedTop
            ? 0.54 + 0.18 * rr
            : 0.045 + 0.15 * rr ** 7
          : 0.15;
      const uneven =
        0.026 * Math.sin(4.2 * x + 4.1 * z + yy * 13 + seed) +
        0.013 * Math.cos(13 * x - 7 * z + 8 * yy);
      colors.push(...toastTone(warm, uneven));
      const spread = seamShift(edges, yy, x, z);
      p.setY(
        k,
        yy +
          spread +
          (side ? 0 : 0.0018 * Math.sin(3.5 * x + seed) * Math.cos(4.1 * z)),
      );
    }
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  if (bakedTop) {
    const topRow = profileRows.findIndex(
      (row, index) => index > 0 && row[1] > y + h - 0.0075,
    );
    const boundary = Math.max(0, topRow - 1) * (cols - 1) * 6,
      count = geo.index.count;
    if (boundary > 0) geo.addGroup(0, boundary, 0);
    geo.addGroup(boundary, count - boundary, 1);
  }
  return geo;
}
function cutFace(g, shape, r, y, h, start, end, mat, edges, flags = {}) {
  const isSponge = !!mat.userData.sweetieCrumb;
  for (const [a, reverse] of [
    [start, true],
    [end, false],
  ]) {
    const p = outline(shape, a),
      ex = p.x * r,
      ez = p.z * r,
      len = Math.hypot(ex, ez);
    const xs = [
      0,
      0.02,
      ...Array.from({ length: 32 }, (_, j) => (j + 1) * 0.029),
      0.953,
      0.973,
      0.982,
      0.99,
      0.996,
      1,
    ];
    const ys = [
      0, 0.014, 0.035, 0.067, 0.14, 0.3, 0.52, 0.72, 0.86, 0.935, 0.966, 0.984,
      1,
    ];
    const pos = [],
      uv = [],
      col = [],
      indices = [];
    for (let j = 0; j < ys.length; j++)
      for (let i = 0; i < xs.length; i++) {
        const t = xs[i],
          f = ys[j],
          x = t * ex,
          z = t * ez,
          yy = y + f * h;
        pos.push(x, yy + seamShift(edges, yy, x, z), z);
        uv.push(...grainUV(t * len, yy, 1.7 + (reverse ? 0.1 : 0.24)));
        if (isSponge) {
          const edgeSkin = Math.exp(-((1 - t) * len) / 0.013);
          const base = flags.bakedBottom ? Math.exp(-(f * h) / 0.01) : 0;
          const top = flags.bakedTop ? Math.exp(-((1 - f) * h) / 0.013) : 0;
          const warm =
            0.015 + 0.86 * Math.max(edgeSkin, 0.68 * base, 0.78 * top);
          const contact =
            (!flags.bakedTop ? 0.06 * Math.exp((-(1 - f) * h) / 0.019) : 0) +
            (!flags.bakedBottom ? 0.045 * Math.exp((-f * h) / 0.017) : 0);
          const uneven = 0.018 * Math.sin(9 * x + 5.3 * yy + 6 * z) - contact;
          col.push(...toastTone(warm, uneven));
        } else {
          const occlusion =
            0.11 * Math.exp((-f * h) / 0.019) +
            0.058 * Math.exp((-(1 - f) * h) / 0.016);
          const curd =
            0.017 *
            Math.sin(8 * x + 5 * z + 0.7 * Math.sin(14 * yy)) *
            Math.sin(f * Math.PI);
          const tint = 1 - occlusion + curd;
          col.push(tint, tint * 0.995, tint * 0.988);
        }
        if (i + 1 < xs.length && j + 1 < ys.length) {
          const k = j * xs.length + i,
            n = k + xs.length;
          if (reverse) indices.push(k, n, k + 1, k + 1, n, n + 1);
          else indices.push(k, k + 1, n, k + 1, n + 1, n);
        }
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const faceMat = isSponge ? mat : mat.clone();
    if (!isSponge) faceMat.vertexColors = true;
    const face = add(g, geo, faceMat);
    face.userData.localMat = !isSponge;
  }
}

const fruitTones = {
  peach: "#eda95f",
  nuts: "#ae854c",
  caramel: "#b37444",
  ganache: "#64402d",
  strawberry: "#bd4d5d",
  blueberry: "#635772",
  mango: "#f0ae48",
  cookie: "#64534b",
  mochi: "#f4dacf",
  pudding: "#e7c17e",
  jam: "#ad4e5c",
  cherry: "#ad4056",
  fig: "#c9848a",
  lemon: "#efd471",
};
function pieceData(piece, t, shape, fill) {
  if (!piece) return null;
  const p = piece.point ?? piece,
    kind = String(piece.type ?? piece.fruit ?? fill ?? "strawberry").split(
      "-",
    )[0];
  if (!Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.z)))
    return null;
  let x = Number(p.x) * t.radius,
    z = Number(p.z) * t.radius;
  const a = Math.atan2(z, x),
    scale = limit(Number(piece.scale) || 1, 0.45, 2.4);
  const r =
    ({
      strawberry: 0.103,
      blueberry: 0.072,
      mango: 0.086,
      cookie: 0.056,
      mochi: 0.091,
      pudding: 0.085,
      jam: 0.065,
    }[kind] ?? 0.084) * scale;
  const max = Math.max(0.01, radiusAt(shape, a) * t.radius - r * 0.78),
    dist = Math.hypot(x, z);
  if (dist > max) {
    x *= max / dist;
    z *= max / dist;
  }
  return {
    x,
    z,
    r,
    kind,
    color: fruitTones[kind] || "#ce8c87",
    box: ["mango", "cookie", "pudding"].includes(kind),
  };
}
function cutPlan(d) {
  const pieces = (d.fillingPieces || [])
    .flat()
    .filter((p) => p && (p.point || p).x !== undefined);
  if (!pieces.length) {
    for (const coat of d.fillingPaint || [])
      for (const brush of coat?.strokes || []) {
        if (brush.face === "top" && brush.action !== "smooth") {
          const [u, v] = brush.path;
          pieces.push({ x: u * 2 - 1, z: v * 2 - 1 });
          break;
        }
      }
  }
  if (!pieces.length) return { start: 1.42, end: TAU + 0.59 };
  // Align one cut face with a real fruit centre. The same fruit will be
  // identified at its original depth when the cross section opens.
  const polar = (p) => Math.atan2((p.point || p).z, (p.point || p).x);
  const target = pieces.reduce(
    (best, p) =>
      Math.cos(polar(p) - 0.96) > Math.cos(polar(best) - 0.96) ? p : best,
    pieces[0],
  );
  const a = polar(target);
  const param = cakeParameterAt(d.shape, a);
  const tip = outline(d.shape, param + 0.83),
    gap = (Math.atan2(tip.z, tip.x) - a + TAU) % TAU;
  return { start: param + 0.83, end: param + TAU, focus: a + gap * 0.5 };
}

const pulpMats = new Map();
function fleshOnCut(kind, color) {
  if (pulpMats.has(kind)) return pulpMats.get(kind);
  const reference = {
    strawberry: "strawberry-slice",
    blueberry: "blueberry-half",
    cherry: "cherry-half",
    mango: "mango-slice",
    fig: "fig-slice",
    lemon: "lemon-wheel",
  }[kind];
  const cut =
    reference &&
    stamp(reference).find((p) => p.material.map?.image?.width === 320);
  const mat = (
    cut?.material ?? material(color, kind === "cookie" ? "sponge" : "fruit")
  ).clone();
  mat.side = T.DoubleSide;
  mat.roughness = kind === "cookie" ? 0.9 : 0.41;
  pulpMats.set(kind, mat);
  return mat;
}
function crossSectionPieces(g, d, t, y, h, start, end, pieces) {
  const seams = layerEdges(t, true);
  for (const [a, sign] of [
    [start, -1],
    [end, 1],
  ]) {
    const rim = outline(d.shape, a),
      length = Math.hypot(rim.x, rim.z),
      dx = rim.x / length,
      dz = rim.z / length,
      nx = -dz * sign,
      nz = dx * sign;
    for (const item of pieces) {
      const p = pieceData(item, t, d.shape);
      if (!p) continue;
      const type = item.type ?? "strawberry",
        scale = limit(Number(item.scale) || 1, 0.2, 4) * 0.9;
      if (Math.abs(p.x * nx + p.z * nz) > 0.57 * scale) continue;
      const parts = fillingPartList(type, p.color, item.color);
      const loops = fruitSection(parts, {
        x: p.x,
        z: p.z,
        scale,
        rotation: Number(item.rotation) || 0,
        dx,
        dz,
        height: h,
        limit: t.radius * length,
      });
      const mat = fleshOnCut(p.kind, p.color);
      for (const loop of loops) {
        const geo = sectionGeometry(loop, {
          dx,
          dz,
          nx,
          nz,
          y,
          surfaceOffset: (py, x, z) => seamShift(seams, py, x, z),
        });
        const visible = add(g, geo, mat);
        visible.castShadow = false;
      }
    }
  }
}
function openFilling(g, d, t, assembly) {
  const { radius: r, y, h } = t,
    fh = h * 0.155,
    lower = (h - fh) * 0.5,
    top = y + lower;
  const targets = [],
    kind = assembly.filling || d.fillings?.[assembly.tier] || "cream";
  const rows = profile(y, lower, r, 0.013, 8);
  const body = dressBread(
    skin(d.shape, r, rows),
    rows,
    y,
    lower,
    null,
    { bakedTop: false, bakedBottom: true },
    assembly.tier + 0.37,
  );
  targets.push(
    add(
      g,
      body,
      breadMaterial(
        flavors[d.layerFlavors?.[assembly.tier] ?? d.flavor] || flavors.vanilla,
      ),
    ),
  );
  const progress = limit(
    Number(d.fillingPaint?.[assembly.tier]?.base ?? assembly.progress) || 0,
    0,
    1,
  );
  if (progress > 0.001) {
    const rr = Math.sqrt(progress) * r * 0.985,
      hh = fh * 0.72;
    const pigment =
      d.fillingBaseColors?.[assembly.tier] ||
      {
        strawberry: "#f2d3c9",
        blueberry: "#ebdce3",
        mango: "#f7dfae",
        cookie: "#e6d5c2",
      }[kind] ||
      fillings[kind] ||
      fillings.cream;
    // A slightly uneven spread is visible along the exposed edge.
    const shapeProfile = profile(top + 0.003, hh, rr, 0.018, 5);
    const frosting = skin(
      d.shape,
      rr,
      shapeProfile,
      0,
      TAU,
      (a, py, ratio) =>
        0.006 * ratio * (Math.sin(5 * a + 0.2) + 0.48 * Math.cos(9 * a)),
    );
    targets.push(add(g, frosting, material(pigment)));
  }
  return targets;
}

function fillingPigment(kind) {
  return (
    {
      strawberry: "#f2d3c9",
      blueberry: "#ebdce3",
      mango: "#f7dfae",
      cookie: "#e6d5c2",
    }[kind] ||
    fillings[kind] ||
    fillings.cream
  );
}
function fillingFruits(g, d, geo, assembly, painter, locations) {
  locations.clear();
  if (!assembly) return;
  const tier = geo.tiers[assembly.tier],
    points = assembly.fruitPoints ?? d.fillingPieces?.[assembly.tier] ?? [];
  const baseline =
      Number(d.fillingPaint?.[assembly.tier]?.base ?? assembly.progress) || 0,
    batches = new Map();
  for (const [i, piece] of points.entries()) {
    const p = pieceData(piece, tier, d.shape, assembly.filling);
    if (!p) continue;
    const a = Math.atan2(p.z, p.x),
      edge = radiusAt(d.shape, a) * tier.radius * Math.sqrt(baseline) * 0.985;
    const old =
      baseline > 0.001 && Math.hypot(p.x, p.z) <= edge
        ? tier.h * 0.155 * 0.72
        : 0;
    const relief = painter.heightAt(
      assembly.tier,
      "top",
      (p.x / tier.radius) * 0.5 + 0.5,
      (p.z / tier.radius) * 0.5 + 0.5,
    );
    const base = tier.y + tier.h * 0.4225 + Math.max(old, relief) + 0.004;
    const type = piece.type || "strawberry";
    const fac = limit(Number(piece.scale) || 1, 0.2, 4) * 0.9;
    const xform = new T.Matrix4().compose(
      v(p.x, base, p.z),
      new T.Quaternion().setFromAxisAngle(up, Number(piece.rotation) || 0),
      v(fac, fac, fac),
    );
    const id = piece.id ?? "filling-" + assembly.tier + "-" + i;
    locations.set(id, v(p.x, base + 0.1 * fac, p.z));
    for (const part of fillingPartList(type, p.color, piece.color)) {
      if (!batches.has(part)) batches.set(part, []);
      batches.get(part).push({ id, xform });
    }
  }
  for (const [part, entries] of batches) {
    const inst = new T.InstancedMesh(
      part.geometry,
      part.material,
      entries.length,
    );
    inst.castShadow = inst.receiveShadow = true;
    inst.userData.ids = entries.map((e) => e.id);
    entries.forEach((e, i) => inst.setMatrixAt(i, e.xform));
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    g.add(inst);
  }
}
const fillingBits = new Map();
function fillingPartList(type, color, customColor) {
  if (
    ![
      "cookie",
      "pudding",
      "mochi",
      "jam",
      "peach",
      "nuts",
      "ganache",
      "caramel",
      "matcha-cream",
    ].includes(type)
  )
    return stamp(type, customColor);
  if (!fillingBits.has(type)) {
    const diced = ["cookie", "pudding", "nuts", "peach"].includes(type);
    const geometry = diced
      ? new T.BoxGeometry(0.13, 0.07, 0.12)
      : new T.SphereGeometry(0.08, 16, 12);
    geometry.translate(0, diced ? 0.035 : 0.08, 0);
    geometry.computeBoundingBox();
    fillingBits.set(type, [
      {
        geometry,
        material: material(color, type === "cookie" ? "sponge" : "fruit"),
      },
    ]);
  }
  return fillingBits.get(type);
}

function spatialFillingBelt(
  g,
  d,
  t,
  tier,
  y,
  h,
  rr,
  start,
  end,
  cut,
  spongeMat,
) {
  const paint = d.fillingPaint?.[tier],
    base = paint?.base ?? d.fillingCoverage?.[tier] ?? 1;
  const tint =
    d.fillingBaseColors?.[tier] || fillingPigment(d.fillings?.[tier]);
  const paths = [];
  const around = [];
  for (let j = 0; j <= 160; j++) {
    const a = start + ((end - start) * j) / 160,
      o = outline(d.shape, a);
    around.push([o.x * rr, o.z * rr]);
  }
  paths.push(around);
  if (cut) {
    const first = around[0],
      last = around.at(-1),
      a = [],
      b = [];
    for (let j = 0; j <= 88; j++) {
      const f = j / 88;
      a.push([last[0] * (1 - f), last[1] * (1 - f)]);
      b.push([first[0] * f, first[1] * f]);
    }
    paths.push(a, b);
  }
  const cream = material("#fff").clone();
  cream.vertexColors = true;
  const hitMeshes = [];
  for (const points of paths) {
    const layers = [
        { pos: [], col: [], uv: [] },
        { pos: [], col: [], uv: [] },
      ],
      idx = [];
    let along = 0;
    const seams = layerEdges(t, true);
    for (const [i, [x, z]] of points.entries()) {
      if (i) along += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
      const c = fillingColumn(
          paint,
          base,
          d.shape,
          x / t.radius,
          z / t.radius,
          radiusAt,
          tint,
        ),
        mid = y + h * c.height;
      const bottom = y + seamShift(seams, y, x, z),
        middle = mid + seamShift(seams, mid, x, z),
        upper = y + h + seamShift(seams, y + h, x, z);
      layers[0].pos.push(x, bottom, z, x, middle, z);
      layers[1].pos.push(x, middle, z, x, upper, z);
      for (const [j, band] of layers.entries())
        band.uv.push(
          ...grainUV(along, j ? mid : y, tier + 0.37),
          ...grainUV(along, j ? y + h : mid, tier + 0.37),
        );
      const tone = toastTone(points === paths[0] ? 0.43 : 0.02, -0.018);
      layers[1].col.push(...tone, ...tone);
      layers[0].col.push(
        c.color.r,
        c.color.g,
        c.color.b,
        c.color.r,
        c.color.g,
        c.color.b,
      );
      if (i < points.length - 1) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
      }
    }
    for (let j = 0; j < 2; j++) {
      const geom = new T.BufferGeometry(),
        b = layers[j];
      geom.setAttribute("position", new T.Float32BufferAttribute(b.pos, 3));
      geom.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
      geom.setIndex(idx);
      geom.setAttribute("color", new T.Float32BufferAttribute(b.col, 3));
      geom.computeVertexNormals();
      const m = add(g, geom, j ? spongeMat : cream);
      if (!j && points === paths[0]) m.userData.localMat = true;
      if (points === paths[0]) hitMeshes.push(m);
    }
  }
  return hitMeshes;
}

function buildCake(g, d, cut, geometry, assembly = null) {
  const section = cut ? cutPlan(d) : { start: 0, end: TAU },
    start = section.start,
    end = section.end;
  const targets = [],
    coverage = limit(Number(d.creamPaint?.base ?? d.coverage) || 0, 0, 1);
  const c1 = new T.Color(d.color),
    c2 = new T.Color(d.color2 || d.color),
    third = new T.Color(d.color3 || d.color);
  for (const [i, t] of geometry.tiers.entries()) {
    if (assembly && i === assembly.tier) {
      return openFilling(g, d, t, assembly);
    }
    const { radius: r, y, h } = t,
      fill = d.fillings?.[i],
      hasFill = fill && fill !== "none";
    const fillingH = hasFill ? h * 0.155 : 0;
    const lower = (h - fillingH) * 0.5,
      spongeMat = breadMaterial(
        flavors[d.layerFlavors?.[i] ?? d.flavor] || flavors.vanilla,
      );
    const edges = layerEdges(t, hasFill);
    const bareRadius = coverage > 0 ? r - 0.009 : r;
    const intervals = hasFill
      ? [
          [y, lower, spongeMat],
          [
            y + lower,
            fillingH,
            material(
              d.fillingBaseColors?.[i] || fillings[fill] || fillings.cream,
            ),
          ],
          [y + lower + fillingH, h - lower - fillingH, spongeMat],
        ]
      : [[y, h, spongeMat]];
    for (const [yy, hh, m] of intervals) {
      if (
        m !== spongeMat &&
        (d.fillingPaint?.[i] ||
          (Number.isFinite(d.fillingCoverage?.[i]) && d.fillingCoverage[i] < 1))
      ) {
        targets.push(
          ...spatialFillingBelt(
            g,
            d,
            t,
            i,
            yy,
            hh,
            bareRadius,
            start,
            end,
            cut,
            spongeMat,
          ),
        );
        if (cut && d.fillingPieces?.[i]?.length)
          crossSectionPieces(g, d, t, yy, hh, start, end, d.fillingPieces[i]);
        continue;
      }
      const rough =
        m === spongeMat
          ? (a, py, rr, side) =>
              side
                ? 0.003 *
                  (Math.sin(23 * a + py * 32) +
                    0.47 * Math.sin(57 * a - 14 * py))
                : 0
          : null;
      const flags = {
        bakedTop: Math.abs(yy + hh - y - h) < 0.001,
        bakedBottom: Math.abs(yy - y) < 0.001,
      };
      const prof = profile(
        yy,
        hh,
        bareRadius,
        m === spongeMat ? 0.01 : 0.007,
        m === spongeMat ? 10 : 4,
      );
      const body = skin(d.shape, bareRadius, prof, start, end, rough);
      if (m === spongeMat)
        dressBread(body, prof, yy, hh, edges, flags, i + 0.37);
      else {
        const pos = body.attributes.position;
        for (let k = 0; k < pos.count; k++)
          pos.setY(
            k,
            pos.getY(k) +
              seamShift(edges, pos.getY(k), pos.getX(k), pos.getZ(k)),
          );
        body.computeVertexNormals();
      }
      const surfaceMat =
        m === spongeMat && flags.bakedTop ? [m, crustMaterial(m)] : m;
      targets.push(add(g, body, surfaceMat));
      if (cut) {
        const placed = d.fillingPieces?.[i];
        cutFace(g, d.shape, bareRadius, yy, hh, start, end, m, edges, flags);
        if (m !== spongeMat && placed?.length)
          crossSectionPieces(g, d, t, yy, hh, start, end, placed);
      }
    }
    if (coverage <= 0) continue;
    let endF = start + (end - start) * coverage;
    const finish = d.finish,
      skinY = y + (finish === "naked" ? h * 0.9 : 0),
      skinH = y + h - skinY + 0.012;
    const lines =
      finish === "vintage" || finish === "wave"
        ? 100
        : finish === "marble" || finish === "gradient"
          ? 36
          : 9;
    const mod = (a, py, rr, side) => {
      if (!side) return 0;
      const ny = (py - y) / h;
      if (finish === "vintage")
        return (
          0.00235 *
            Math.sin(ny * TAU * 21 + 0.42 * Math.sin(3 * a) + a * 0.57) +
          0.00073 * Math.sin(5 * a - ny * TAU * 35)
        );
      if (finish === "wave")
        return (
          0.012 * Math.sin(ny * TAU * 11 + 1.8 * Math.sin(4 * a)) +
          0.0022 * Math.cos(18 * a)
        );
      return (
        0.0017 * Math.sin(a * 11 + ny * 4) + 0.0011 * Math.sin(a * 7 - ny * 13)
      );
    };
    const colored = ["gradient", "marble"].includes(finish);
    const paint = colored
      ? (a, py, rr, side, out) => {
          const ny = limit((py - y) / h, 0, 1);
          let t = 1 - ny;
          if (finish === "marble") {
            const f = Math.sin(
              (a +
                0.39 * Math.sin(a * 2.3 + ny * 0.71) +
                ny * 3.25 +
                1.3 * (1 - rr)) *
                3.35,
            );
            t =
              0.08 +
              0.73 * Math.exp(-Math.abs(f) * 7) +
              0.09 * Math.sin(a * 2 + ny);
          }
          out.copy(c1).lerp(c2, limit(t, 0, 1));
          if (d.color3)
            out.lerp(third, Math.max(0, 1 - 3.6 * Math.abs(0.5 - ny)) * 0.88);
        }
      : null;
    const m = colored
      ? material("#ffffff").clone()
      : material(d.color, finish === "sugarpaste" ? "matte" : "cream");
    if (colored) m.vertexColors = true;
    const frosted = add(
      g,
      skin(
        d.shape,
        r + 0.006,
        profile(skinY, skinH, r, 0.029, lines),
        start,
        endF,
        mod,
        paint,
      ),
      m,
    );
    frosted.userData.localMat = colored;
    targets.push(frosted);
    if (finish === "naked" && hasFill) {
      const belt = add(
        g,
        skin(
          d.shape,
          r + 0.004,
          profile(y + lower - 0.011, fillingH + 0.022, r, 0.01, 3),
          start,
          endF,
          mod,
        ),
        material(d.color),
      );
      targets.push(belt);
    }
    if (finish === "drip") {
      const shellProfile = [
        [1, y + h - 0.094, 1],
        [1.006, y + h - 0.084, 1],
        [1.01, y + h - 0.04, 1],
        [1.009, y + h + 0.007, 1],
        [0.995, y + h + 0.017, 1],
        [0.97, y + h + 0.023, 0],
        [0.5, y + h + 0.024, 0],
        [0.0001, y + h + 0.024, 0],
      ];
      const geo = skin(d.shape, r + 0.009, shellProfile, start, endF),
        p = geo.attributes.position,
        w = p.count / shellProfile.length;
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < w; col++) {
          const a = start + ((endF - start) * col) / (w - 1);
          const drip =
            (0.03 + 0.07 * (0.5 + 0.5 * Math.sin(4 * a + 0.8))) *
            Math.max(0, Math.cos(13 * a + 0.76 * Math.sin(4 * a))) ** 5;
          const k = row * w + col;
          p.setY(k, p.getY(k) - drip * (1 - row / 3));
        }
      geo.computeVertexNormals();
      targets.push(add(g, geo, material("#674231", "chocolate")));
    }
  }
  return targets;
}

function pedestal(g, d, geometry) {
  const r = geometry.baseBoard,
    m = material(
      { ivory: "#fbefda", rose: "#e1bdc0", gold: "#e4c690" }[d.board] ||
        "#fbefda",
      "ceramic",
    ),
    gold = material("#b99c75", "gold");
  const lip = [
    [0.001, -0.126, 0],
    [0.64, -0.126, 0],
    [0.87, -0.104, 1],
    [0.966, -0.079, 1],
    [1, -0.054, 1],
    [1.005, -0.037, 1],
    [0.994, -0.022, 1],
    [0.967, -0.02, 0],
    [0.91, -0.035, 0],
    [0.8, -0.022, 0],
    [0.001, -0.004, 0],
  ];
  add(
    g,
    skin("round", r, lip, 0, TAU, (a, py, rr) =>
      rr > 0.9 ? 0.016 * Math.cos(40 * a) : 0,
    ),
    m,
  );
  const stem = [
    [0.001, floorY + 0.007, 0],
    [0.427, floorY + 0.007, 0],
    [0.444, floorY + 0.021, 1],
    [0.438, floorY + 0.044, 1],
    [0.413, floorY + 0.075, 1],
    [0.344, -0.565, 1],
    [0.244, -0.521, 1],
    [0.188, -0.465, 1],
    [0.15, -0.402, 1],
    [0.142, -0.344, 1],
    [0.152, -0.295, 1],
    [0.182, -0.255, 1],
    [0.215, -0.244, 1],
    [0.219, -0.222, 1],
    [0.196, -0.204, 1],
    [0.24, -0.167, 1],
    [0.306, -0.134, 1],
    [0.391, -0.108, 1],
    [0.001, -0.108, 0],
  ];
  add(g, skin("round", r, stem), m);
  add(
    g,
    skin(
      "round",
      r,
      [
        [1, -0.055, 1],
        [1.002, -0.049, 1],
      ],
      0,
      TAU,
      (a) => 0.016 * Math.cos(40 * a),
    ),
    gold,
  );
}

function studioTools(g, geo) {
  const r = geo.baseBoard;
  const ceramic = material("#d7c6b3", "ceramic"),
    metal = material("#bdc2bd", "metal"),
    sage = material("#aaaf99", "ribbon");
  const turned = (obj, pts, mat, x, y, z) => {
    const points = pts.map(([rr, yy]) => new T.Vector2(rr, yy));
    return add(obj, new T.LatheGeometry(points, 60), mat, x, y, z);
  };
  // Pale thrown earthenware, with a rounded inside lip and visible cream.
  const bowl = new T.Group();
  g.add(bowl);
  bowl.position.set(-r - 0.2, floorY, -0.69);
  turned(
    bowl,
    [
      [0.001, 0.014],
      [0.15, 0.014],
      [0.17, 0.023],
      [0.17, 0.051],
      [0.23, 0.081],
      [0.28, 0.126],
      [0.32, 0.2],
      [0.337, 0.265],
      [0.334, 0.278],
      [0.32, 0.281],
      [0.313, 0.267],
      [0.296, 0.204],
      [0.26, 0.143],
      [0.185, 0.106],
      [0.001, 0.1],
    ],
    ceramic,
    0,
    0,
    0,
  );
  const rim = add(
    bowl,
    new T.TorusGeometry(0.326, 0.006, 7, 64),
    material("#977762", "gold"),
    0,
    0.277,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  const contents = add(
    bowl,
    new T.SphereGeometry(1, 34, 16),
    material("#f6e2c9"),
    0,
    0.165,
    0,
  );
  contents.scale.set(0.283, 0.041, 0.283);
  for (const [x, z, sz] of [
    [-0.068, 0.035, 0.69],
    [0.083, -0.018, 0.56],
  ]) {
    for (const part of stamp("pipe-star", "#fae5cb")) {
      const p = add(bowl, part.geometry.clone(), part.material, x, 0.184, z);
      p.scale.setScalar(sz);
    }
  }
  // The whisk's wires form an open balloon, allowing the handle and cream to
  // show between them instead of reading as a solid silver oval.
  const whisk = new T.Group();
  bowl.add(whisk);
  whisk.position.set(-0.01, 0.171, -0.014);
  whisk.rotation.z = 0.7;
  whisk.rotation.x = -0.18;
  for (let j = 0; j < 7; j++) {
    const a = (j * Math.PI) / 7,
      c = Math.cos(a),
      ss = Math.sin(a);
    // Close each wire at the neck of the handle.
    const paths = [
      v(0, 0.153, 0),
      v(c * 0.046, 0.12, ss * 0.046),
      v(c * 0.064, 0.061, ss * 0.064),
      v(0, 0.012, 0),
      v(-c * 0.064, 0.061, -ss * 0.064),
      v(-c * 0.046, 0.12, -ss * 0.046),
      v(0, 0.153, 0),
    ];
    add(
      whisk,
      new T.TubeGeometry(new T.CatmullRomCurve3(paths), 24, 0.0028, 5, false),
      metal,
    );
  }
  turned(
    whisk,
    [
      [0.001, 0],
      [0.015, 0],
      [0.019, 0.018],
      [0.019, 0.055],
      [0.016, 0.065],
      [0.001, 0.065],
    ],
    metal,
    0,
    0.143,
    0,
  );
  turned(
    whisk,
    [
      [0.001, 0],
      [0.018, 0],
      [0.023, 0.04],
      [0.021, 0.32],
      [0.017, 0.338],
      [0.001, 0.34],
    ],
    material("#ac7650", "matte"),
    0,
    0.197,
    0,
  );
  // A folded linen napkin with woven inset stripes and a soft, uneven hem.
  const cloth = new T.Group();
  g.add(cloth);
  cloth.position.set(r + 0.2, floorY + 0.012, 0.59);
  cloth.rotation.y = -0.37;
  const pos = [],
    idx = [],
    uv = [],
    cols = 28,
    rows = 22,
    w = 1.13,
    h = 0.84;
  const lift = (x, z) =>
    0.01 +
    0.013 * Math.sin(17 * x + z * 1.8) +
    0.023 * Math.exp(-((x + 0.26) ** 2) * 65) +
    0.006 * Math.sin(z * 7 + x * 3);
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols - 0.5) * w,
        z = (j / rows - 0.5) * h;
      pos.push(x, lift(x, z), z + 0.005 * Math.sin(x * 19));
      uv.push(i / cols, j / rows);
      if (i < cols && j < rows) {
        const k = j * (cols + 1) + i,
          n = k + cols + 1;
        idx.push(k, n, k + 1, k + 1, n, n + 1);
      }
    }
  const linen = new T.BufferGeometry();
  linen.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  linen.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  linen.setIndex(idx);
  linen.computeVertexNormals();
  add(cloth, linen, material("#e6d8c0", "ribbon"));
  for (const x of [-0.46, -0.435, 0.435, 0.46]) {
    const coords = [];
    for (let k = 0; k <= 24; k++) {
      const z = (k / 24 - 0.5) * h;
      coords.push(v(x, lift(x, z) + 0.002, z + 0.005 * Math.sin(x * 19)));
    }
    add(
      cloth,
      new T.TubeGeometry(new T.CatmullRomCurve3(coords), 25, 0.0033, 4, false),
      sage,
    );
  }
  // Rounded stainless palette knife and a hardwood handle with two brass pins.
  const knife = new T.Group();
  cloth.add(knife);
  knife.position.set(0.026, 0.058, 0.007);
  knife.rotation.y = 0.57;
  const outline = new T.Shape();
  outline.moveTo(-0.049, -0.04);
  outline.lineTo(-0.059, 0.38);
  outline.quadraticCurveTo(0, 0.464, 0.062, 0.38);
  outline.lineTo(0.043, -0.04);
  outline.closePath();
  const blade = add(
    knife,
    new T.ExtrudeGeometry(outline, {
      depth: 0.006,
      curveSegments: 14,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.003,
      bevelThickness: 0.002,
    }),
    metal,
    0,
    0,
    0,
  );
  blade.rotation.x = Math.PI / 2;
  const handle = turned(
    knife,
    [
      [0.001, 0],
      [0.024, 0],
      [0.035, 0.032],
      [0.033, 0.139],
      [0.041, 0.23],
      [0.034, 0.273],
      [0.001, 0.284],
    ],
    material("#a96f4d", "matte"),
    0,
    0.008,
    -0.018,
  );
  handle.rotation.x = -Math.PI / 2;
  handle.scale.z = 0.56;
  for (const z of [-0.087, -0.237])
    add(
      knife,
      new T.CylinderGeometry(0.008, 0.008, 0.004, 12),
      material("#ba9c6f", "gold"),
      0,
      0.028,
      z,
    );
  const fruitTray = new T.Group();
  g.add(fruitTray);
  fruitTray.position.set(r + 0.12, floorY, -1.3);
  turned(
    fruitTray,
    [
      [0.001, 0.004],
      [0.23, 0.004],
      [0.32, 0.02],
      [0.35, 0.044],
      [0.349, 0.052],
      [0.331, 0.056],
      [0.275, 0.033],
      [0.001, 0.021],
    ],
    material("#d3bdad", "ceramic"),
    0,
    0,
    0,
  );
  for (const [type, x, z, scale, turn] of [
    ["cherry", -0.082, -0.025, 0.73, 1.2],
    ["cherry", 0.08, 0.052, 0.79, -0.3],
    ["blueberry", -0.008, 0.157, 0.62, 0.4],
  ]) {
    for (const part of stamp(type)) {
      const m = add(
        fruitTray,
        part.geometry.clone(),
        part.material,
        x,
        0.025,
        z,
      );
      m.scale.setScalar(scale);
      m.rotation.y = turn;
    }
  }
}

function textTexture(text, tint, style, arc) {
  const cn = document.createElement("canvas");
  cn.width = 1024;
  cn.height = 384;
  const c = cn.getContext("2d"),
    s = String(text).slice(0, 80);
  const family =
    style === "fondant"
      ? 'Georgia, "Songti SC", serif'
      : '"Snell Roundhand","Apple Chancery",KaiTi,"STKaiti",Georgia,serif';
  let size = 142;
  c.font = (style === "fondant" ? "600 " : "italic ") + size + "px " + family;
  const w = c.measureText(s).width;
  if (w > 940) {
    size *= 940 / w;
    c.font = (style === "fondant" ? "600 " : "italic ") + size + "px " + family;
  }
  c.textAlign = "center";
  c.textBaseline = "middle";
  const gradient = c.createLinearGradient(0, 95, 0, 270);
  gradient.addColorStop(0, tint);
  gradient.addColorStop(0.47, tint);
  gradient.addColorStop(1, "#78544b");
  c.fillStyle = gradient;
  c.shadowColor = "rgba(84,51,45,.35)";
  c.shadowBlur = 3;
  c.shadowOffsetY = 3;
  if (arc) {
    const chars = Array.from(s),
      widths = chars.map((k) => c.measureText(k).width),
      total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    for (let i = 0; i < chars.length; i++) {
      x += widths[i] / 2;
      const n = x / 480;
      c.save();
      c.translate(512 + x, 166 + 89 * n * n);
      c.rotate(0.34 * n);
      c.fillText(chars[i], 0, 0);
      c.restore();
      x += widths[i] / 2;
    }
  } else c.fillText(s, 512, 196);
  const map = new T.CanvasTexture(cn);
  map.colorSpace = T.SRGBColorSpace;
  return map;
}

function labelPlane(g, text, color, x, y, z, width, style, arc, flat = true) {
  if (!text) return null;
  const tx = textTexture(text, color, style, arc),
    m = new T.MeshStandardMaterial({
      map: tx,
      transparent: true,
      depthWrite: false,
      roughness: 0.54,
      side: T.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
  const o = add(g, new T.PlaneGeometry(width, width * 0.375), m, x, y, z);
  o.userData.ownMat = true;
  o.castShadow = false;
  if (flat) o.rotation.x = -Math.PI / 2;
  return o;
}

function packaging(g, d, geo) {
  const r = geo.baseBoard;
  delete g.userData.packageBounds;

  // The card is printed on a separate sheet; the message follows its rotation.
  function greeting(parent, width) {
    const group = new T.Group(),
      depth = width * 0.54;
    parent.add(group);
    const stock = add(
      group,
      new T.BoxGeometry(width, 0.014, depth),
      material("#fff3d9", "matte"),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 680;
    canvas.height = 367;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff4de";
    ctx.fillRect(0, 0, 680, 367);
    ctx.strokeStyle = "#ccb390";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 648, 335);
    ctx.fillStyle = "#985c60";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic 49px Georgia, serif";
    ctx.fillText("Sweetie", 340, 67);
    const note = String(d.card).trim().slice(0, 80);
    const fontSize = note.length > 24 ? 41 : note.length > 12 ? 48 : 55;
    ctx.font = fontSize + 'px "Songti SC","STSong",Georgia,serif';
    const lines = [];
    let line = "";
    for (const char of note) {
      if (line && ctx.measureText(line + char).width > 558) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
    if (line) lines.push(line);
    ctx.fillStyle = "#634942";
    const spacing = Math.min(fontSize * 1.3, 200 / Math.max(1, lines.length));
    lines.forEach((line, i) =>
      ctx.fillText(
        line,
        340,
        208 + (i - (lines.length - 1) / 2) * spacing,
        585,
      ),
    );
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const print = add(
      group,
      new T.PlaneGeometry(width, depth),
      new T.MeshStandardMaterial({ map, roughness: 0.93 }),
      0,
      0.008,
      0,
    );
    print.rotation.x = -Math.PI / 2;
    print.castShadow = false;
    print.userData.ownMat = true;
    stock.receiveShadow = true;
    return group;
  }

  if (!d.box || d.box === "none") {
    if (d.card) {
      const width = Math.max(0.69, r * 0.54),
        depth = width * 0.54,
        tilt = 1.1;
      const tent = new T.Group(),
        note = greeting(tent, width);
      tent.position.set(
        r * 0.98,
        floorY + 0.009 + (depth * Math.sin(tilt)) / 2,
        r * 0.37,
      );
      tent.rotation.y = 0.24;
      note.rotation.x = tilt;
      const back = add(
        tent,
        new T.BoxGeometry(width, 0.012, depth),
        material("#eddbbd", "matte"),
        0,
        0,
        -depth * Math.cos(tilt),
      );
      back.rotation.x = -tilt;
      g.add(tent);
    }
    if (d.sticker) {
      add(
        g,
        new T.CylinderGeometry(0.15, 0.15, 0.009, 36),
        material("#d99ca7", "matte"),
        0,
        -0.021,
        r * 0.88,
      );
      labelPlane(
        g,
        "Sweetie",
        "#733e49",
        0,
        -0.014,
        r * 0.88,
        0.27,
        "cream",
        false,
      );
    }
    return;
  }

  // Include high candles and large side pieces, using precisely their placement transform.
  const contents = new T.Box3(v(-r, -0.075, -r), v(r, geo.height, r));
  const partBounds = new T.Box3();
  for (const item of d.items || []) {
    if (!item.point || !item.type) continue;
    const placement = anchor(d, geo, item);
    for (const part of stamp(item.type, item.color)) {
      if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
      contents.union(
        partBounds.copy(part.geometry.boundingBox).applyMatrix4(placement),
      );
    }
  }
  if (d.textPlacement === "pick" && d.text?.trim()) {
    const sign = new T.Group();
    makeCakeLettering(sign, d, geo, radiusAt);
    contents.union(partBounds.setFromObject(sign));
    disposeGroup(sign);
  }
  const bottom =
    d.box === "paper"
      ? floorY + 0.006
      : Math.min(-0.085, contents.min.y - 0.01);
  const half = Math.max(
    r * 1.045,
    Math.abs(contents.min.x) + 0.055,
    Math.abs(contents.max.x) + 0.055,
    Math.abs(contents.min.z) + 0.055,
    Math.abs(contents.max.z) + 0.055,
  );
  const w = 2 * half;
  const top = Math.max(geo.height + 0.51, contents.max.y + 0.135);
  const height = top - bottom,
    lidDepth = Math.min(0.225, Math.max(0.135, height * 0.135));
  const rimY = top - lidDepth;
  const clear = d.box === "clear",
    overhang = clear ? 0.01 : 0.027,
    outer = half + overhang;

  function slab(halfWidth, low, high, mat) {
    const bevel = Math.min(0.009, (high - low) * 0.19),
      q = halfWidth - bevel,
      corner = 0.026;
    const shape = new T.Shape();
    shape.moveTo(-q + corner, -q);
    shape.lineTo(q - corner, -q);
    shape.quadraticCurveTo(q, -q, q, -q + corner);
    shape.lineTo(q, q - corner);
    shape.quadraticCurveTo(q, q, q - corner, q);
    shape.lineTo(-q + corner, q);
    shape.quadraticCurveTo(-q, q, -q, q - corner);
    shape.lineTo(-q, -q + corner);
    shape.quadraticCurveTo(-q, -q, -q + corner, -q);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: high - low - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 3,
    });
    geometry.rotateX(-Math.PI / 2);
    return add(g, geometry, mat, 0, low + bevel, 0);
  }

  if (clear) {
    const glass = new T.MeshPhysicalMaterial({
      color: "#e8eee5",
      transparent: true,
      opacity: 0.071,
      roughness: 0.24,
      depthWrite: false,
      side: T.DoubleSide,
    });
    const shell = add(
      g,
      new T.BoxGeometry(w, height, w),
      glass,
      0,
      bottom + height / 2,
      0,
    );
    shell.userData.localMat = true;
    shell.castShadow = shell.receiveShadow = false;
    const edge = material("#e2d1b4", "matte");
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        add(
          g,
          new T.BoxGeometry(0.018, height, 0.018),
          edge,
          half * a,
          bottom + height / 2,
          half * b,
        );
    for (const yy of [bottom, top])
      for (const sign of [-1, 1]) {
        add(
          g,
          new T.BoxGeometry(w + 0.018, 0.023, 0.022),
          edge,
          0,
          yy,
          half * sign,
        );
        add(
          g,
          new T.BoxGeometry(0.022, 0.023, w + 0.018),
          edge,
          half * sign,
          yy,
          0,
        );
      }
  } else {
    // Matte coated board has a fine tooth and closed, slightly softened folded edges.
    function stock(color) {
      return new T.MeshStandardMaterial({
        color,
        roughness: 0.91,
        bumpMap: pastryTexture("fine"),
        bumpScale: 0.0023,
      });
    }
    const body = slab(half, bottom, top - 0.028, stock("#eed5be"));
    const lid = slab(outer, rimY, top, stock("#f7ddcd"));
    body.userData.localMat = lid.userData.localMat = true;
    slab(
      outer - 0.003,
      rimY - 0.009,
      rimY + 0.007,
      material("#c49d87", "matte"),
    );
    slab(half + 0.004, bottom, bottom + 0.027, material("#d1b19b", "matte"));
    // Restrained one-colour letterpress on the side panel leaves the seal optional.
    const panel = document.createElement("canvas");
    panel.width = 480;
    panel.height = 240;
    const ink = panel.getContext("2d");
    ink.strokeStyle = "#a98873";
    ink.fillStyle = "#a98873";
    ink.lineWidth = 3;
    ink.lineCap = "round";
    ink.beginPath();
    ink.moveTo(215, 94);
    ink.bezierCurveTo(225, 62, 251, 58, 255, 35);
    ink.moveTo(263, 99);
    ink.quadraticCurveTo(268, 65, 255, 35);
    ink.moveTo(255, 35);
    ink.quadraticCurveTo(273, 26, 293, 37);
    ink.quadraticCurveTo(274, 48, 255, 35);
    ink.stroke();
    for (const [x, y] of [
      [212, 103],
      [261, 111],
    ]) {
      ink.beginPath();
      ink.ellipse(x, y, 17, 16, -0.28, 0, TAU);
      ink.stroke();
      ink.beginPath();
      ink.arc(x - 3, y - 2, 7, Math.PI, Math.PI * 1.43);
      ink.stroke();
    }
    ink.textAlign = "center";
    ink.textBaseline = "middle";
    ink.font = "italic 76px Georgia,serif";
    ink.fillText("Sweetie", 240, 177);
    const map = new T.CanvasTexture(panel);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const imprint = add(
      g,
      new T.PlaneGeometry(w * 0.39, w * 0.195),
      new T.MeshStandardMaterial({
        map,
        transparent: true,
        depthWrite: false,
        roughness: 0.9,
      }),
      half + 0.0018,
      bottom + (rimY - bottom) * 0.5,
      w * 0.075,
    );
    imprint.rotation.y = Math.PI / 2;
    imprint.castShadow = false;
    imprint.userData.ownMat = true;
  }

  const ribbonColor = d.ribbon || "#bc7e8a";
  const satin = new T.MeshPhysicalMaterial({
    color: ribbonColor,
    roughness: 0.39,
    side: T.DoubleSide,
    sheen: 0.76,
    sheenColor: new T.Color(ribbonColor).lerp(new T.Color("#fff0de"), 0.31),
    sheenRoughness: 0.46,
    vertexColors: true,
  });
  const band = Math.min(0.26, Math.max(0.119, w * 0.049)),
    knotX = -w * 0.15,
    knotZ = -w * 0.105;
  // Each ribbon is a softly crowned woven strip with darker finished selvedges.
  function strip(parent, rows, sample) {
    const pos = [],
      tint = [],
      ix = [],
      across = 6;
    for (let i = 0; i <= rows; i++)
      for (let j = 0; j <= across; j++) {
        const u = (j / across) * 2 - 1,
          p = sample(i / rows, u);
        pos.push(p.x, p.y, p.z);
        const c =
          0.88 +
          0.12 * Math.cos((u * Math.PI) / 2) +
          (j === 1 || j === across - 1 ? 0.045 : 0);
        tint.push(c, c, c);
        if (i === rows || j === across) continue;
        const a = i * (across + 1) + j,
          b = a + across + 1;
        ix.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geometry.setAttribute("color", new T.Float32BufferAttribute(tint, 3));
    geometry.setIndex(ix);
    geometry.computeVertexNormals();
    return add(parent, geometry, satin);
  }
  for (let cross = 0; cross < 2; cross++) {
    const bandY = top + 0.005 + cross * 0.007,
      low = bottom - 0.002;
    const run = [
      [-half - 0.005, low],
      [-half - 0.005, rimY - 0.052],
      [-outer - 0.005, rimY],
      [-outer - 0.005, top - 0.009],
      [-outer + 0.006, bandY],
      [outer - 0.006, bandY],
      [outer + 0.005, top - 0.009],
      [outer + 0.005, rimY],
      [half + 0.005, rimY - 0.052],
      [half + 0.005, low],
    ];
    const belt = strip(g, run.length - 1, (t, u) => {
      const [l, y] = run[Math.round(t * (run.length - 1))],
        p = u * band * 0.5;
      return cross ? v(l, y, knotZ + p) : v(knotX + p, y, l);
    });
    if (!cross) belt.userData.localMat = true;
  }
  const bow = new T.Group();
  bow.position.set(knotX, top + 0.023, knotZ);
  bow.rotation.y = -0.18;
  g.add(bow);
  for (const sign of [-1, 1]) {
    strip(bow, 40, (t, u) => {
      const s = Math.sin(t * Math.PI),
        k = Math.sin(t * TAU),
        left = sign < 0;
      const width = band * (0.42 + 0.68 * s),
        edge = u * width * 0.5;
      return v(
        sign * w * (0.004 + (left ? 0.173 : 0.153) * s),
        w * (0.013 + 0.069 * s - 0.037 * k) +
          edge * (0.16 + 0.46 * k) +
          0.009 * (1 - u * u),
        w * ((left ? 0.041 : 0.033) * k + 0.009 * t) + edge,
      );
    });
    strip(bow, 29, (t0, u) => {
      const t = t0 - 0.11 * (1 - Math.abs(u)) * Math.max(0, (t0 - 0.89) / 0.11);
      const edge = u * band * (0.33 + 0.15 * t);
      return v(
        sign * w * (0.016 + 0.119 * t + 0.026 * Math.sin(4.1 * t)) +
          edge * 0.78,
        0.009 +
          w * (0.038 * Math.sin(Math.PI * t) ** 2 + 0.012 * (1 - t)) +
          0.006 * (1 - u * u),
        w * (0.012 + (sign < 0 ? 0.172 : 0.115) * t) - sign * edge * 0.55,
      );
    });
  }
  const knot = add(
    bow,
    new T.SphereGeometry(1, 20, 11),
    material(ribbonColor, "ribbon"),
    0,
    w * 0.027,
    0,
  );
  knot.scale.set(band * 0.49, band * 0.45, band * 0.58);
  knot.rotation.z = -0.22;

  if (d.card) {
    const note = greeting(g, w * 0.36);
    note.position.set(w * 0.16, top + 0.017, w * 0.073);
    note.rotation.y = -0.19;
    note.updateMatrix();
    const hole = v(-w * 0.141, 0.011, -w * 0.06).applyMatrix4(note.matrix);
    const tie = new T.CatmullRomCurve3([
      v(knotX + 0.01, top + 0.04, knotZ),
      v(-w * 0.067, top + 0.033, -w * 0.13),
      v(-w * 0.003, top + 0.033, -w * 0.067),
      hole,
    ]);
    add(
      g,
      new T.TubeGeometry(tie, 24, 0.005, 5, false),
      material("#b3956c", "matte"),
    );
    const eyelet = add(
      g,
      new T.TorusGeometry(0.015, 0.003, 5, 16),
      material("#bc9f73", "gold"),
      hole.x,
      hole.y,
      hole.z,
    );
    eyelet.rotation.x = -Math.PI / 2;
  }
  if (d.sticker) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 384;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e8b7b5";
    ctx.beginPath();
    for (let j = 0; j <= 240; j++) {
      const a = (j * TAU) / 240,
        rr = 180 + 4 * Math.cos(24 * a);
      const x = 192 + rr * Math.cos(a),
        y = 192 + rr * Math.sin(a);
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ab7575";
    ctx.lineWidth = 3;
    for (const rad of [157, 163]) {
      ctx.beginPath();
      ctx.arc(192, 192, rad, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = "#844f54";
    ctx.font = "italic 83px Georgia,serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sweetie", 192, 195);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const sealSize = Math.min(0.59, w * 0.157),
      mid = clear ? top - lidDepth - sealSize * 0.22 : rimY - sealSize * 0.15;
    const sealGeometry = new T.PlaneGeometry(sealSize, sealSize, 1, 24);
    const p = sealGeometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const yy = mid + p.getY(i);
      const edge = clear
        ? 0
        : overhang * limit((yy - rimY + 0.046) / 0.044, 0, 1);
      p.setZ(i, edge);
    }
    sealGeometry.computeVertexNormals();
    const seal = add(
      g,
      sealGeometry,
      new T.MeshStandardMaterial({ map, alphaTest: 0.45, roughness: 0.91 }),
      w * 0.13,
      mid,
      half + 0.007,
    );
    seal.castShadow = false;
    seal.userData.ownMat = true;
  }
  g.userData.packageBounds = {
    halfSide: outer + 0.014,
    top: top + w * 0.114 + 0.025,
    bottom: bottom - (clear ? 0.012 : 0.003),
  };
}

const up = v(0, 1, 0),
  solver = new T.Object3D();
function anchor(d, geo, item) {
  const p = item.point || {},
    theta = Math.atan2(p.z || 0, p.x || 0),
    rd = radiusAt(d.shape, theta),
    y = limit(p.y ?? 1, 0, 1) * geo.height;
  let x = (p.x || 0) * geo.topRadius,
    z = (p.z || 0) * geo.topRadius;
  const normal = v(p.nx ?? 0, p.ny ?? 1, p.nz ?? 0);
  if (normal.lengthSq() < 0.01) normal.copy(up);
  normal.normalize();
  let surfaceY = y;
  if (normal.y > 0.55) {
    let tier = geo.tiers.reduce(
      (best, t) =>
        Math.abs(t.y + t.h - y) < Math.abs(best.y + best.h - y) ? t : best,
      geo.tiers[0],
    );
    const maxRadius = tier.radius * rd * 0.997,
      r = Math.hypot(x, z);
    if (r > maxRadius) {
      x *= maxRadius / r;
      z *= maxRadius / r;
    }
    for (const t of geo.tiers) {
      if (t.y > tier.y && Math.hypot(x, z) < t.radius * rd) tier = t;
    }
    surfaceY =
      tier.y +
      tier.h +
      (Number(d.coverage) > 0 ? (d.finish === "drip" ? 0.025 : 0.013) : 0.001);
    if (item.restsOn) {
      const pedestal = d.items?.find(
        (other) => other.id === item.restsOn && other.type === "pipe-kiss",
      );
      const q = pedestal?.point;
      if (
        q &&
        (q.ny ?? 1) > 0.55 &&
        Math.abs((q.y ?? 1) - (p.y ?? 1)) < 0.04 &&
        Math.hypot((q.x || 0) - (p.x || 0), (q.z || 0) - (p.z || 0)) < 0.095
      ) {
        surfaceY += 0.105 * (Number(pedestal.scale) || 1) * 1.27;
      }
    }
    normal.copy(up);
  } else {
    const tier =
      geo.tiers.find((t) => y <= t.y + t.h + 0.0001) || geo.tiers.at(-1);
    const r = tier.radius * rd + (d.coverage > 0.01 ? 0.009 : 0);
    x = r * Math.cos(theta);
    z = r * Math.sin(theta);
    // Shape changes can move the local outward normal. Recover it from the
    // radial boundary so an existing side decoration follows the new surface.
    const e = 0.002,
      p1 = radiusAt(d.shape, theta - e),
      p2 = radiusAt(d.shape, theta + e);
    const tx = p2 * Math.cos(theta + e) - p1 * Math.cos(theta - e),
      tz = p2 * Math.sin(theta + e) - p1 * Math.sin(theta - e);
    normal.set(tz, 0, -tx).normalize();
  }
  solver.position.set(x, surfaceY, z);
  solver.quaternion.identity();
  if (
    (normal.y < 0.55 &&
      [
        "bow",
        "lace",
        "crown",
        "heart",
        "chocolate",
        "star",
        "moon",
        "butterfly",
        "pipe-hem",
        "pipe-scallop",
        "satin-bow",
        "number",
      ].includes(item.type)) ||
    (normal.y < 0.55 && /^number-[0-9]$/.test(item.type))
  ) {
    solver.rotation.y = Math.atan2(normal.x, normal.z);
    solver.rotateZ(Number(item.rotation) || 0);
    solver.position.addScaledVector(normal, 0.013);
  } else {
    solver.quaternion.setFromUnitVectors(up, normal);
    solver.rotateY(Number(item.rotation) || 0);
  }
  const s = limit(Number(item.scale) || 1, 0.12, 6) * 1.27;
  solver.scale.setScalar(s);
  solver.updateMatrix();
  return solver.matrix.clone();
}

let contactDisk;
function garnishContact() {
  if (contactDisk) return contactDisk;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(64,32,20,.27)");
  grad.addColorStop(0.28, "rgba(75,43,31,.18)");
  grad.addColorStop(0.68, "rgba(84,53,42,.07)");
  grad.addColorStop(1, "rgba(94,65,48,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const disk = new T.PlaneGeometry(1, 1);
  disk.rotateX(-Math.PI / 2);
  contactDisk = { geometry: disk, material: mat };
  return contactDisk;
}
function stampBatches(g, d, geo, cut) {
  // A material/geometry pair is drawn once even when dozens of stamps share it.
  const batches = new Map(),
    shadows = [];
  const plan = cut ? cutPlan(d) : null;
  const cutAngle = (a) => {
    const o = outline(d.shape, a);
    return Math.atan2(o.z, o.x);
  };
  const gapFrom = cut ? cutAngle(plan.end) : 0,
    gapTo = cut ? cutAngle(plan.start) : 0;
  for (const item of d.items || []) {
    if (!item.type || !item.point) continue;
    const angle = (Math.atan2(item.point.z, item.point.x) + TAU) % TAU;
    if (cut && (angle - gapFrom + TAU) % TAU < (gapTo - gapFrom + TAU) % TAU)
      continue;
    const matrix = anchor(d, geo, item);
    if (
      (item.point.ny ?? 1) > 0.8 &&
      !["gold", "sugar", "coconut"].includes(item.type)
    ) {
      const coef =
        {
          cherry: 0.235,
          strawberry: 0.24,
          blueberry: 0.17,
          pearl: 0.065,
          bow: 0.32,
          "pipe-shell": 0.22,
          "pipe-star": 0.25,
          rose: 0.24,
        }[item.type] ?? 0.19;
      const shadow = matrix
        .clone()
        .multiply(new T.Matrix4().makeScale(coef, 1, coef));
      shadow.elements[13] += 0.0025;
      shadows.push(shadow);
    }
    for (const part of stamp(item.type, item.color)) {
      if (!batches.has(part)) batches.set(part, []);
      batches.get(part).push({ matrix, id: item.id });
    }
  }
  if (shadows.length) {
    const disk = garnishContact(),
      m = new T.InstancedMesh(disk.geometry, disk.material, shadows.length);
    shadows.forEach((matrix, i) => m.setMatrixAt(i, matrix));
    m.instanceMatrix.needsUpdate = true;
    m.renderOrder = 1;
    m.raycast = () => {};
    m.computeBoundingSphere();
    g.add(m);
  }
  for (const [part, entries] of batches) {
    const instance = new T.InstancedMesh(
      part.geometry,
      part.material,
      entries.length,
    );
    instance.castShadow = true;
    instance.receiveShadow = true;
    instance.userData.ids = entries.map((e) => e.id);
    entries.forEach((e, i) => instance.setMatrixAt(i, e.matrix));
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
    g.add(instance);
  }
}
function clearBatches(g) {
  for (const obj of g.children) obj.dispose?.();
  g.clear();
}

function lighting(scene) {
  scene.add(new T.HemisphereLight("#fff9ef", "#bc9785", 1.19));
  const sun = new T.DirectionalLight("#fff4df", 2.18);
  sun.position.set(-3.8, 7.1, 4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = cam.bottom = -4.5;
  cam.right = cam.top = 4.5;
  cam.near = 0.1;
  cam.far = 20;
  sun.shadow.normalBias = 0.009;
  sun.shadow.bias = -0.0002;
  sun.shadow.radius = 4.7;
  sun.shadow.blurSamples = 8;
  scene.add(sun);
  const fill = new T.DirectionalLight("#fff7f4", 0.39);
  fill.position.set(3, 3, -3.7);
  scene.add(fill);
  return sun;
}

function studioEnv(renderer) {
  const cn = document.createElement("canvas");
  cn.width = 256;
  cn.height = 128;
  const ctx = cn.getContext("2d"),
    gr = ctx.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#f5e8d6");
  gr.addColorStop(0.38, "#bcb2a7");
  gr.addColorStop(0.6, "#a49283");
  gr.addColorStop(1, "#e0c8af");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(31, 13, 40, 49);
  ctx.fillRect(76, 13, 38, 49);
  ctx.fillRect(31, 67, 40, 23);
  ctx.fillRect(76, 67, 38, 23);
  const t = new T.CanvasTexture(cn);
  t.mapping = T.EquirectangularReflectionMapping;
  t.colorSpace = T.SRGBColorSpace;
  const pmrem = new T.PMREMGenerator(renderer),
    target = pmrem.fromEquirectangular(t);
  t.dispose();
  pmrem.dispose();
  return target;
}

let tableTexture;
function mapleTexture() {
  if (tableTexture) return tableTexture;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d"),
    pixels = ctx.createImageData(c.width, c.height);
  let seed = 3502;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const dx = (x / c.width) * TAU,
        dy = (y / c.height) * TAU;
      const grain =
        dy * 26 +
        0.85 * Math.sin(dx) +
        1.25 * Math.sin(dy * 3 + Math.sin(dx)) +
        0.35 * Math.sin(dx * 3 + dy * 4);
      const faint = 0.5 + 0.5 * Math.sin(grain);
      const f =
        244 +
        4 * Math.sin(dy * 3 + Math.sin(dx)) -
        8 * faint ** 9 -
        5 * (0.5 + 0.5 * Math.cos(3 * grain)) ** 15 +
        4 * (seed / 4294967296 - 0.5);
      const i = (y * c.width + x) * 4;
      pixels.data[i] = f + 3;
      pixels.data[i + 1] = f + 1;
      pixels.data[i + 2] = f - 2;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  tableTexture = new T.CanvasTexture(c);
  tableTexture.colorSpace = T.SRGBColorSpace;
  tableTexture.wrapS = tableTexture.wrapT = T.RepeatWrapping;
  tableTexture.repeat.set(11, 15);
  tableTexture.anisotropy = 4;
  return tableTexture;
}

function contact(scene, rad, x = 0, z = 0) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"),
    grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(84,54,38,.32)");
  grad.addColorStop(0.48, "rgba(99,67,47,.19)");
  grad.addColorStop(0.79, "rgba(111,73,48,.042)");
  grad.addColorStop(1, "rgba(111,73,48,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const m = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  });
  const o = new T.Mesh(new T.PlaneGeometry(rad * 2.8, rad * 2.4), m);
  o.position.set(x, floorY + 0.003, z);
  o.rotation.x = -Math.PI / 2;
  scene.add(o);
  return o;
}

function setRenderer(renderer) {
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.99;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.VSMShadowMap;
}

export function createViewport(host, callbacks = {}) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: !!callbacks.photographic,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  setRenderer(renderer);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "display:block;width:100%;height:100%;touch-action:none;outline:none";
  canvas.setAttribute("aria-label", "可交互的三维蛋糕转台");
  canvas.tabIndex = 0;
  host.append(canvas);
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.05, 70);
  const env = studioEnv(renderer);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.38;
  const sun = lighting(scene),
    floorMat = new T.MeshStandardMaterial({
      color: "#ddcbbb",
      map: mapleTexture(),
      roughness: 0.93,
      metalness: 0,
    });
  const floor = add(
    scene,
    new T.PlaneGeometry(130, 130),
    floorMat,
    0,
    floorY,
    0,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  scene.background = new T.Color("#d1b9a5");
  scene.fog = new T.FogExp2("#d1b9a5", 0.014);
  const shadow = contact(scene, 0.95);
  const photographic = !!callbacks.photographic;
  let backdrop = null;
  if (photographic) {
    scene.background = null;
    scene.fog = null;
    floor.visible = false;
    shadow.position.y = callbacks.photoMode ? floorY + 0.002 : -0.0008;
    backdrop = new T.TextureLoader().load(
      "./assets/scenes/" +
        (callbacks.photoMode ? "photography" : "workshop") +
        ".webp",
      () => request(),
    );
    backdrop.colorSpace = T.SRGBColorSpace;
    scene.background = backdrop;
  }
  const base = new T.Group(),
    cake = new T.Group(),
    deco = new T.Group(),
    pack = new T.Group(),
    letters = new T.Group(),
    props = new T.Group();
  const outerCoat = new T.Group(),
    innerCoat = new T.Group(),
    fruit = new T.Group(),
    handKnife = handPaletteKnife();
  const outerPainter = new CreamPainter(outerCoat),
    fillingPainter = new CreamPainter(innerCoat),
    fruitLocations = new Map();
  let brush = { width: 0.32, action: "spread", color: null },
    fruitKey = "",
    knifeSample = null;
  scene.add(
    base,
    cake,
    deco,
    pack,
    letters,
    props,
    outerCoat,
    innerCoat,
    fruit,
    handKnife,
  );
  props.visible = false;
  let d = null,
    geometry = null,
    surfaces = [],
    cut = false,
    assembly = null,
    showProps = false,
    auto = false,
    mode = "orbit",
    destroyed = false,
    dirty = true;
  let spreadView = false,
    letterView = false,
    showPackaging = true,
    lastLetterPaint = null;
  let yaw = 0.49,
    elevation = 0.47,
    magnify = 1,
    velYaw = 0,
    velElev = 0,
    aspect = 1,
    raf = 0,
    prevTime = 0;
  let meshKey = "",
    itemKey = "",
    packKey = "",
    textKey = "",
    plateKey = "",
    propsKey = "";
  const raycaster = new T.Raycaster(),
    pointer = new T.Vector2(),
    normalMatrix = new T.Matrix3();
  const active = new Map();
  let gesture = null,
    pinchStart = null,
    pinchZoom = 1;
  const cameraTarget = new T.Vector3(),
    cameraOffset = new T.Vector3();
  const arriving = [],
    animatedMatrix = new T.Matrix4(),
    animatedScale = new T.Vector3();
  function animatePlacement(ids) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const order = new Map(
      (Array.isArray(ids) ? ids : [ids]).map((id, i) => [id, i]),
    );
    const start = performance.now();
    for (const mesh of deco.children) {
      mesh.userData.ids?.forEach((id, index) => {
        if (!order.has(id)) return;
        const final = new T.Matrix4();
        mesh.getMatrixAt(index, final);
        const type = d.items.find((item) => item.id === id)?.type || "";
        arriving.push({
          mesh,
          index,
          final,
          start: start + Math.min(420, order.get(id) * 10),
          sprinkle: ["sugar", "coconut", "gold"].includes(type),
          pipe: type.startsWith("pipe-"),
        });
      });
    }
    request();
  }
  function advanceArrivals(now) {
    for (let i = arriving.length - 1; i >= 0; i--) {
      const a = arriving[i];
      if (a.mesh.parent !== deco) {
        arriving.splice(i, 1);
        continue;
      }
      const t = limit((now - a.start) / (a.pipe ? 225 : 340), 0, 1);
      const grow = a.pipe
        ? 0.12 + 0.88 * (1 - (1 - t) ** 3)
        : 1 + 0.07 * Math.sin(t * Math.PI * 2) * (1 - t);
      animatedScale.set(grow, grow, grow);
      animatedMatrix.copy(a.final).scale(animatedScale);
      if (!a.pipe)
        animatedMatrix.elements[13] += (a.sprinkle ? 0.32 : 0.1) * (1 - t) ** 2;
      a.mesh.setMatrixAt(a.index, animatedMatrix);
      a.mesh.instanceMatrix.needsUpdate = true;
      if (t === 1) arriving.splice(i, 1);
      dirty = true;
    }
  }

  function updateProjection() {
    if (!geometry) return;
    const t = geometry;
    // Horizontal fitting is independent of the host's aspect ratio, so a narrow
    // mobile panel can still show the whole stand and the highest garnish.
    const boxed = showPackaging && !assembly && d.box && d.box !== "none";
    const openTier = assembly
      ? t.tiers[Math.min(assembly.tier, t.tiers.length - 1)]
      : null;
    const activeHeight = openTier ? openTier.y + openTier.h * 0.53 : t.height;
    const extent = t.baseBoard * 2.31;
    let desiredHeight = Math.max(
      (activeHeight + 0.5 - floorY) * 1.3,
      extent * 0.83,
      extent / aspect,
    );
    let focusY = (activeHeight + 0.26 + floorY) * 0.5 + 0.07;
    if (spreadView && openTier) {
      focusY = openTier.y + openTier.h * 0.45;
      desiredHeight = Math.max(
        (openTier.radius * 2.45) / aspect,
        openTier.radius * 2.31,
      );
    }
    if (letterView && !openTier && !boxed) {
      const radius = t.topRadius;
      focusY = t.height + (d.textPlacement === "pick" ? radius * 0.32 : 0);
      desiredHeight = Math.max((radius * 2.4) / aspect, radius * 2.25);
    }
    if (boxed) {
      const bounds = pack.userData.packageBounds;
      const top = bounds?.top ?? t.height + 1.12,
        bottom = Math.min(floorY, bounds?.bottom ?? floorY),
        halfSide = bounds?.halfSide ?? t.baseBoard * 1.074;
      focusY = (top + bottom) * 0.5;
      // Project the eight package corners onto the current right/up axes.
      // Their rectangular bounds change with yaw, elevation and viewport aspect.
      const halfSpan =
        halfSide * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
      const halfVertical =
        (top - bottom) * 0.5 * Math.cos(elevation) +
        halfSpan * Math.sin(elevation);
      desiredHeight = Math.max((halfSpan * 2) / aspect, halfVertical * 2) * 1.1;
    }
    if (photographic) {
      const width = t.radius;
      const fraction = callbacks.photoMode ? 0.31 : 0.315;
      desiredHeight = Math.max(
        (2 * width) / (fraction * aspect),
        (activeHeight + 0.42) * 2.45,
      );
      focusY = callbacks.photoMode ? 0.04 : -0.04;
      if (boxed) desiredHeight *= 1.16;
    }
    const h = desiredHeight / (2 * magnify),
      w = h * aspect;
    camera.left = -w;
    camera.right = w;
    camera.top = h;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
    props.rotation.y = yaw;
    cameraTarget.set(0, focusY, 0);
    const dist = 9 + t.baseBoard;
    cameraOffset
      .set(
        Math.sin(yaw) * Math.cos(elevation),
        Math.sin(elevation),
        Math.cos(yaw) * Math.cos(elevation),
      )
      .multiplyScalar(dist);
    camera.position.copy(cameraTarget).add(cameraOffset);
    camera.lookAt(cameraTarget);
    camera.updateMatrixWorld(true);
  }
  function render() {
    if (destroyed || !geometry) return;
    updateProjection();
    renderer.render(scene, camera);
    dirty = false;
    callbacks.onViewChange?.();
  }
  function tick(time) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min((time - prevTime) / 1000 || 1 / 60, 0.04);
    prevTime = time;
    const spinning = auto && !active.size,
      moving = Math.abs(velYaw) + Math.abs(velElev) > 0.00004;
    if (spinning) {
      yaw += dt * 0.24;
      dirty = true;
    }
    if (moving && !active.size) {
      yaw += velYaw * dt * 42;
      elevation = limit(elevation + velElev * dt * 42, 0.1, 1.49);
      const decay = Math.exp(-dt * 9.5);
      velYaw *= decay;
      velElev *= decay;
      dirty = true;
    }
    if (arriving.length) advanceArrivals(time);
    if (dirty) render();
    if (spinning || moving || arriving.length)
      raf = requestAnimationFrame(tick);
  }
  function request() {
    dirty = true;
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  }
  function resize() {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    aspect = w / h;
    renderer.setSize(w, h, false);
    request();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  function updateDesign(design) {
    if (destroyed) return;
    d = { ...defaults, ...design };
    geometry = dims(d);
    if (assembly)
      assembly.tier = limit(assembly.tier | 0, 0, geometry.tiers.length - 1);
    const mk = JSON.stringify([
      d.shape,
      d.size,
      d.height,
      d.heightRatio,
      d.layers,
      d.flavor,
      d.layerFlavors,
      d.fillingBaseColors,
      d.fillingPaint?.map((p, i) =>
        assembly && i >= assembly.tier ? null : p,
      ),
      d.fillingCoverage?.map((p, i) =>
        assembly && i >= assembly.tier ? null : p,
      ),
      d.fillings,
      cut && !assembly ? d.fillingPieces : null,
      d.finish,
      d.color,
      d.color2,
      d.color3,
      d.creamPaint?.base ?? d.coverage,
      cut,
      assembly
        ? [
            assembly.tier,
            d.fillingPaint?.[assembly.tier]?.base ?? assembly.progress,
            assembly.filling,
          ]
        : null,
    ]);
    const structure = [d.shape, d.size, d.height, d.heightRatio, d.layers];
    if (mk !== meshKey) {
      meshKey = mk;
      disposeGroup(cake);
      surfaces = buildCake(cake, d, cut && !assembly, geometry, assembly);
    }
    const paintSpace = {
      shape: d.shape,
      tiers: geometry.tiers,
      outline,
      radiusAt,
    };
    outerPainter.synchronize(
      {
        ...paintSpace,
        scope: "outer",
        color: d.color,
        color2: d.color2,
        color3: d.color3,
        finish: d.finish,
        cut: cut && !assembly ? cutPlan(d) : null,
        stopAt: assembly?.tier,
      },
      d.creamPaint,
    );
    fillingPainter.synchronize(
      assembly
        ? {
            ...paintSpace,
            scope: "filling",
            tier: assembly.tier,
            color:
              d.fillingBaseColors?.[assembly.tier] ||
              fillingPigment(assembly.filling || d.fillings?.[assembly.tier]),
            finish: "smooth",
          }
        : null,
      assembly ? d.fillingPaint?.[assembly.tier] : null,
    );
    const fk = assembly
      ? JSON.stringify([
          structure,
          assembly.tier,
          assembly.filling,
          d.fillingPaint?.[assembly.tier]?.strokes?.length,
          assembly.progress,
          assembly.fruitPoints ?? d.fillingPieces?.[assembly.tier],
        ])
      : "off";
    if (fk !== fruitKey) {
      fruitKey = fk;
      clearBatches(fruit);
      fillingFruits(
        fruit,
        d,
        geometry,
        assembly,
        fillingPainter,
        fruitLocations,
      );
    }
    const bk = JSON.stringify([d.board, d.shape, d.size]);
    if (bk !== plateKey) {
      plateKey = bk;
      disposeGroup(base);
      if (!photographic || callbacks.photoMode) pedestal(base, d, geometry);
      else if (d.board !== "ivory") {
        pedestal(base, d, geometry);
        base.children.slice(1).forEach((part) => (part.visible = false));
      }
      if (photographic) shadow.scale.setScalar(geometry.baseBoard * 0.75);
      shadow.scale.setScalar(geometry.baseBoard / 1.5);
    }
    if (showProps && propsKey !== bk) {
      propsKey = bk;
      disposeGroup(props);
      studioTools(props, geometry);
    }
    deco.visible = letters.visible = !assembly;
    pack.visible = !assembly && showPackaging;
    const ik = JSON.stringify([
      structure,
      d.items,
      Number(d.coverage) > 0,
      d.finish === "drip",
      cut,
      cut ? d.fillingPieces : null,
    ]);
    if (ik !== itemKey) {
      itemKey = ik;
      clearBatches(deco);
      stampBatches(deco, d, geometry, cut);
    }
    const pk = JSON.stringify([
      structure,
      d.box,
      d.ribbon,
      d.card,
      d.sticker,
      d.box && d.box !== "none"
        ? [
            d.items,
            d.textPlacement === "pick"
              ? [
                  d.text,
                  d.textSize,
                  d.textX,
                  d.textZ,
                  d.textRotation,
                  d.textArc,
                  d.textStyle,
                ]
              : null,
          ]
        : null,
    ]);
    if (pk !== packKey) {
      packKey = pk;
      disposeGroup(pack);
      packaging(pack, d, geometry);
    }
    const tk = JSON.stringify([
      structure,
      d.text,
      d.letterName,
      d.letterDate,
      d.textColor,
      d.textStyle,
      d.textSize,
      d.textX,
      d.textZ,
      d.textArc,
      d.textPlacement,
      d.textRotation,
      d.textPosition,
      d.text &&
      !d.textRotation &&
      d.textPosition !== "manual" &&
      !d.textX &&
      !d.textZ
        ? d.items
        : null,
      d.finish === "drip",
      d.coverage > 0,
    ]);
    const rebuildText = tk !== textKey;
    if (rebuildText) {
      textKey = tk;
      disposeGroup(letters);
      const obstacles = [];
      if (
        d.text &&
        d.textPlacement !== "pick" &&
        d.textPosition !== "manual" &&
        !d.textX &&
        !d.textZ &&
        !d.textRotation
      ) {
        for (const item of d.items) {
          if ((item.point?.ny ?? 1) < 0.55) continue;
          const mat = anchor(d, geometry, item),
            bounds = new T.Box3();
          for (const part of stamp(item.type, item.color)) {
            if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
            bounds.union(part.geometry.boundingBox.clone().applyMatrix4(mat));
          }
          if (bounds.isEmpty() || bounds.max.y < geometry.height + 0.014)
            continue;
          bounds.expandByScalar(0.015 * geometry.topRadius);
          bounds.min.z -= (bounds.max.y - geometry.height) * 0.34;
          obstacles.push(bounds);
        }
      }
      makeCakeLettering(letters, d, geometry, radiusAt, obstacles);
    }
    if (rebuildText || d.creamPaint !== lastLetterPaint) {
      settleLettering(letters, d, geometry, outerPainter);
      lastLetterPaint = d.creamPaint;
    }
    request();
  }
  function hit(x, y, objects) {
    const b = canvas.getBoundingClientRect();
    pointer.set(
      ((x - b.left) / b.width) * 2 - 1,
      (-(y - b.top) / b.height) * 2 + 1,
    );
    updateProjection();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, false)[0] || null;
  }
  function surface(x, y) {
    const h = hit(x, y, surfaces);
    if (!h) return null;
    const normal = h.face.normal
      .clone()
      .applyNormalMatrix(normalMatrix.getNormalMatrix(h.object.matrixWorld));
    if (assembly && normal.y < 0.62) return null;
    const face = assembly || normal.y > 0.57 ? "top" : "side";
    let tier = assembly?.tier ?? 0;
    if (!assembly) {
      const sideRadius = Math.hypot(h.point.x, h.point.z),
        edge = radiusAt(d.shape, Math.atan2(h.point.z, h.point.x));
      const distance = (t) =>
        face === "top"
          ? Math.abs(t.y + t.h - h.point.y)
          : Math.abs(sideRadius - t.radius * edge) +
            4 * Math.max(t.y - h.point.y, h.point.y - t.y - t.h, 0);
      for (let i = 1; i < geometry.tiers.length; i++)
        if (distance(geometry.tiers[i]) < distance(geometry.tiers[tier]))
          tier = i;
    }
    const t = geometry.tiers[tier],
      radius = assembly ? t.radius : geometry.topRadius;
    const u =
      face === "top"
        ? (h.point.x / t.radius) * 0.5 + 0.5
        : (Math.atan2(h.point.z, h.point.x) / TAU + 1) % 1;
    const vv =
      face === "top"
        ? (h.point.z / t.radius) * 0.5 + 0.5
        : limit((h.point.y - t.y) / t.h, 0, 1);
    return {
      x: h.point.x / radius,
      y: assembly ? 1 : limit(h.point.y / geometry.height, 0, 1),
      z: h.point.z / radius,
      nx: normal.x,
      ny: normal.y,
      nz: normal.z,
      tier,
      face,
      u,
      v: vv,
    };
  }
  function worldAt(p) {
    const t = geometry.tiers[p.tier],
      rad = assembly ? t.radius : geometry.topRadius,
      n = v(p.nx, p.ny, p.nz).normalize();
    if (assembly) {
      const legacy =
        d.fillingPaint?.[assembly.tier]?.base ?? assembly.progress ?? 0;
      const edge =
        radiusAt(d.shape, Math.atan2(p.z, p.x)) * Math.sqrt(legacy) * 0.985;
      const base =
        legacy > 0 && Math.hypot(p.x, p.z) <= edge ? t.h * 0.155 * 0.72 : 0;
      const relief = fillingPainter.heightAt(p.tier, p.face, p.u, p.v);
      return v(
        p.x * rad,
        t.y + t.h * 0.4225 + Math.max(base, relief) + 0.006,
        p.z * rad,
      );
    }
    const point = v(p.x * rad, p.y * geometry.height, p.z * rad);
    const height = outerPainter.heightAt(p.tier, p.face, p.u, p.v);
    return point.addScaledVector(n, height + 0.005);
  }
  function knifeAt(p, dragging = false) {
    const previous = knifeSample;
    knifeSample = p;
    if (!p || mode !== "paint") {
      if (handKnife.visible) {
        handKnife.visible = false;
        request();
      }
      return;
    }
    const pos = worldAt(p),
      normal = v(p.nx, p.ny, p.nz).normalize(),
      right = v(1, 0, 0).applyQuaternion(camera.quaternion),
      rise = v(0, 1, 0).applyQuaternion(camera.quaternion);
    right.addScaledVector(rise, 0.3);
    right.addScaledVector(normal, -right.dot(normal));
    if (right.lengthSq() < 0.02)
      right.set(1, 0, 0).addScaledVector(normal, -normal.x);
    right.normalize();
    if (previous && dragging) {
      const tang = pos.clone().sub(worldAt(previous));
      tang.addScaledVector(normal, -tang.dot(normal));
      if (tang.lengthSq() > 1e-6) {
        tang.normalize();
        if (tang.dot(right) < 0) tang.negate();
        right.lerp(tang, 0.48).normalize();
      }
    }
    const transverse = right.clone().cross(normal).normalize();
    right.copy(normal).cross(transverse).normalize();
    handKnife.quaternion.setFromRotationMatrix(
      new T.Matrix4().makeBasis(right, normal, transverse),
    );
    handKnife.position
      .copy(pos)
      .addScaledVector(normal, dragging ? 0.001 : 0.013);
    handKnife.scale.set(
      1,
      1,
      limit((brush.width * geometry.tiers[p.tier].radius) / 0.23, 0.65, 2.4),
    );
    handKnife.userData.cream.color.set(
      brush.color ||
        (assembly
          ? d.fillingBaseColors?.[assembly.tier] ||
            fillingPigment(assembly.filling)
          : d.color),
    );
    handKnife.visible = true;
    request();
  }
  function strokeAt(p, from) {
    const painter = assembly ? fillingPainter : outerPainter,
      legacy = assembly ? assembly.progress : d.coverage;
    const change = painter.stroke(p, from, brush, legacy);
    if (change) {
      callbacks.onPaint?.(change);
      request();
    }
  }
  function pick(x, y) {
    const h = hit(x, y, assembly ? fruit.children : deco.children);
    if (!h) return null;
    const cakeHit = hit(x, y, surfaces);
    return cakeHit && cakeHit.distance < h.distance - 0.018
      ? null
      : (h.object.userData.ids?.[h.instanceId] ?? null);
  }
  function selectionScreenPoint(id) {
    if (!id) return null;
    let pos,
      worldRadius = 0.14;
    if (assembly) {
      const fruitPos = fruitLocations.get(id);
      if (fruitPos) pos = fruitPos.clone();
      const piece = (
        assembly.fruitPoints ??
        d.fillingPieces?.[assembly.tier] ??
        []
      ).find((p) => p.id === id);
      if (piece)
        worldRadius =
          0.9 *
          (Number(piece.scale) || 1) *
          stamp(piece.type || "strawberry").reduce(
            (mx, b) => Math.max(mx, b.geometry.boundingSphere?.radius || 0.11),
            0.06,
          );
    } else {
      const it = d.items?.find((x) => x.id === id);
      if (it?.point) {
        pos = new T.Vector3()
          .setFromMatrixPosition(anchor(d, geometry, it))
          .add(v(0, 0.08 * Number(it.scale || 1), 0));
        worldRadius =
          1.27 *
          (Number(it.scale) || 1) *
          stamp(it.type, it.color).reduce(
            (mx, b) => Math.max(mx, b.geometry.boundingSphere?.radius || 0.12),
            0.04,
          );
      }
    }
    if (!pos) return null;
    updateProjection();
    const ndc = pos.project(camera),
      rect = canvas.getBoundingClientRect(),
      x = (ndc.x + 1) * 0.5 * rect.width,
      y = (1 - ndc.y) * 0.5 * rect.height;
    return {
      x,
      y,
      radiusPx: Math.max(
        9,
        (worldRadius * rect.height) / (camera.top - camera.bottom),
      ),
      clientX: rect.left + x,
      clientY: rect.top + y,
      visible:
        ndc.z >= -1 &&
        ndc.z <= 1 &&
        Math.abs(ndc.x) <= 1 &&
        Math.abs(ndc.y) <= 1,
    };
  }
  function down(e) {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    velYaw = velElev = 0;
    if (active.size === 2) {
      const [a, b] = [...active.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      pinchZoom = magnify;
      if (gesture) gesture.cancel = true;
      return;
    }
    const p = surface(e.clientX, e.clientY);
    const id =
      mode === "move" || mode === "place" ? pick(e.clientX, e.clientY) : null;
    gesture = {
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      last: p,
      id,
      dragged: false,
      cancel: false,
    };
    if ((mode === "move" || mode === "place") && id) callbacks.onSelect?.(id);
    if (mode === "pipe" && p) callbacks.onPlace?.(p);
    if (mode === "paint" && p) {
      knifeAt(p, true);
      strokeAt(p, null);
    }
  }
  function move(e) {
    if (!active.has(e.pointerId)) {
      if (mode === "paint" && e.pointerType !== "touch")
        knifeAt(surface(e.clientX, e.clientY));
      return;
    }
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (active.size >= 2) {
      knifeAt(null);
      const [a, b] = [...active.values()];
      magnify = limit(
        (pinchZoom * Math.hypot(a.x - b.x, a.y - b.y)) / (pinchStart || 1),
        0.48,
        2.6,
      );
      request();
      return;
    }
    if (!gesture || gesture.cancel) return;
    const dx = e.clientX - gesture.x,
      dy = e.clientY - gesture.y;
    if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 3)
      gesture.dragged = true;
    if (
      mode === "orbit" ||
      (mode === "move" && !gesture.id) ||
      (mode === "place" && !gesture.id && gesture.dragged)
    ) {
      yaw -= dx * 0.009;
      elevation = limit(elevation + dy * 0.006, 0.1, 1.49);
      velYaw = -dx * 0.005;
      velElev = dy * 0.003;
      request();
    } else if (
      mode === "paint" ||
      mode === "pipe" ||
      ((mode === "move" || mode === "place") && gesture.id)
    ) {
      const p = surface(e.clientX, e.clientY);
      if (mode === "paint") knifeAt(p, true);
      if (!p && mode === "paint") gesture.last = null;
      if (p) {
        const a = gesture.last,
          dist = a ? Math.hypot(p.x - a.x, (p.y - a.y) * 0.68, p.z - a.z) : 1;
        const spacing =
          mode === "pipe"
            ? limit(Number(callbacks.spacing?.()) || 0.12, 0.025, 0.56)
            : mode === "paint"
              ? 0.012
              : 0.045;
        if (mode === "move" || (mode === "place" && gesture.id)) {
          if (gesture.dragged) callbacks.onMove?.(gesture.id, p);
        } else if (dist >= spacing) {
          if (mode === "pipe") callbacks.onPlace?.(p);
          else strokeAt(p, a);
          gesture.last = p;
        }
      }
    }
    gesture.x = e.clientX;
    gesture.y = e.clientY;
  }
  function end(e) {
    if (!active.has(e.pointerId)) return;
    active.delete(e.pointerId);
    if (active.size) {
      if (gesture) gesture.cancel = true;
      return;
    }
    if (
      gesture &&
      !gesture.cancel &&
      !gesture.dragged &&
      e.type !== "pointercancel"
    ) {
      if (mode === "place" && !gesture.id) {
        const p = surface(e.clientX, e.clientY);
        if (p) callbacks.onPlace?.(p);
      }
      if (mode === "orbit") callbacks.onSelect?.(pick(e.clientX, e.clientY));
      if (mode === "move" && !gesture.id) callbacks.onSelect?.(null);
    }
    if (
      mode === "paint" &&
      (e.pointerType === "touch" || e.type === "pointercancel")
    )
      knifeAt(null);
    gesture = null;
    pinchStart = null;
    request();
  }
  function wheel(e) {
    e.preventDefault();
    magnify = limit(magnify * Math.exp(-e.deltaY * 0.0015), 0.48, 2.6);
    request();
  }
  function key(e) {
    const inc = 0.14;
    if (e.key === "ArrowLeft") yaw -= inc;
    else if (e.key === "ArrowRight") yaw += inc;
    else if (e.key === "ArrowUp") elevation = limit(elevation + inc, 0.1, 1.49);
    else if (e.key === "ArrowDown")
      elevation = limit(elevation - inc, 0.1, 1.49);
    else return;
    e.preventDefault();
    request();
  }
  const events = [
    ["pointerdown", down],
    ["pointermove", move],
    ["pointerup", end],
    ["pointercancel", end],
    [
      "pointerleave",
      () => {
        if (!active.size) knifeAt(null);
      },
    ],
    ["wheel", wheel, { passive: false }],
    ["keydown", key],
  ];
  for (const [evt, fn, opts] of events) canvas.addEventListener(evt, fn, opts);
  resize();
  updateDesign(defaults);
  return {
    setDesign: updateDesign,
    animatePlacement,
    surfaceAt: surface,
    selectionScreenPoint,
    paintCoverage(scope = "outer") {
      return (scope === "filling" ? fillingPainter : outerPainter).coverage();
    },
    setBrush(options = {}) {
      brush = {
        width: limit(Number(options.width ?? brush.width) || 0.32, 0.075, 0.9),
        action:
          (options.action ?? brush.action) === "smooth" ? "smooth" : "spread",
        color: options.color === undefined ? brush.color : options.color,
      };
      if (knifeSample) knifeAt(knifeSample);
    },
    setAssembly(value) {
      if (!value || !assembly || value.tier !== assembly.tier) knifeAt(null);
      assembly = value
        ? {
            ...value,
            tier: limit(Number(value.tier) || 0, 0, geometry.tiers.length - 1),
          }
        : null;
      updateDesign(d);
    },
    letteringPosition() {
      return letters.userData.placement;
    },
    setPackagingVisible(value) {
      showPackaging = !!value;
      pack.visible = showPackaging && !assembly;
      request();
    },
    setStudioProps(value) {
      showProps = !!value && !photographic;
      props.visible = showProps;
      updateDesign(d);
    },
    setMode(value) {
      mode = value === "fill" ? "paint" : value;
      if (mode !== "paint") knifeAt(null);
      canvas.style.cursor =
        value === "orbit" ? "grab" : value === "move" ? "move" : "crosshair";
    },
    setCut(value) {
      const opening = !!value && !cut;
      cut = !!value;
      if (opening && !assembly) {
        const plan = cutPlan(d);
        if (plan.focus !== undefined) {
          yaw = Math.PI / 2 - plan.focus;
          velYaw = 0;
        }
      }
      updateDesign(d);
    },
    setAuto(value) {
      auto = !!value;
      request();
    },
    zoom(delta) {
      magnify = limit(
        magnify * (1 + limit(Number(delta) || 0, -0.65, 0.85)),
        0.48,
        2.6,
      );
      request();
    },
    cameraView(view) {
      velYaw = velElev = 0;
      spreadView = view === "spread";
      letterView = view === "lettering";
      const reference =
        view === "reference" && Number.isFinite(d.referenceAngle);
      const front = view === "front" || letterView;
      yaw = reference
        ? ((d.referenceYaw || 0) * Math.PI) / 180
        : front
          ? 0
          : 0.49;
      elevation = reference
        ? (d.referenceAngle * Math.PI) / 180
        : letterView
          ? d.textPlacement === "pick" || d.textPlacement === "side"
            ? 0.49
            : 1.1
          : view === "top"
            ? 1.485
            : view === "front"
              ? 0.19
              : spreadView
                ? 0.925
                : 0.47;
      magnify = reference ? limit(Number(d.referenceZoom) || 1, 0.8, 1.5) : 1;
      request();
    },
    capture() {
      advanceArrivals(Infinity);
      const show = handKnife.visible;
      handKnife.visible = false;
      render();
      const url = canvas.toDataURL("image/png");
      handKnife.visible = show;
      if (show) request();
      return url;
    },
    setBackground(css) {
      const color = new T.Color(css || "#eee0d3");
      if (photographic) {
        scene.backgroundIntensity =
          css === "#d7dce0"
            ? 0.86
            : css === "#dfcace"
              ? 0.91
              : css === "#d0d7c5"
                ? 0.96
                : 1;
        request();
        return;
      }
      floorMat.color.copy(color);
      scene.background.copy(color);
      scene.fog.color.copy(color);
      request();
    },
    dispose() {
      destroyed = true;
      backdrop?.dispose();
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const [evt, fn, opts] of events)
        canvas.removeEventListener(evt, fn, opts);
      clearBatches(deco);
      clearBatches(fruit);
      outerPainter.clear();
      fillingPainter.clear();
      handKnife.userData.release();
      [base, cake, pack, letters, props].forEach(disposeGroup);
      env.dispose();
      floor.geometry.dispose();
      floorMat.dispose();
      shadow.geometry.dispose();
      shadow.material.map.dispose();
      shadow.material.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

const thumbCache = new Map();
export async function ingredientThumbs(types) {
  const names = [...new Set(types || [])],
    missing = names.filter((t) => !thumbCache.has(t));
  if (missing.length) {
    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    setRenderer(renderer);
    renderer.setSize(144, 120, false);
    renderer.setClearColor("#000000", 0);
    renderer.shadowMap.enabled = false;
    const scene = new T.Scene(),
      env = studioEnv(renderer);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.55;
    lighting(scene);
    const stage = new T.Group();
    scene.add(stage);
    const camera = new T.PerspectiveCamera(26, 1.2, 0.001, 10),
      box = new T.Box3(),
      center = v(0, 0, 0),
      extent = v(0, 0, 0);
    try {
      for (const type of missing) {
        let ephemeral = false;
        if (type in flavors) {
          const dimensions = {
            shape: "round",
            size: 6,
            height: "low",
            layers: 1,
            flavor: type,
            fillings: [],
            coverage: 0,
          };
          buildCake(stage, dimensions, false, dims(dimensions));
          ephemeral = true;
        } else if (
          type in fillings &&
          !["strawberry", "blueberry", "mango"].includes(type)
        ) {
          const color = fillings[type];
          if (type === "cream" || type.endsWith("-cream")) {
            for (const part of stamp("pipe-star", color))
              stage.add(new T.Mesh(part.geometry, part.material));
          } else {
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * TAU,
                r = i === 0 ? 0 : 0.062;
              const geo =
                type === "mango" || type === "cookie"
                  ? new T.BoxGeometry(0.068, 0.057, 0.063)
                  : new T.SphereGeometry(0.048, 16, 10);
              const m = add(
                stage,
                geo,
                material(color, type === "jam" ? "fruit" : "matte"),
                Math.cos(a) * r,
                0.03 + Math.cos(a) * 0.01,
                Math.sin(a) * r,
              );
              m.rotation.set(a * 0.22, a * 0.91, a * 0.12);
            }
            ephemeral = true;
          }
        } else {
          for (const part of stamp(type))
            stage.add(new T.Mesh(part.geometry, part.material));
        }
        box.setFromObject(stage);
        box.getCenter(center);
        box.getSize(extent);
        const radius = Math.max(
          extent.y * 0.61,
          Math.max(extent.x, extent.z) * 0.55,
          0.032,
        );
        camera.position
          .set(0.4, 0.55, 1)
          .normalize()
          .multiplyScalar(radius * 5.6)
          .add(center);
        camera.lookAt(center);
        renderer.render(scene, camera);
        thumbCache.set(type, renderer.domElement.toDataURL("image/png"));
        if (ephemeral) disposeGroup(stage);
        else stage.clear();
      }
    } finally {
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  }
  return Object.fromEntries(names.map((t) => [t, thumbCache.get(t)]));
}

export function displayCake(design) {
  const d = { ...defaults, ...design },
    geo = dims(d),
    group = new T.Group(),
    cake = new T.Group(),
    deco = new T.Group(),
    letters = new T.Group(),
    base = new T.Group();
  buildCake(cake, d, false, geo);
  pedestal(base, d, geo);
  stampBatches(deco, d, geo, false);
  makeCakeLettering(letters, d, geo, radiusAt, []);
  settleLettering(letters, d, geo, null);
  group.add(base, cake, deco, letters);
  return {
    group,
    dispose() {
      disposeGroup(cake);
      disposeGroup(base);
      disposeGroup(letters);
      clearBatches(deco);
    },
  };
}
