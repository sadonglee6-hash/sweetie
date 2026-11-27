import * as T from "three";

// Points persist in the local UV domain of one tier. Top UVs describe the X/Z
// plane, side U wraps around the cake and side V rises from its lower seam.
const TAU = Math.PI * 2,
  clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
  wrap = (x) => x - Math.floor(x);
const sideDelta = (a, b) => {
  let dx = b - a;
  return dx - Math.round(dx);
};
const round = (n) => Math.round(n * 10000) / 10000;
const radialTables = new Map();
function fastRadius(shape, a, radiusAt) {
  if (shape !== "heart") return radiusAt(shape, a);
  let table = radialTables.get(shape);
  if (!table) {
    table = Array.from({ length: 1024 }, (_, i) =>
      radiusAt(shape, (i * TAU) / 1024),
    );
    radialTables.set(shape, table);
  }
  const unit = wrap(a / TAU) * table.length,
    at = Math.floor(unit),
    frac = unit - at;
  return table[at] * (1 - frac) + table[(at + 1) % table.length] * frac;
}
const WTOP = 224,
  HTOP = 224,
  WSIDE = 512,
  HSIDE = 112;
const colors = new Map();
function rgb(hex) {
  if (colors.has(hex)) return colors.get(hex);
  const c = new T.Color(hex || "#fff0d8").convertLinearToSRGB(),
    s = [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
  colors.set(hex, s);
  return s;
}
function pigment(options, t, face, u, v) {
  const c = rgb(options.color),
    c2 = rgb(options.color2 || options.color);
  let f = 0;
  if (options.finish === "gradient") f = face === "side" ? 1 - v : 0;
  if (options.finish === "marble")
    f =
      0.075 +
      0.63 *
        Math.exp(
          -Math.abs(Math.sin(14 * u + 7 * v + 2 * Math.sin(v * 8 + u * 4))) * 7,
        );
  const pair = f ? c.map((v, i) => v + (c2[i] - v) * f) : c;
  if (options.color3 && face === "side") {
    const third = rgb(options.color3),
      w = Math.max(0, 1 - Math.abs(v - 0.5) * 3.6) * 0.88;
    return pair.map((n, i) => Math.round(n + (third[i] - n) * w));
  }
  return pair;
}
function boundsAt(shape, a, radiusAt) {
  return fastRadius(shape, a, radiusAt);
}
function setTexture(data, w, h, side) {
  const tx = new T.DataTexture(data, w, h, T.RGBAFormat);
  tx.magFilter = tx.minFilter = T.LinearFilter;
  tx.wrapS = side ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  tx.needsUpdate = true;
  return tx;
}
function areaWeight(t, face, u, v, shape, above, radiusAt) {
  if (face === "top") {
    const x = 2 * u - 1,
      z = 2 * v - 1,
      r = Math.hypot(x, z),
      edge = boundsAt(shape, Math.atan2(z, x), radiusAt);
    if (r > edge || (above && r < (edge * above.radius) / t.radius)) return 0;
    return (4 * t.radius * t.radius) / (WTOP * HTOP);
  }
  const theta = u * TAU,
    eps = 0.003,
    r = boundsAt(shape, theta, radiusAt);
  const slope =
    (boundsAt(shape, theta + eps, radiusAt) -
      boundsAt(shape, theta - eps, radiusAt)) /
    (2 * eps);
  return (TAU * Math.hypot(r, slope) * t.radius * t.h) / (WSIDE * HSIDE);
}
function fromUV(t, face, u, v, shape, radiusAt) {
  if (face === "top") return [(u * 2 - 1) * t.radius, (v * 2 - 1) * t.radius];
  const a = u * TAU,
    r = radiusAt(shape, a) * t.radius;
  return [Math.cos(a) * r, v * t.h, Math.sin(a) * r];
}
function meshForField(f, o) {
  const isTop = f.face === "top",
    t = f.tier,
    shape = o.shape,
    cut = o.cut;
  let start = 0,
    end = TAU;
  if (cut) {
    const a = o.outline(shape, cut.start),
      b = o.outline(shape, cut.end);
    start = Math.atan2(a.z, a.x);
    end = start + wrap((Math.atan2(b.z, b.x) - start) / TAU) * TAU;
  }
  const cols = Math.max(28, Math.round(((end - start) / TAU) * 154)),
    rows = isTop ? 48 : 44;
  const pos = [],
    uv = [],
    idx = [];
  const bottom = o.scope === "filling" ? t.y + t.h * 0.4225 + 0.0025 : t.y;
  const h = o.scope === "filling" ? 0 : t.h;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const a = start + ((end - start) * i) / cols,
        v = j / rows,
        edge = o.radiusAt(shape, a) * t.radius;
      if (isTop) {
        const r = edge * (0.0001 + 0.9999 * v),
          x = r * Math.cos(a),
          z = r * Math.sin(a);
        pos.push(x, bottom + h + 0.002, z);
        uv.push((x / t.radius) * 0.5 + 0.5, (z / t.radius) * 0.5 + 0.5);
      } else {
        const r = edge + 0.0032,
          py = bottom + h * v;
        pos.push(r * Math.cos(a), py, r * Math.sin(a));
        uv.push(a / TAU, v);
      }
      if (i < cols && j < rows) {
        const k = j * (cols + 1) + i,
          b = k + cols + 1;
        if (isTop) idx.push(k, k + 1, b, k + 1, b + 1, b);
        else idx.push(k, b, k + 1, k + 1, b, b + 1);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const norm = g.attributes.normal;
  if (!cut && !isTop) {
    const n = new T.Vector3(),
      p = new T.Vector3();
    for (let j = 0; j <= rows; j++) {
      const i = j * (cols + 1);
      n.fromBufferAttribute(norm, i)
        .add(p.fromBufferAttribute(norm, i + cols))
        .normalize();
      norm.setXYZ(i, n.x, n.y, n.z);
      norm.setXYZ(i + cols, n.x, n.y, n.z);
    }
  }
  return g;
}
function makeField(i, t, face, o) {
  const side = face === "side",
    w = side ? WSIDE : WTOP,
    h = side ? HSIDE : HTOP,
    n = w * h;
  const f = {
    index: i,
    tier: t,
    face,
    w,
    h,
    weight: new Float32Array(n),
    mask: new Uint8Array(n),
    under: new Uint8Array(n),
    rgba: new Uint8Array(n * 4),
    height: new Uint8Array(n * 4),
    normal: new Uint8Array(n * 4),
    strokeScore: new Float32Array(n),
    previousDepth: new Uint8Array(n),
    strokeGroup: -1,
    sum: 0,
    filled: 0,
  };
  // Store metric data by column. This matters on fluted, square and heart edges.
  f.sideLength = side ? new Float32Array(w) : null;
  for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w;
    if (side) {
      const a = fromUV(t, face, u - 0.001, 0, o.shape, o.radiusAt),
        b = fromUV(t, face, u + 0.001, 0, o.shape, o.radiusAt);
      f.sideLength[x] = Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.002;
    }
    const sideArea = side
      ? areaWeight(t, face, u, 0, o.shape, null, o.radiusAt)
      : 0;
    for (let y = 0; y < h; y++) {
      const j = y * w + x,
        weight = side
          ? sideArea
          : areaWeight(
              t,
              face,
              u,
              (y + 0.5) / h,
              o.shape,
              o.scope === "outer" ? o.tiers[i + 1] : null,
              o.radiusAt,
            );
      f.weight[j] = weight;
      f.sum += weight;
    }
  }
  f.map = setTexture(f.rgba, w, h, side);
  f.map.colorSpace = T.SRGBColorSpace;
  f.relief = setTexture(f.height, w, h, side);
  f.normals = setTexture(f.normal, w, h, side);
  const maxThickness = o.scope === "filling" ? t.h * 0.225 : 0.057;
  const mat = new T.MeshPhysicalMaterial({
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
    map: f.map,
    alphaTest: 0.045,
    transparent: true,
    depthWrite: true,
    normalMap: f.normals,
    normalScale: new T.Vector2(0.7, 0.7),
    displacementMap: f.relief,
    displacementScale: maxThickness,
    roughness: o.finish === "drip" ? 0.31 : o.finish === "naked" ? 0.71 : 0.46,
    metalness: 0.005,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const obj = new T.Mesh(meshForField(f, o), mat);
  obj.castShadow = true;
  obj.receiveShadow = true;
  obj.userData.paintTier = i;
  obj.userData.paintFace = face;
  f.obj = obj;
  f.maxThickness = maxThickness;
  return f;
}
function reset(f, base, o) {
  f.mask.fill(0);
  f.under.fill(0);
  f.strokeGroup = -1;
  f.strokeScore.fill(-1);
  f.rgba.fill(0);
  f.height.fill(0);
  f.filled = 0;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x,
        k = i * 4,
        u = (x + 0.5) / f.w,
        v = (y + 0.5) / f.h;
      const neutral = rgb(o.color);
      f.rgba[k] = neutral[0];
      f.rgba[k + 1] = neutral[1];
      f.rgba[k + 2] = neutral[2];
      f.normal[k] = 128;
      f.normal[k + 1] = 128;
      f.normal[k + 2] = 255;
      f.normal[k + 3] = 255;
      if (!f.weight[i]) continue;
      let under = base >= 0.99999;
      if (base > 0 && !under) {
        if (o.scope === "filling") {
          const xz = Math.hypot(2 * u - 1, 2 * v - 1),
            edge = o.radiusAt(o.shape, Math.atan2(2 * v - 1, 2 * u - 1));
          under = xz <= edge * Math.sqrt(base) * 0.985;
        } else {
          const angle =
            f.face === "side"
              ? wrap(u)
              : wrap(Math.atan2(v - 0.5, u - 0.5) / TAU);
          under = angle < base;
        }
      }
      if (under) {
        f.under[i] = 1;
        f.mask[i] = 255;
        f.filled += f.weight[i];
      }
    }
  f.obj.visible = false;
  f.map.needsUpdate = f.relief.needsUpdate = f.normals.needsUpdate = true;
}
// Evaluate a whole sweep in the blade's local frame. Its cross-section follows
// the continuous travel distance, so adjoining input samples leave no rings.
function swipeProfile(px, py, vx, vy, r, stroke, tierRadius) {
  const length = Math.hypot(vx, vy),
    tx = length > 1e-6 ? vx / length : 0.86,
    ty = length > 1e-6 ? vy / length : 0.51;
  const along = px * tx + py * ty,
    transverse = (py * tx - px * ty) / r;
  const phase = (stroke.run || 0) + along / tierRadius,
    tilt =
      0.085 * Math.sin(4.6 * phase + 0.7) + 0.045 * Math.sin(8.3 * phase - 1.3);
  const q =
    (transverse - tilt) /
    (1 +
      0.052 * Math.sin(phase * 6 + 0.24) -
      0.034 * Math.cos(phase * 11.4 + 0.6));
  const leading = (along - length) / r + q * 0.24,
    trailing = -along / r - q * 0.17;
  const cap = Math.max(0, leading / 0.61, trailing / 0.46);
  const dist =
    length > 1e-6
      ? (Math.abs(q) ** 2.5 + cap ** 2.5) ** 0.4
      : Math.hypot(q / 0.77, along / (r * 0.54));
  if (dist >= 1.16) return { dist };
  const shoulder = clamp((1 - dist) / 0.37, 0, 1),
    slope = shoulder * shoulder * (3 - 2 * shoulder);
  const fall = clamp((1 - dist) / 0.12, 0, 1),
    edge = fall * fall * (3 - 2 * fall);
  const line1 = q - 0.18 - 0.09 * Math.sin(phase * 4.4),
    line2 = q + 0.38 + 0.065 * Math.cos(phase * 6.2 + 0.5);
  const groove =
    0.067 * Math.exp(-((line1 - 0.12) ** 2) / 0.01) -
    0.092 * Math.exp(-(line1 * line1) / 0.03) +
    0.039 * Math.exp(-((line2 + 0.09) ** 2) / 0.009) -
    0.05 * Math.exp(-(line2 * line2) / 0.023);
  const ridge =
    0.185 *
    Math.exp(-((q + 0.7 + 0.045 * Math.sin(phase * 8.2)) ** 2) / 0.012) *
    (0.87 + 0.13 * Math.cos(phase * 4.7));
  const sweep = 0.051 * Math.cos(q * 3.8 + phase * 0.8) - q * 0.08;
  const raw =
    stroke.action === "smooth"
      ? 0.355 + ridge * 0.54 + groove * 0.37 + sweep * 0.32
      : 0.47 + ridge + groove + sweep;
  return {
    dist,
    edge,
    slope,
    raw,
    score: slope - 0.22 * cap - 0.06 * Math.abs(q) - (length < 1e-6 ? 0.18 : 0),
  };
}
function finishRelief(o, side, u, v) {
  if (!side || o.scope !== "outer") return 0;
  if (o.finish === "vintage")
    return (
      0.045 * Math.sin(v * TAU * 19 + 0.35 * Math.sin(u * TAU * 3) + u * 2.7)
    );
  if (o.finish === "wave")
    return (
      0.115 * Math.sin(v * TAU * 9 + 1.75 * Math.sin(u * TAU * 4)) +
      0.014 * Math.cos(u * TAU * 15)
    );
  return 0;
}
function glaze(o, face, u, v) {
  if (o.finish !== "drip" || o.scope !== "outer") return false;
  if (face === "top")
    return (
      Math.hypot(2 * u - 1, 2 * v - 1) >
      0.78 * o.radiusAt(o.shape, Math.atan2(2 * v - 1, 2 * u - 1))
    );
  const a = u * TAU,
    sag =
      (0.04 + 0.08 * (0.5 + 0.5 * Math.sin(4 * a + 0.8))) *
      Math.max(0, Math.cos(13 * a + 0.76 * Math.sin(4 * a))) ** 5;
  return v > 0.91 - sag;
}
function apply(f, s, o) {
  const { w, h, tier: t } = f,
    side = f.face === "side",
    [u0, v0, u1, v1] = s.path;
  const width = clamp(s.width || 0.32, 0.075, 0.9),
    r = t.radius * width * 0.5;
  const worldWidth = side
    ? f.sideLength[clamp(Math.floor(wrap((u0 + u1) / 2) * w), 0, w - 1)]
    : 2 * t.radius;
  const worldHeight = side ? t.h : 2 * t.radius;
  const du = side ? sideDelta(u0, u1) : u1 - u0,
    dv = v1 - v0;
  const end = u0 + du;
  const xa = Math.floor((Math.min(u0, end) - (r / worldWidth) * 1.6) * w) - 1,
    xb = Math.ceil((Math.max(u0, end) + (r / worldWidth) * 1.6) * w) + 1;
  const ya = Math.max(
      0,
      Math.floor((Math.min(v0, v1) - (r * 1.35) / worldHeight) * h) - 1,
    ),
    yb = Math.min(
      h - 1,
      Math.ceil((Math.max(v0, v1) + (r * 1.35) / worldHeight) * h) + 1,
    );
  const vx = du * worldWidth,
    vy = dv * worldHeight;
  const explicit = s.color ? rgb(s.color) : null;
  if (f.strokeGroup !== s.group || s.group == null) {
    f.strokeGroup = s.group;
    f.strokeScore.fill(-1);
    for (let i = 0; i < f.previousDepth.length; i++)
      f.previousDepth[i] = f.height[i * 4];
  }
  let touched = false;
  for (let y = ya; y <= yb; y++)
    for (let ix = xa; ix <= xb; ix++) {
      if (!side && (ix < 0 || ix >= w)) continue;
      const x = ((ix % w) + w) % w,
        i = y * w + x;
      if (!f.weight[i]) continue;
      const u = (ix + 0.5) / w,
        v = (y + 0.5) / h,
        px = (side ? sideDelta(u0, u) : u - u0) * worldWidth,
        py = (v - v0) * worldHeight;
      const sample = swipeProfile(px, py, vx, vy, r, s, t.radius),
        dist = sample.dist;
      const k = i * 4;
      if (dist >= 1) {
        if (!f.rgba[k + 3] && dist < 1.16 && explicit) {
          f.rgba[k] = explicit[0];
          f.rgba[k + 1] = explicit[1];
          f.rgba[k + 2] = explicit[2];
        }
        continue;
      }
      const old = f.mask[i],
        edge = sample.edge,
        smoothed = s.action === "smooth";
      if (smoothed && !old) continue;
      const wanted = smoothed ? old : Math.max(old, Math.round(255 * edge));
      f.mask[i] = wanted;
      f.filled += (f.weight[i] * (wanted - old)) / 255;
      // Re-evaluate overlapping samples from this gesture against the surface
      // before the gesture, choosing its closest continuous part. Replaying a
      // smoothed cap seven times must never emboss seven semicircles.
      if (sample.score < f.strokeScore[i]) continue;
      f.strokeScore[i] = sample.score;
      let raw =
        sample.raw + finishRelief(o, side, u, v) * (smoothed ? 0.56 : 1);
      if (o.finish === "naked" && side) raw *= 0.52;
      const peak = f.under[i]
        ? (o.scope === "filling" ? 0.53 : 0.36) + raw * 0.53
        : raw;
      const oldH = f.previousDepth[i] / 255,
        depth = smoothed
          ? (oldH || 0.54) * (1 - 0.64 * edge) +
            peak * 0.64 * edge * sample.slope
          : Math.max(oldH, peak * sample.slope);
      const alpha = Math.max(f.rgba[k + 3], Math.round(255 * edge));
      const paint = glaze(o, f.face, wrap(u), v)
          ? rgb("#67412f")
          : explicit || pigment(o, t, f.face, wrap(u), v),
        isOld = !!f.rgba[k + 3];
      if (!smoothed || !isOld) {
        const blend = smoothed || !isOld ? 1 : edge;
        const color = smoothed ? pigment(o, t, f.face, wrap(u), v) : paint;
        for (let c = 0; c < 3; c++)
          f.rgba[k + c] = Math.round(
            f.rgba[k + c] * (1 - blend) + color[c] * blend,
          );
      }
      f.rgba[k + 3] = alpha;
      f.height[k] =
        f.height[k + 1] =
        f.height[k + 2] =
          Math.round(clamp(depth, 0, 1) * 255);
      f.height[k + 3] = 255;
      touched = true;
    }
  if (!touched) return;
  const sx = side ? worldWidth / w : (2 * t.radius) / w,
    sy = worldHeight / h;
  const at = (x, y) => {
    x = side ? ((x % w) + w) % w : clamp(x, 0, w - 1);
    return (f.height[(clamp(y, 0, h - 1) * w + x) * 4] / 255) * f.maxThickness;
  };
  for (let y = Math.max(0, ya - 1); y <= Math.min(h - 1, yb + 1); y++)
    for (let ix = xa - 1; ix <= xb + 1; ix++) {
      if (!side && (ix < 0 || ix >= w)) continue;
      const x = ((ix % w) + w) % w,
        k = (y * w + x) * 4;
      const nx = (at(x - 1, y) - at(x + 1, y)) / (2 * sx),
        ny = (at(x, y - 1) - at(x, y + 1)) / (2 * sy),
        len = Math.hypot(nx, ny, 1);
      f.normal[k] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      f.normal[k + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      f.normal[k + 2] = Math.round((0.5 / len + 0.5) * 255);
      f.normal[k + 3] = 255;
    }
  f.obj.visible = true;
  f.map.needsUpdate = f.relief.needsUpdate = f.normals.needsUpdate = true;
}
export class CreamPainter {
  constructor(group) {
    this.group = group;
    this.fields = [];
    this.key = "";
    this.paint = null;
    this.lastStrokes = [];
    this.base = -1;
  }
  synchronize(o, paint) {
    this.options = o;
    this.group.visible = !!paint && !!o;
    if (!o) return;
    const nextKey = JSON.stringify([
      o.scope,
      o.tier,
      o.shape,
      o.tiers,
      o.color,
      o.color2,
      o.finish,
      o.cut,
      o.stopAt,
    ]);
    if (nextKey !== this.key) {
      this.clear();
      this.key = nextKey;
    }
    // Pure templates and previously saved whole-surface designs need no paint textures.
    if (!paint) {
      this.paint = null;
      this.lastStrokes = [];
      this.base = -1;
      return;
    }
    if (!this.fields.length) {
      for (const [i, t] of o.tiers.entries()) {
        if (o.scope === "filling" && i !== o.tier) continue;
        for (const face of o.scope === "filling" ? ["top"] : ["top", "side"]) {
          const f = makeField(i, t, face, o);
          this.fields.push(f);
          this.group.add(f.obj);
        }
      }
    }
    const strokes = Array.isArray(paint.strokes) ? paint.strokes : [],
      base = clamp(Number(paint.base) || 0, 0, 1),
      old = this.lastStrokes;
    let start = old.length;
    if (
      base !== this.base ||
      old.length > strokes.length ||
      old.some(
        (s, i) =>
          s !== strokes[i] && JSON.stringify(s) !== JSON.stringify(strokes[i]),
      )
    ) {
      for (const f of this.fields) reset(f, base, o);
      start = 0;
      this.base = base;
    }
    for (let n = start; n < strokes.length; n++) {
      const s = strokes[n];
      if (!s || !Array.isArray(s.path)) continue;
      const f = this.fields.find(
        (k) => k.index === s.tier && k.face === s.face,
      );
      if (f) apply(f, s, o);
    }
    for (const f of this.fields)
      f.obj.visible = f.obj.visible && (o.stopAt == null || f.index < o.stopAt);
    this.paint = paint;
    this.lastStrokes = strokes.slice();
    this.group.visible = true;
  }
  stroke(point, from, brush, legacy) {
    if (!this.options || !point) return null;
    const { tier, face, u, v } = point;
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    const previous = this.paint || {
      v: 1,
      base: clamp(Number(legacy) || 0, 0, 1),
      strokes: [],
    };
    const a = from && from.tier === tier && from.face === face ? from : point;
    const stroke = {
      tier,
      face,
      path: [round(a.u), round(a.v), round(u), round(v)],
      width: round(brush.width),
      action: brush.action,
    };
    const last = previous.strokes.at(-1),
      t = this.options.tiers[tier],
      du = face === "side" ? sideDelta(a.u, u) * TAU : 2 * (u - a.u);
    stroke.group =
      from && last && last.tier === tier && last.face === face
        ? (last.group ?? previous.strokes.length)
        : previous.strokes.length + 1;
    stroke.run =
      from && last && last.tier === tier && last.face === face
        ? round((last.run || 0) + (last.length || 0))
        : 0;
    stroke.length = round(
      Math.hypot(du, (v - a.v) * (face === "side" ? t.h / t.radius : 2)),
    );
    if (brush.color && brush.action === "spread") stroke.color = brush.color;
    const paint = {
      v: 1,
      base: previous.base,
      strokes: [...previous.strokes, stroke],
    };
    this.synchronize(this.options, paint);
    return {
      scope: this.options.scope,
      tier,
      paint,
      coverage: this.coverage(),
      point,
    };
  }
  coverage() {
    if (!this.options || !this.paint?.strokes?.length || !this.fields.length)
      return null;
    let all = 0,
      filled = 0;
    for (const f of this.fields) {
      all += f.sum;
      filled += f.filled;
    }
    return clamp(all ? filled / all : 0, 0, 1);
  }
  heightAt(tier, face, u, v) {
    if (!this.paint) return 0;
    const f = this.fields.find((k) => k.index === tier && k.face === face);
    if (!f) return 0;
    const x = clamp(
        Math.floor((face === "side" ? wrap(u) : u) * f.w),
        0,
        f.w - 1,
      ),
      y = clamp(Math.floor(v * f.h), 0, f.h - 1);
    return (f.height[(y * f.w + x) * 4] / 255) * f.maxThickness;
  }
  clear() {
    for (const f of this.fields) {
      f.map.dispose();
      f.relief.dispose();
      f.normals.dispose();
      f.obj.material.dispose();
      f.obj.geometry.dispose();
    }
    this.fields = [];
    this.group.clear();
    this.paint = null;
    this.base = -1;
    this.lastStrokes = [];
  }
}

// The tip is at local (0, 0, 0). Local +Y is the supporting normal and the
// rosewood handle extends along +X, slightly lifted away from the cream.
export function handPaletteKnife() {
  const root = new T.Group();
  const steel = new T.MeshStandardMaterial({
    color: "#e9efee",
    metalness: 0.76,
    roughness: 0.22,
    envMapIntensity: 1.55,
    side: T.DoubleSide,
  });
  const brass = new T.MeshStandardMaterial({
    color: "#c3a16d",
    metalness: 0.68,
    roughness: 0.34,
  });
  const wood = new T.MeshStandardMaterial({
    color: "#9c6043",
    roughness: 0.46,
    metalness: 0.02,
  });
  const cream = new T.MeshStandardMaterial({
    color: "#fff0db",
    roughness: 0.56,
    metalness: 0.01,
  });
  const insert = (geometry, mat, x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const p = [],
    idx = [],
    nx = 29,
    nz = 10;
  for (let j = 0; j <= nx; j++)
    for (let i = 0; i <= nz; i++) {
      const s = j / nx,
        a = (i / nz) * 2 - 1,
        x = -0.047 + 0.409 * s;
      const half =
        0.086 *
        (1 - 0.45 * s) *
        Math.min(1, Math.sqrt(s * 14)) *
        (1 - 0.36 * Math.max(0, (s - 0.85) / 0.15));
      p.push(
        x,
        0.011 +
          0.029 * s * s -
          0.01 * a * a +
          0.005 * Math.cos(a * 2.6 + s * 1.2),
        a * half,
      );
      if (j < nx && i < nz) {
        const k = j * (nz + 1) + i,
          n = k + nz + 1;
        idx.push(k, k + 1, n, k + 1, n + 1, n);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  insert(g, steel);
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(0.34, 0.038, 0),
    new T.Vector3(0.393, 0.05, 0),
    new T.Vector3(0.426, 0.092, 0),
    new T.Vector3(0.485, 0.107, 0),
  ]);
  insert(new T.TubeGeometry(curve, 18, 0.014, 10, false), steel);
  const handle = new T.LatheGeometry(
    [
      [0.001, 0],
      [0.035, 0],
      [0.045, 0.018],
      [0.043, 0.06],
      [0.049, 0.22],
      [0.055, 0.32],
      [0.051, 0.358],
      [0.035, 0.369],
      [0.001, 0.372],
    ].map(([a, b]) => new T.Vector2(a, b)),
    26,
  );
  const grip = insert(handle, wood, 0.462, 0.106, 0);
  grip.rotation.z = -Math.PI / 2 + 0.035;
  grip.scale.z = 0.68;
  const band = insert(
    new T.CylinderGeometry(0.045, 0.044, 0.035, 22),
    brass,
    0.487,
    0.107,
    0,
  );
  band.rotation.z = Math.PI / 2;
  band.scale.z = 0.68;
  for (const k of [0.552, 0.751])
    insert(
      new T.CylinderGeometry(0.009, 0.009, 0.004, 12),
      brass,
      k,
      0.154 + (k - 0.55) * 0.045,
      0,
    );
  const smear = [],
    faces = [],
    steps = 27,
    bands = 10;
  for (let j = 0; j <= steps; j++)
    for (let i = 0; i <= bands; i++) {
      const t = j / steps,
        a = (i / bands) * 2 - 1,
        z = (t - 0.5) * 0.134;
      const sweep = 0.55 + 0.45 * Math.sin(2.9 * t + 0.18),
        taper = Math.sin(Math.PI * t) ** 0.65;
      const center =
        -0.011 + 0.05 * (2 * t - 1) ** 2 + 0.012 * Math.sin(t * 4.1);
      const x = center + a * taper * (0.014 + 0.015 * sweep) + 0.015 * t * t;
      const bladeT = (x + 0.047) / 0.409,
        half =
          0.086 *
          (1 - 0.45 * bladeT) *
          Math.min(1, Math.sqrt(Math.max(0, bladeT) * 14));
      const zz = clamp(z / Math.max(0.005, half), -1, 1),
        bladeY =
          0.011 +
          0.029 * bladeT * bladeT -
          0.01 * zz * zz +
          0.005 * Math.cos(zz * 2.6 + bladeT * 1.2);
      const lip =
          0.0045 *
          Math.exp(-((a + 0.48 + 0.12 * Math.sin(4 * t)) ** 2) / 0.085),
        depth = taper * (0.001 + 0.003 * (1 - a * a) + lip);
      smear.push(x, bladeY + 0.001 + depth, z);
      if (j < steps && i < bands) {
        const k = j * (bands + 1) + i,
          n = k + bands + 1;
        faces.push(k, n, k + 1, k + 1, n, n + 1);
      }
    }
  const residue = new T.BufferGeometry();
  residue.setAttribute("position", new T.Float32BufferAttribute(smear, 3));
  residue.setIndex(faces);
  residue.computeVertexNormals();
  insert(residue, cream);
  root.userData.cream = cream;
  root.visible = false;
  root.userData.release = () => {
    root.traverse((n) => {
      if (n.isMesh) n.geometry.dispose();
    });
    for (const m of [steel, brass, wood, cream]) m.dispose();
  };
  return root;
}

export function fillingColumn(paint, base, shape, rx, rz, radiusAt, fallback) {
  const u = (rx + 1) * 0.5,
    v = (rz + 1) * 0.5,
    edge = radiusAt(shape, Math.atan2(rz, rx));
  const under =
    base > 0.9999 ||
    (base > 0 && Math.hypot(rx, rz) < Math.sqrt(base) * edge * 0.985);
  let depth = 0,
    touched = false,
    exists = under,
    color = rgb(fallback).slice(),
    group = -1,
    previousDepth = 0,
    best = -Infinity;
  for (const s of paint?.strokes || []) {
    if (s.face !== "top" || !s.path) continue;
    const [ax, ay, bx, by] = s.path,
      vx = 2 * (bx - ax),
      vy = 2 * (by - ay),
      px = 2 * (u - ax),
      py = 2 * (v - ay);
    if (group !== s.group || s.group == null) {
      group = s.group;
      previousDepth = depth;
      best = -Infinity;
    }
    const sample = swipeProfile(px, py, vx, vy, s.width * 0.5, s, 1);
    if (
      sample.dist >= 1 ||
      sample.score < best ||
      (s.action === "smooth" && !exists)
    )
      continue;
    best = sample.score;
    const fade = sample.edge,
      peak = under ? 0.53 + sample.raw * 0.53 : sample.raw;
    depth =
      s.action === "smooth"
        ? (previousDepth || 0.54) * (1 - 0.64 * fade) +
          peak * 0.64 * fade * sample.slope
        : Math.max(previousDepth, peak * sample.slope);
    if (s.action !== "smooth") {
      const tinta = rgb(s.color || fallback);
      for (let i = 0; i < 3; i++)
        color[i] = touched ? color[i] + (tinta[i] - color[i]) * fade : tinta[i];
    }
    exists = true;
    touched = true;
  }
  return {
    height: Math.max(under ? 1 : 0, clamp((depth * 0.225) / 0.155, 0, 1)),
    color: new T.Color().setRGB(
      color[0] / 255,
      color[1] / 255,
      color[2] / 255,
      T.SRGBColorSpace,
    ),
  };
}
