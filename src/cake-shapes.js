// Geometry and recipes share a single normalized rim. Heart samples are
// distributed by perimeter length so shells remain equally spaced at the tip.
const TAU = Math.PI * 2;
const mod = (value, origin) => ((value % origin) + origin) % origin;
const rightHalf = [
  [
    [0, -0.48],
    [0.105, -0.48],
    [0.203, -0.846],
    [0.505, -0.846],
  ],
  [
    [0.505, -0.846],
    [0.815, -0.846],
    [0.99, -0.586],
    [0.99, -0.31],
  ],
  [
    [0.99, -0.31],
    [0.99, 0.002],
    [0.818, 0.23],
    [0.618, 0.408],
  ],
  [
    [0.618, 0.408],
    [0.436, 0.574],
    [0.245, 0.734],
    [0.131, 0.788],
  ],
  [
    [0.131, 0.788],
    [0.078, 0.817],
    [0.035, 0.824],
    [0, 0.824],
  ],
];
const half = [{ x: 0, z: -0.48, length: 0 }];
for (const curve of rightHalf) {
  for (let i = 1; i <= 64; i++) {
    const t = i / 64,
      s = 1 - t,
      weights = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
    const x = weights.reduce((total, w, j) => total + w * curve[j][0], 0);
    const z = weights.reduce((total, w, j) => total + w * curve[j][1], 0);
    const last = half.at(-1);
    half.push({
      x,
      z,
      length: last.length + Math.hypot(x - last.x, z - last.z),
    });
  }
}
function heart(turn) {
  const side = turn > 0.5 ? -1 : 1;
  const distance = Math.min(turn, 1 - turn) * 2 * half.at(-1).length;
  let lo = 0,
    hi = half.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (half[mid].length < distance) lo = mid;
    else hi = mid;
  }
  const a = half[lo],
    b = half[hi],
    t = (distance - a.length) / (b.length - a.length);
  return { x: side * (a.x + (b.x - a.x) * t), z: a.z + (b.z - a.z) * t };
}
export function cakeOutline(shape, angle) {
  if (shape === "heart") return heart(mod(angle, TAU) / TAU);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  if (shape === "oval") {
    const radius = 1 / Math.hypot(c / 1.1, s / 0.78);
    return { x: c * radius, z: s * radius };
  }
  const r =
    shape === "square"
      ? (Math.abs(c) ** 8 + Math.abs(s) ** 8) ** (-1 / 8)
      : shape === "flower"
        ? 0.9 + 0.1 * Math.cos(6 * angle)
        : 1;
  return { x: c * r, z: s * r };
}
const polarHeart = Array.from({ length: 1025 }, (_, i) => {
  const p = heart(i / 1024),
    a = mod(Math.atan2(p.z, p.x) + Math.PI / 2, TAU);
  return { a: i === 1024 ? TAU : a, r: Math.hypot(p.x, p.z), t: i / 1024 };
});
function ray(theta) {
  const a = mod(theta + Math.PI / 2, TAU);
  let lo = 0,
    hi = polarHeart.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (polarHeart[mid].a < a) lo = mid;
    else hi = mid;
  }
  const p = polarHeart[lo],
    q = polarHeart[hi],
    f = (a - p.a) / (q.a - p.a || 1);
  return { r: p.r + (q.r - p.r) * f, t: p.t + (q.t - p.t) * f };
}
export function cakeRadiusAt(shape, theta) {
  if (shape === "heart") return ray(theta).r;
  if (shape === "oval")
    return 1 / Math.hypot(Math.cos(theta) / 1.1, Math.sin(theta) / 0.78);
  if (shape === "square")
    return (
      (Math.abs(Math.cos(theta)) ** 8 + Math.abs(Math.sin(theta)) ** 8) **
      (-1 / 8)
    );
  return shape === "flower" ? 0.9 + 0.1 * Math.cos(6 * theta) : 1;
}
export function cakeParameterAt(shape, theta) {
  return shape === "heart" ? ray(theta).t * TAU : theta;
}
