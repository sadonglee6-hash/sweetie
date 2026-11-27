import * as T from "three";

const tau = 2 * Math.PI;
const vec = (x, y, z) => new T.Vector3(x, y, z);
const lighter = (tint, n) => new T.Color(tint).lerp(new T.Color("#f4eece"), n);
const darker = (tint, n) => new T.Color(tint).multiplyScalar(n);

// One pointed extrusion from an open star tip. Its ribs meet at the lifted tip.
function creamKiss(g, color, h) {
  const geo = h.profileGeometry(
    (a, t) => {
      const shoulder = 0.81 + 0.27 * Math.sin(Math.min(1, t * 2.1) * Math.PI);
      const radius =
        0.14 *
        shoulder *
        Math.max(0, 1 - t) ** 0.62 *
        (0.6 + 0.4 * Math.min(1, t * 12));
      const pleats =
        1 +
        0.155 * Math.cos(11 * a - 0.56 * t) +
        0.031 * Math.cos(22 * a - 1.12 * t);
      return [
        radius * pleats * Math.cos(a) + 0.012 * t * t,
        0.166 * t + 0.001,
        radius * pleats * Math.sin(a),
      ];
    },
    72,
    25,
  );
  h.mesh(g, geo, h.material(color));
}

// A single editable shell runs along the cake board. Local +z faces out of
// the cake and local x follows the edge, the same frame as the hanging swag.
function shellHem(g, color, h) {
  const shell = h.profileGeometry(
    (a, t) => {
      const body = Math.sin(Math.PI * t) ** 0.65 * (1.43 - 0.89 * t);
      const flutes =
        1 +
        0.16 * Math.cos(10 * a + 0.97 * t) +
        0.033 * Math.cos(20 * a + 1.94 * t);
      const wiggle = 0.018 * Math.sin((t - 0.18) * tau) * body;
      return [
        0.285 * (t - 0.46),
        Math.max(0.001, 0.067 * body + 0.06 * body * flutes * Math.sin(a)),
        0.025 + wiggle + 0.088 * body * flutes * Math.cos(a),
      ];
    },
    62,
    25,
  );
  h.mesh(g, shell, h.material(color));
}
function scallop(g, color, h) {
  const points = [];
  for (let i = 0; i <= 50; i++) {
    const u = i / 50,
      x = (u - 0.5) * 0.801,
      sag = Math.sin(u * Math.PI) ** 0.66;
    points.push(vec(x, -0.36 * sag, -0.078 * (2 * u - 1) ** 2 + 0.015));
  }
  const path = new T.CatmullRomCurve3(points),
    geo = new T.TubeGeometry(path, 55, 0.018, 9, false);
  h.mesh(g, geo, h.material(color));
  for (const sign of [-1, 1])
    h.oval(
      g,
      h.material(color),
      sign * 0.4,
      0,
      -0.063,
      0.024,
      0.026,
      0.022,
      12,
    );
}
function pipingCherry(g, kind, h) {
  const glacé = kind === "glace";
  const fruit = h.material(glacé ? "#de2936" : "#501a28", "fruit");
  const geom = h.profileGeometry(
    (a, t) => {
      const phi = t * Math.PI,
        r =
          0.124 *
          Math.sin(phi) *
          (0.93 + 0.14 * t) *
          (1 - 0.054 * Math.exp(-10 * (1 - Math.cos(a - 0.34))));
      return [
        r * Math.cos(a),
        0.118 * (1 - Math.cos(phi)) - 0.027 * t ** 8,
        r * 0.97 * Math.sin(a),
      ];
    },
    43,
    24,
  );
  h.mesh(g, geom, fruit);
  const stem = glacé
    ? [
        vec(0, 0.206, 0),
        vec(0.02, 0.26, -0.014),
        vec(0.025, 0.31, -0.026),
        vec(0.066, 0.371, -0.048),
      ]
    : [
        vec(0, 0.205, 0),
        vec(0.021, 0.271, -0.019),
        vec(0.087, 0.349, -0.034),
        vec(0.151, 0.372, -0.066),
      ];
  h.curveTube(
    g,
    h.material(glacé ? "#7d4a35" : "#685337", "leaf"),
    stem,
    0.0042,
    18,
  );
  h.oval(
    g,
    h.material("#65513b", "leaf"),
    stem.at(-1).x,
    stem.at(-1).y,
    stem.at(-1).z,
    0.006,
    0.008,
    0.005,
    8,
  );
}
function satinBow(g, color, h) {
  const mat = h.material(color, "ribbon");
  function strip(path, widthAt, side, tail) {
    const p = [],
      ix = [],
      rows = 32,
      cols = 5;
    for (let j = 0; j <= rows; j++) {
      const t = j / rows,
        center = path.getPoint(t),
        tangent = path.getTangent(t);
      const wAxis = tail
        ? vec(side * 0.97, 0.14, 0.04)
        : vec(0.09 * side, 1, 0.28 + 0.36 * Math.cos(t * tau));
      wAxis.addScaledVector(tangent, -tangent.dot(wAxis)).normalize();
      const normal = tangent.clone().cross(wAxis).normalize();
      for (let i = 0; i <= cols; i++) {
        const u = (i / cols) * 2 - 1,
          point = center
            .clone()
            .addScaledVector(wAxis, (u * widthAt(t)) / 2)
            .addScaledVector(normal, (1 - u * u) * 0.005);
        p.push(point.x, point.y, point.z);
        if (i < cols && j < rows) {
          const a = j * (cols + 1) + i,
            b = a + cols + 1;
          ix.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    h.mesh(g, geo, mat);
  }
  for (const side of [-1, 1]) {
    const s = side,
      loop = new T.CatmullRomCurve3([
        vec(s * 0.008, 0.012, 0.025),
        vec(s * 0.079, 0.088, 0.065),
        vec(s * 0.159, 0.082, 0.033),
        vec(s * 0.167, 0.042, -0.002),
        vec(s * 0.107, 0.021, 0.004),
        vec(s * 0.019, 0.015, 0.04),
      ]);
    strip(loop, (t) => 0.044 + 0.031 * Math.sin(t * Math.PI), s, false);
    const end = s === -1 ? -0.335 : -0.272,
      tail = new T.CatmullRomCurve3([
        vec(s * 0.014, 0.006, 0.047),
        vec(s * 0.043, -0.055, 0.061),
        vec(s * 0.09, -0.147, 0.076),
        vec(s * 0.126, end * 0.77, 0.072),
        vec(s * 0.174, end, 0.09),
      ]);
    strip(tail, (t) => 0.068 - 0.009 * t, s, true);
  }
  h.oval(
    g,
    h.material(darker(color, 0.91), "ribbon"),
    0,
    0.018,
    0.052,
    0.029,
    0.033,
    0.021,
    14,
  );
}

// A knife pulls each dab from its rounded base to a fine point, leaving a
// central vein and a slightly torn rim. The whole surface has baked geometry.
function knifeDab(
  g,
  mat,
  h,
  {
    x = 0,
    z = 0,
    y = 0,
    angle = 0,
    length = 0.18,
    width = 0.047,
    lift = 0.045,
    bend = 0.015,
    petal = false,
  },
) {
  const positions = [],
    indices = [],
    m = 8,
    n = 15;
  const cs = Math.cos(angle),
    sn = Math.sin(angle);
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    for (let i = 0; i <= m; i++) {
      const u = (i / m) * 2 - 1;
      const breadth =
        (0.04 + 0.96 * Math.sin(t * Math.PI) ** (petal ? 0.63 : 0.78)) *
        (petal ? 1 + 0.23 * t : 1.15 - 0.33 * t);
      const lateral = bend * Math.sin(Math.PI * t) + u * width * breadth;
      const axial = length * t + 0.009 * u * u * Math.sin(t * Math.PI * 1.4);
      const ridge =
        0.5 +
        0.27 * Math.cos(u * 3.6 + 0.3 * t) +
        0.101 * Math.cos(u * 13 - 3 * t);
      const yy =
        y +
        0.003 +
        lift *
          (Math.sin(t * Math.PI) ** 0.57 * ridge +
            (petal ? 0.62 : 0.21) * t * t) +
        0.0018 * Math.sin(u * 14 + 7 * t);
      positions.push(
        x + lateral * cs + axial * sn,
        yy,
        z + axial * cs - lateral * sn,
      );
      if (i < m && j < n) {
        const a = j * (m + 1) + i,
          b = a + m + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  h.mesh(g, geo, mat);
}
function sprig(g, color, h) {
  const stem = h.material(lighter(color, 0.08), "leaf");
  h.curveTube(
    g,
    stem,
    [
      vec(0, 0.008, -0.205),
      vec(-0.009, 0.013, -0.068),
      vec(0.023, 0.017, 0.082),
      vec(0.048, 0.02, 0.192),
    ],
    0.006,
    16,
  );
  const blades = [
    [-0.005, -0.165, -0.57, 0.247, 0.05, 0.037],
    [0.002, -0.091, 0.66, 0.241, 0.054, 0.042],
    [0.007, -0.007, -0.64, 0.196, 0.042, 0.046],
    [0.019, 0.059, 0.63, 0.18, 0.041, 0.033],
    [0.031, 0.108, 0.17, 0.167, 0.031, 0.036],
  ];
  blades.forEach(([x, z, angle, length, width, lift], i) => {
    const mat = h.material(i % 2 ? lighter(color, 0.045) : color, "leaf");
    knifeDab(g, mat, h, {
      x,
      z,
      angle,
      length,
      width,
      lift,
      y: 0.007 + 0.002 * i,
      bend: i % 2 ? 0.017 : -0.019,
    });
    knifeDab(g, h.material(lighter(color, 0.15), "leaf"), h, {
      x: x + 0.002,
      z: z + 0.012,
      angle: angle + 0.032,
      length: length * 0.83,
      width: width * 0.12,
      lift: lift * 0.9,
      y: 0.013 + 0.002 * i,
      bend: i % 2 ? 0.012 : -0.012,
    });
  });
}
function fieldDaisy(g, color, h) {
  h.oval(g, h.material(color, "flower"), 0, 0.02, 0, 0.057, 0.021, 0.058, 14);
  for (let i = 0; i < 6; i++) {
    const theta = (i * tau) / 6 + 0.075 * Math.sin(i * 4.1),
      len = 0.107 + 0.017 * Math.cos(i * 3.7);
    knifeDab(g, h.material(i % 3 ? color : lighter(color, 0.1), "flower"), h, {
      x: 0.018 * Math.sin(theta),
      z: 0.018 * Math.cos(theta),
      y: 0.031,
      angle: theta,
      length: len,
      width: 0.032 + 0.006 * Math.sin(i),
      lift: 0.055 + 0.008 * (i % 2),
      bend: 0.009 * Math.cos(i + 0.7),
      petal: true,
    });
  }
  const gold = h.material("#db9e31", "matte");
  h.oval(g, gold, 0, 0.069, 0, 0.036, 0.026, 0.035, 17);
  for (let i = 0; i < 11; i++) {
    const a = 2.39996 * i,
      r = 0.006 + 0.019 * Math.sqrt(i / 10);
    h.oval(
      g,
      h.material(i % 3 ? "#dea531" : "#c9952a", "matte"),
      r * Math.cos(a),
      0.089 - 0.013 * (r / 0.024) ** 2,
      r * Math.sin(a),
      0.007,
      0.008,
      0.006,
      8,
    );
  }
}
function partyPick(g, h) {
  h.curveTube(
    g,
    h.material("#c8a35b", "gold"),
    [
      vec(0, 0, 0),
      vec(0.003, 0.21, 0),
      vec(-0.025, 0.42, -0.015),
      vec(-0.008, 0.64, -0.012),
      vec(0.004, 0.71, -0.02),
    ],
    0.008,
    26,
  );
}
const models = {
  "pipe-kiss": creamKiss,
  "pipe-hem": shellHem,
  "pipe-scallop": scallop,
  "pipe-sprig": sprig,
  "pipe-field-daisy": fieldDaisy,
  "satin-bow": satinBow,
};
export const coverTypes = new Set([
  ...Object.keys(models),
  "cherry-bing",
  "cherry-glace",
  "strawberry-hulled",
  "party-pick",
]);
export function coverStamp(g, type, color, h) {
  if (models[type]) return models[type](g, color, h);
  if (type === "party-pick") return partyPick(g, h);
  if (type === "strawberry-hulled") return h.strawberry(g, false);
  pipingCherry(g, type === "cherry-glace" ? "glace" : "bing", h);
}
