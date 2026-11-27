import { fruitCuts } from "./fruit-catalog.js";
import { cakeOutline } from "./cake-shapes.js";
// Shared by the editor, the recipe book and finished design cards.
const names = {
  round: "圆形",
  square: "方形",
  heart: "爱心",
  flower: "花朵形",
  standard: "标准",
  tall: "高筒",
  low: "扁平",
  vanilla: "香草",
  cocoa: "可可",
  berry: "草莓",
  matcha: "抹茶",
  velvet: "红丝绒",
  cream: "动物奶油",
  "berry-cream": "草莓奶油",
  "cocoa-cream": "巧克力奶油",
  mango: "芒果",
  cookie: "奥利奥碎",
  pudding: "布丁",
  mochi: "麻薯",
  jam: "果酱",
  smooth: "平滑奶油",
  naked: "裸蛋糕",
  vintage: "复古刮刀纹理",
  wave: "波浪纹理",
  gradient: "渐变奶油",
  drip: "巧克力淋面",
  marble: "大理石纹",
  "pipe-round": "圆嘴奶油点",
  "pipe-star": "星形裱花",
  "pipe-shell": "贝壳裱花",
  "pipe-rose": "花瓣奶油玫瑰",
  "pipe-leaf": "奶油叶片",
  "pipe-wave": "波浪花边",
  "pipe-ruffle": "褶皱裱花",
  "pipe-kiss": "尖顶奶油花",
  "pipe-hem": "横排贝壳边",
  "pipe-scallop": "单弧垂花",
  "pipe-sprig": "刮刀叶枝",
  "pipe-field-daisy": "刮刀雏菊",
  "satin-bow": "长尾缎带结",
  "party-pick": "细金插签",
  "cherry-bing": "黑樱桃",
  "cherry-glace": "糖渍红樱桃",
  "strawberry-hulled": "去蒂整颗草莓",
  cherry: "樱桃",
  strawberry: "草莓",
  blueberry: "蓝莓",
  fig: "无花果",
  lemon: "柠檬片",
  rose: "玫瑰",
  daisy: "雏菊",
  lily: "铃兰",
  macaron: "马卡龙",
  marshmallow: "棉花糖",
  pearl: "糖珍珠",
  bow: "缎带蝴蝶结",
  lace: "蕾丝",
  chocolate: "巧克力片",
  truffle: "巧克力球",
  candle: "蜡烛",
  number: "数字插牌",
  crown: "小皇冠",
  star: "星星",
  moon: "月亮",
  butterfly: "蝴蝶",
  sugar: "糖粉",
  gold: "食用金箔",
  coconut: "椰蓉",
  ivory: "奶白瓷托",
  roseboard: "玫瑰色底托",
  clear: "透明蛋糕盒",
  paper: "纸质蛋糕盒",
  none: "无",
  handwriting: "手写奶油字",
  fondant: "翻糖字母",
};
const boards = { ivory: "奶白瓷托", rose: "玫瑰色底托", gold: "香槟金底托" };
export const label = (value) => names[value] ?? String(value ?? "");
export const creamBowls = [
  { id: "vanilla", name: "香草", color: "#fff0d3" },
  { id: "berry", name: "草莓", color: "#f1aebc" },
  { id: "cocoa", name: "巧克力", color: "#93604b" },
  { id: "matcha", name: "抹茶", color: "#b3c796" },
  { id: "mint", name: "薄荷", color: "#b9ddd0" },
  { id: "orange", name: "香橙", color: "#f5c28b" },
];
const fruitKinds = new Map(
  Object.entries(fruitCuts).flatMap(([kind, cuts]) =>
    cuts.map((c) => [c.id, { kind, name: c.label }]),
  ),
);
export function fruitKind(type) {
  return fruitKinds.get(type)?.kind;
}
export function pieceLabel(type) {
  const fruit = fruitKinds.get(type);
  if (fruit) return label(fruit.kind) + " · " + fruit.name;
  if (type === "number" || /^number-[0-9]$/.test(type))
    return "数字插牌 " + (type === "number" ? "1" : type.slice(-1));
  return label(type);
}
export function spongeFlavors(d) {
  return Array.from(
    { length: d.layers },
    (_, i) => d.layerFlavors?.[i] || d.flavor,
  );
}
export function spongeSummary(d) {
  const f = spongeFlavors(d);
  return new Set(f).size === 1 ? label(f[0]) : f.map(label).join(" / ");
}

export function formatCoverage(value) {
  const percent = Math.min(100, Math.max(0, (value || 0) * 100));
  return (
    (percent > 0 && percent < 1 ? percent.toFixed(1) : Math.round(percent)) +
    "%"
  );
}
function appliedColors(paint, fallback) {
  const strokes = paint?.strokes || [],
    swatches = new Set();
  if (
    !strokes.length ||
    paint.base > 0 ||
    strokes.some((s) => s.action === "spread" && !s.color)
  )
    swatches.add(fallback);
  for (const s of strokes)
    if (s.action === "spread" && s.color) swatches.add(s.color);
  return [...swatches]
    .filter(Boolean)
    .map((c) => creamBowls.find((b) => b.color === c)?.name || c);
}
export function creamDescription(d) {
  if (!d.coverage) return "裸胚";
  const finish = label(d.finish),
    colors = appliedColors(d.creamPaint, d.color);
  if (
    ["gradient", "marble"].includes(d.finish) &&
    d.color2 &&
    !colors.includes(d.color2)
  )
    colors.push(d.color2);
  return (
    finish +
    " · " +
    colors.join(" / ") +
    (d.coverage < 0.999 ? " · 覆盖 " + formatCoverage(d.coverage) : "")
  );
}
export function blankDesign() {
  return {
    shape: "round",
    size: 6,
    height: "standard",
    layers: 1,
    flavor: "vanilla",
    fillings: [],
    finish: "smooth",
    color: "#fff3df",
    color2: "#e4a7b6",
    coverage: 0,
    items: [],
    text: "",
    textColor: "#87484a",
    textSize: 1,
    textX: 0,
    textZ: 0,
    textArc: false,
    textStyle: "cream",
    board: "ivory",
    box: "none",
    ribbon: "#ba717e",
    card: "",
    sticker: false,
  };
}

// These figures are editable demonstration prices in CNY. The editor does not place orders.
export const pricing = {
  size: { 4: 78, 6: 138, 8: 198, 10: 268 },
  extraTier: 48,
  height: { standard: 0, low: 0, tall: 20 },
  flavor: { vanilla: 0, berry: 6, cocoa: 9, matcha: 9, velvet: 12 },
  filling: {
    cream: 0,
    "berry-cream": 4,
    "cocoa-cream": 4,
    strawberry: 12,
    mango: 9,
    blueberry: 12,
    cookie: 4,
    pudding: 6,
    mochi: 8,
    jam: 4,
  },
  finish: {
    smooth: 0,
    naked: 0,
    vintage: 5,
    wave: 5,
    gradient: 8,
    drip: 9,
    marble: 8,
  },
  piece: {
    cherry: 2,
    strawberry: 3,
    blueberry: 1,
    fig: 4,
    lemon: 2,
    rose: 4,
    daisy: 2,
    lily: 3,
    macaron: 5,
    pearl: 0.3,
    sugar: 0.2,
    gold: 1,
    coconut: 0.2,
    crown: 8,
    "satin-bow": 4,
    "party-pick": 2,
    "cherry-bing": 3,
    "cherry-glace": 2,
    "strawberry-hulled": 3,
  },
  piping: 0.4,
  otherDecoration: 2,
  board: { ivory: 0, rose: 4, gold: 6 },
  box: { none: 0, clear: 15, paper: 10 },
  greeting: 2,
  sticker: 1,
};
export function quote(design) {
  const p = pricing;
  const fillings = (design.fillings || []).reduce(
    (sum, key) => sum + (p.filling[key] || 0),
    0,
  );
  const decorations = (design.items || []).reduce(
    (sum, item) =>
      sum +
      (item.type.startsWith("pipe-")
        ? p.piping
        : (p.piece[item.type] ??
          p.piece[fruitKind(item.type)] ??
          p.otherDecoration)),
    0,
  );
  return Math.round(
    (p.size[design.size] ?? p.size[6]) +
      p.extraTier * (Math.max(1, design.layers || 1) - 1) +
      (p.height[design.height] || 0) +
      Math.round(
        spongeFlavors(design).reduce((sum, f) => sum + (p.flavor[f] || 0), 0) /
          design.layers,
      ) +
      fillings +
      decorations +
      (design.coverage > 0 ? p.finish[design.finish] || 0 : 0) +
      (p.board[design.board] || 0) +
      (design.fillingPieces || [])
        .flat()
        .reduce(
          (sum, piece) =>
            sum +
            (piece ? (p.piece[fruitKind(piece.type) || piece.type] ?? 1) : 0),
          0,
        ) +
      (p.box[design.box] || 0) +
      (design.card ? p.greeting : 0) +
      (design.sticker ? p.sticker : 0),
  );
}
export function materials(design) {
  const flavors = spongeFlavors(design);
  const result =
    new Set(flavors).size === 1
      ? [
          `${design.size} 寸${label(design.shape)}${label(flavors[0])}蛋糕胚 × ${design.layers}`,
        ]
      : flavors.map((f, i) => `第 ${i + 1} 层 · ${label(f)}蛋糕胚`);
  (design.fillings || []).forEach((key, index) => {
    if (key && key !== "none")
      result.push(`第 ${index + 1} 层夹心 · ${label(key)}`);
  });
  (design.fillingPieces || []).forEach((pieces, i) => {
    if (!pieces?.length) return;
    const counts = new Map();
    for (const p of pieces) counts.set(p.type, (counts.get(p.type) || 0) + 1);
    result.push(
      "第 " +
        (i + 1) +
        " 层果肉 · " +
        [...counts].map(([k, n]) => pieceLabel(k) + " × " + n).join("、"),
    );
  });
  for (const [tier, base] of (design.fillingBaseColors || []).entries()) {
    if (base && !design.fillingPaint?.[tier])
      result.push(
        "第 " +
          (tier + 1) +
          " 层涂抹 · " +
          (creamBowls.find((b) => b.color === base)?.name || base) +
          " · " +
          formatCoverage(design.fillingCoverage?.[tier]),
      );
  }
  for (const [tier, paint] of (design.fillingPaint || []).entries()) {
    if (!paint?.strokes?.length) continue;
    const tones = appliedColors(
      paint,
      design.fillingBaseColors?.[tier] ||
        label(design.fillings[tier] || "cream"),
    );
    result.push(
      "第 " +
        (tier + 1) +
        " 层涂抹 · " +
        tones.join(" / ") +
        " · " +
        formatCoverage(design.fillingCoverage?.[tier]),
    );
  }
  if (design.coverage > 0) result.push(creamDescription(design));
  const counts = new Map();
  for (const item of design.items || [])
    counts.set(item.type, (counts.get(item.type) || 0) + 1);
  for (const [type, count] of counts)
    result.push(`${pieceLabel(type)} × ${count}`);
  if (design.text) result.push(`蛋糕题字 · ${design.text}`);
  result.push(boards[design.board] || boards.ivory);
  if (design.box && design.box !== "none")
    result.push(label(design.box), `丝带 · ${design.ribbon}`);
  if (design.card) result.push(`贺卡 · ${design.card}`);
  if (design.sticker) result.push("Sweetie 品牌贴纸");
  return result;
}
export function stageDesign(design, stepIndex) {
  const staged = JSON.parse(JSON.stringify(design));
  const step = Math.min(6, Math.max(0, Math.floor(stepIndex || 0)));
  if (step < 1) {
    staged.fillings = [];
    staged.fillingPieces = [];
    staged.fillingCoverage = [];
    delete staged.fillingPaint;
    delete staged.fillingBaseColors;
  }
  if (step < 2) {
    staged.coverage = 0;
    delete staged.creamPaint;
  }
  if (step < 2) {
    staged.color = "#fff3df";
    staged.color2 = "#fff3df";
  }
  if (step < 3) staged.items = [];
  if (step === 3)
    staged.items = staged.items.filter((item) => item.type.startsWith("pipe-"));
  if (step < 5) staged.text = "";
  if (step < 6)
    Object.assign(staged, {
      board: "ivory",
      box: "none",
      card: "",
      sticker: false,
    });
  return staged;
}

const ivory = "#fff1da",
  blush = "#efb6c4",
  rose = "#d58899",
  pistachio = "#afbc89";
const cherryRed = "#9c1d35",
  leaf = "#839969",
  lilac = "#c8b4d7";
const top = (x, z) => ({ x, y: 1, z, nx: 0, ny: 1, nz: 0 });
const tau = Math.PI * 2;

function outline(shape, turn, radius) {
  const { x, z } = cakeOutline(shape, turn * tau);
  return top(x * radius, z * radius);
}
function sidePoint(shape, turn, height) {
  const point = outline(shape, turn, 1);
  const length = Math.hypot(point.x, point.z) || 1;
  return {
    ...point,
    y: height,
    nx: point.x / length,
    ny: 0,
    nz: point.z / length,
  };
}
function recipe(
  id,
  name,
  english,
  category,
  desc,
  difficulty,
  settings,
  decorate,
  tips,
) {
  const design = Object.assign(blankDesign(), { coverage: 1 }, settings);
  function dot(type, point, color, scale = 1, rotation = 0) {
    const item = {
      id: `r${id}-${design.items.length + 1}`,
      type,
      color,
      point,
      scale,
      rotation,
    };
    design.items.push(item);
    return item;
  }
  function ring(type, count, radius, color, scale = 1, offset = 0) {
    for (let i = 0; i < count; i++) {
      const turn = i / count + offset;
      const point = outline(design.shape, turn, radius);
      const next = outline(design.shape, turn + 0.002, radius);
      dot(
        type,
        point,
        color,
        scale,
        Math.atan2(next.x - point.x, next.z - point.z) -
          (type === "pipe-hem" ? Math.PI / 2 : 0),
      );
    }
  }
  function side(type, count, level, color, scale = 1, offset = 0) {
    for (let i = 0; i < count; i++) {
      dot(
        type,
        sidePoint(design.shape, i / count + offset, level),
        color,
        scale,
      );
    }
  }
  decorate({ dot, ring, side });
  return { id, name, english, category, desc, difficulty, design, tips };
}

export const recipes = [
  recipe(
    1,
    "樱桃奶油",
    "Cherry on Top",
    "复古奶油",
    "薄荷白抹面上，一颗颗黑樱桃坐在浅粉奶油花里。底边挤一圈交叠的小贝壳。",
    "进阶",
    {
      color: "#cbdcc7",
      color2: "#e5aac0",
      flavor: "vanilla",
      fillings: ["berry-cream"],
      finish: "smooth",
      height: "tall",
      heightRatio: 0.46,
      referenceAngle: 23,
      referenceZoom: 0.86,
      referenceYaw: 0,
    },
    ({ dot, side }) => {
      side("pipe-hem", 37, 0.012, "#e5aabe", 0.86, 0.004);
      const flowers = [
        [-0.43, 0.69],
        [0.19, 0.78],
        [0.73, 0.38],
        [0.76, -0.21],
        [0.3, -0.7],
        [-0.21, -0.72],
        [-0.69, -0.38],
        [-0.75, 0.16],
        [0.01, -0.065],
      ];
      const cherryTurns = [-1.2, 1.25, 0.7, -2.1, 0.04];
      let j = 0;
      flowers.forEach(([x, z], i) => {
        const crowned = i % 2 === 1 || i === 8;
        const scale = i === 8 ? 1.4 : crowned ? 1.12 : 1.17;
        const cream = dot("pipe-kiss", top(x, z), "#e7aec4", scale, 0.24 * i);
        if (crowned) {
          const berry = dot(
            "cherry-bing",
            top(x, z),
            "#501a28",
            i === 8 ? 1.22 : 1.19,
            cherryTurns[j++],
          );
          berry.restsOn = cream.id;
        }
      });
    },
    [
      "选择 6 寸圆形香草胚，做成一只小高筒。",
      "剖开胚体，夹一层草莓奶油。",
      "用刮刀把极浅的薄荷绿奶油抹平，保留利落的顶沿。",
      "绕蛋糕脚挤一圈粉色横贝壳，再在顶部挤八朵尖花，中央加一大朵。",
      "将五颗黑樱桃分别放在中央与四朵相间的奶油花上。",
      "顶面保留薄荷绿的留白；也可以在花朵间写上名字。",
      "放上奶白底托，略微俯拍，可同时看到上下两圈粉色裱花。",
    ],
  ),
  recipe(
    2,
    "草莓花园",
    "Strawberry Garden",
    "鲜果花园",
    "高高的象牙白奶油筒垂下八道弧线，顶部的贝壳花圈里只放四颗红草莓。",
    "进阶",
    {
      color: "#fff1d9",
      flavor: "vanilla",
      fillings: ["strawberry"],
      finish: "smooth",
      height: "tall",
      heightRatio: 0.7,
      referenceAngle: 17,
      referenceYaw: 0,
    },
    ({ dot, ring, side }) => {
      const cream = "#fff0d5";
      side("pearl", 53, 0.04, cream, 1.59, 0.004);
      side("pipe-scallop", 8, 0.985, cream, 1.03, 0.006);
      ring("pipe-shell", 24, 0.925, cream, 1.29, 0.014);
      [
        [-0.48, 0.26, 1.36, -0.31],
        [-0.06, -0.49, 1.49, 0.18],
        [0.38, 0.45, 1.49, -0.13],
        [0.59, -0.16, 1.4, 0.54],
      ].forEach(([x, z, s, a]) =>
        dot("strawberry-hulled", top(x, z), "#b92233", s, a),
      );
      dot("party-pick", top(0.01, -0.26), "#c9a66c", 1.23, 0.25);
    },
    [
      "取 6 寸圆形香草胚，叠出照片中修长的高筒比例。",
      "在胚体内铺草莓夹心，合起蛋糕。",
      "将顶部和侧面抹成干净的象牙白，尤其抚平上沿。",
      "顶部围上贝壳花边，侧面垂下八段奶油弧线。",
      "外侧底沿点一圈米白糖珠，顶部放四颗去蒂草莓与一支细金插签。",
      "让草莓之间留白；需要题字时，可写在中间。",
      "搭配奶白底托，镜头放低，让高筒和垂花同时入镜。",
    ],
  ),
  recipe(
    3,
    "芭蕾蝴蝶结",
    "Ballet Ribbon",
    "浪漫幻想",
    "珊瑚粉心形蛋糕缀着糖渍樱桃、双重花边和垂尾缎带，中央斜写两行金色生日题字。",
    "熟练",
    {
      shape: "heart",
      color: "#edaaa0",
      color2: "#e08b82",
      flavor: "berry",
      fillings: ["jam"],
      finish: "smooth",
      board: "ivory",
      ribbon: "#f4c7ce",
      text: "Chapter\n30",
      textColor: "#aa762d",
      textSize: 0.77,
      textStyle: "cream",
      textRotation: -0.48,
      referenceAngle: 41,
      referenceYaw: 31,
    },
    ({ dot, ring, side }) => {
      const edge = "#e78d83";
      ring("pipe-hem", 28, 0.9, edge, 1.3, 0.001);
      ring("pipe-shell", 34, 0.797, "#f2aba0", 0.68, 0.011);
      side("pipe-hem", 34, 0.015, edge, 0.89, 0.003);
      side("pipe-hem", 38, 0.124, "#eea296", 0.7, 0.012);
      side("lace", 9, 0.755, "#eb9c91", 2.02, 0.021);
      const fruitTurns = [0.09, 0.265, 0.38, 0.56, 0.84];
      fruitTurns.forEach((turn, i) =>
        dot(
          "cherry-glace",
          outline("heart", turn, 0.91),
          "#df343f",
          0.92,
          [-0.48, 1.2, -0.3, 0.8, 2.3][i],
        ),
      );
      [0.045, 0.205, 0.445, 0.65, 0.908].forEach((turn, i) => {
        dot(
          "satin-bow",
          sidePoint("heart", turn, 0.96),
          "#f3cbc9",
          i === 2 ? 1.42 : 1.18,
          [0.16, -0.09, 0.1, 0.14, -0.06][i],
        );
      });
      [0.12, 0.34, 0.6, 0.81].forEach((turn) => {
        dot("pearl", sidePoint("heart", turn, 0.49), "#f8dcc6", 0.64);
        dot("pearl", sidePoint("heart", turn, 0.405), "#f8dcc6", 0.46);
      });
    },
    [
      "选草莓味爱心蛋糕胚，心尖朝自己，保留上方柔软的凹口。",
      "把果酱铺匀，再合上蛋糕胚。",
      "调出珊瑚粉奶油，抹平顶部和侧面。",
      "沿心形挤两圈不同宽度的花边，侧面加垂花，底脚叠两圈小贝壳。",
      "在花边间放五颗糖渍红樱桃，把浅粉长尾蝴蝶结系在侧面。",
      "用金褐色奶油写两行祝福，第二行可以写寿星的年龄。",
      "配奶白底托，从心尖斜前方拍下缎带和两行小金字。",
    ],
  ),
  recipe(
    4,
    "开心果雏菊",
    "Pistachio Daisy",
    "鲜果花园",
    "深浅绿奶油像笔触般交叠，每朵白雏菊都以小刮刀抹出花瓣，最后点上金黄花心。",
    "熟练",
    {
      color: "#286c4f",
      color2: "#749778",
      flavor: "matcha",
      fillings: ["pudding"],
      finish: "marble",
      referenceAngle: 75,
      referenceYaw: 0,
      referenceZoom: 1.36,
    },
    ({ dot }) => {
      const greens = [
        "#236245",
        "#387d57",
        "#265c40",
        "#4b8764",
        "#367053",
        "#1e553a",
      ];
      for (let i = 0; i < 36; i++) {
        const a = i * 2.399963 + 0.31,
          dist = 0.86 * Math.sqrt((i + 0.45) / 36),
          x = dist * Math.cos(a),
          z = dist * Math.sin(a);
        const turn =
          dist > 0.63
            ? Math.atan2(x, z) + Math.PI * 0.52
            : 0.7 + 1.4 * Math.sin(0.31 * i) + 0.35 * Math.cos(1.51 * i);
        dot(
          "pipe-sprig",
          top(x, z),
          greens[i % greens.length],
          1.14 + 0.27 * (0.5 + 0.5 * Math.sin(2.1 * i)),
          turn,
        );
      }
      for (let i = 0; i < 25; i++) {
        const a = 2.399963 * i + 0.94,
          dist = 0.9 * Math.sqrt((i + 0.28) / 25);
        const x = dist * Math.cos(a) + 0.016 * Math.sin(4.71 * i),
          z = dist * Math.sin(a) + 0.017 * Math.cos(3.21 * i);
        dot(
          "pipe-field-daisy",
          top(x, z),
          i % 4 ? "#fff5de" : "#f1ead8",
          0.8 + 0.36 * (0.5 + 0.5 * Math.sin(0.88 + 3.47 * i)),
          a * 0.75,
        );
      }
    },
    [
      "取 6 寸圆形抹茶胚，保持标准高度。",
      "铺进布丁夹心，再盖上最上层蛋糕胚。",
      "用深浅两色绿色奶油抹成带纹理的草地底色。",
      "用小刮刀交替拖出多组绿叶枝，在叶间错开摆放大小不一的白雏菊。",
      "每朵雏菊自带金黄花心，转动蛋糕检查叶隙，可按喜好添一颗小装饰。",
      "密集的花面适合留白，想写祝福也可以移开一朵花。",
      "放到奶白底托上，切换近俯视，拍出叶脉与奶油花瓣。",
    ],
  ),
  recipe(
    5,
    "珍珠圆舞曲",
    "Pearl Waltz",
    "浪漫幻想",
    "玫瑰粉与乳白褶边交替，两圈糖珍珠随转台缓缓转动。",
    "进阶",
    {
      color: "#ebced0",
      flavor: "velvet",
      fillings: ["cream"],
      height: "tall",
      finish: "wave",
      board: "rose",
    },
    ({ dot, ring, side }) => {
      ring("pipe-ruffle", 24, 0.87, "#fff0e8", 0.78);
      ring("pearl", 24, 0.68, ivory, 0.86);
      side("pearl", 16, 0.67, ivory, 1);
      side("pipe-round", 28, 0.12, blush, 0.72);
      dot("rose", top(-0.28, -0.16), rose, 1.12, -0.3);
      dot("rose", top(0.03, -0.2), blush, 0.83, 0.45);
    },
    [
      "使用高筒圆形红丝绒蛋糕胚。",
      "选择动物奶油夹心，让剖面的红白层次更分明。",
      "用波浪刮纹覆盖高筒侧面。将抹面调成柔和的玫瑰粉。",
      "顶部围一圈奶白褶边，底部用小圆点收口。",
      "在花边内和侧面分别排一圈糖珍珠，再放两朵玫瑰。",
      "在珍珠围起的空隙书写短祝福。",
      "搭配玫瑰色底托，转动蛋糕检查珍珠的间距。",
    ],
  ),
  recipe(
    6,
    "油画玫瑰",
    "Painted Roses",
    "复古奶油",
    "杏色刮刀纹像一张画布，渐变的豆沙色玫瑰沿一侧舒展开来。",
    "熟练",
    {
      color: "#f1d6b5",
      flavor: "cocoa",
      fillings: ["cocoa-cream"],
      finish: "vintage",
      board: "gold",
    },
    ({ dot }) => {
      [
        [-0.52, -0.29, 1.25, "#c97c8d"],
        [-0.26, -0.48, 1.05, "#e7a0a3"],
        [0.05, -0.55, 0.85, "#efbab0"],
        [-0.57, 0.03, 1.08, "#df999c"],
        [-0.42, 0.28, 0.82, "#f1c3ad"],
      ].forEach(([x, z, s, c], i) =>
        dot("pipe-rose", top(x, z), c, s, i * 0.7),
      );
      [
        [-0.58, -0.47],
        [-0.14, -0.66],
        [-0.7, 0.17],
        [-0.26, 0.29],
        [0.18, -0.5],
      ].forEach(([x, z], i) =>
        dot("pipe-leaf", top(x, z), "#879870", 0.86, i * 0.59),
      );
      dot("gold", top(0.15, 0.25), "#d8b45f", 0.8);
      dot("gold", top(-0.15, 0.47), "#d8b45f", 0.58, 0.71);
    },
    [
      "取一个 6 寸圆形可可蛋糕胚。",
      "加入巧克力奶油夹心。",
      "选复古刮刀纹理，保留手工抹面的细痕。用淡杏色打底，另备深浅不同的豆沙色奶油。",
      "沿左上弧面挤玫瑰，由大到小收尾；花间补上叶片。",
      "在右下留白处少量点缀金箔。",
      "短句可放在花束对面，给文字留出呼吸的空间。",
      "搭配香槟金底托，侧转一点让花瓣褶皱接住光。",
    ],
  ),
  recipe(
    7,
    "海盐来信",
    "A Saltwater Letter",
    "复古奶油",
    "浅海盐蓝的方形奶油面，只留一行深色手写字。",
    "入门",
    {
      shape: "square",
      height: "low",
      color: "#c5d9dc",
      flavor: "vanilla",
      fillings: ["mochi"],
      text: "Dear you",
      textColor: "#686b72",
      textSize: 0.85,
      textStyle: "cream",
    },
    ({ dot }) => {
      dot("pipe-rose", top(-0.49, -0.4), "#fff3e5", 0.87, -0.3);
      dot("pipe-leaf", top(-0.32, -0.45), "#91a590", 0.65, -0.68);
      dot("pearl", top(0.48, 0.37), ivory, 0.93);
      dot("pearl", top(0.57, 0.28), ivory, 0.67);
    },
    [
      "选 6 寸方形香草胚，高度设为扁平。",
      "在蛋糕中央铺入麻薯夹心。",
      "抹平上表面，轻轻修整四个转角。用海盐蓝着色，再挑一个灰褐色留作题字。",
      "左上角挤一朵奶白玫瑰，用一片叶子衬托。",
      "对角放两颗大小不同的糖珍珠。",
      "在中央写一句问候，或写下收信人的名字。",
      "用奶白底托，拍一张能完整读到文字的俯视照。",
    ],
  ),
  recipe(
    8,
    "星月童话",
    "Moon & Starlight",
    "浪漫幻想",
    "香芋色的夜空里浮着一弯金月，星点从一端缓缓散开。",
    "入门",
    {
      color: "#c4b1d3",
      color2: "#e7c4d9",
      finish: "gradient",
      flavor: "berry",
      fillings: ["blueberry"],
      board: "gold",
    },
    ({ dot, ring }) => {
      ring("pipe-star", 18, 0.86, "#e6cfe7", 0.68);
      dot("moon", top(-0.25, -0.17), "#e7bd69", 1.16, -0.22);
      [
        [0.24, -0.36, 0.92],
        [0.48, 0.02, 0.69],
        [0.24, 0.39, 0.81],
        [-0.32, 0.36, 0.52],
      ].forEach(([x, z, s], i) =>
        dot("star", top(x, z), "#efc976", s, 0.4 * i),
      );
      [
        [0.04, -0.52],
        [-0.48, 0.08],
        [0.08, 0.18],
        [0.43, 0.24],
      ].forEach(([x, z]) => dot("pearl", top(x, z), ivory, 0.53));
    },
    [
      "准备圆形草莓蛋糕胚，选择标准高度。",
      "选择蓝莓夹心，营造淡淡的紫色剖面。",
      "选择渐变抹面，转台一圈检查过渡。让香芋紫与浅粉色在侧面自然衔接。",
      "沿顶部外圈挤一圈淡紫小星花。",
      "先放月亮，再从大到小散放金星和珍珠。",
      "为星月留出空间，可在中央偏下写一个短名字。",
      "用香槟金底托呼应星光，旋转至能看清月牙的角度。",
    ],
  ),
  recipe(
    9,
    "森间铃兰",
    "Lily of the Vale",
    "鲜果花园",
    "花形蛋糕上，细绿叶托着一簇簇白色小铃铛。",
    "进阶",
    {
      shape: "flower",
      color: "#b8c5a9",
      flavor: "matcha",
      fillings: ["mochi"],
      finish: "smooth",
    },
    ({ dot }) => {
      [
        [-0.43, -0.34],
        [-0.17, -0.48],
        [0.08, -0.36],
        [0.36, 0.19],
        [0.18, 0.38],
      ].forEach(([x, z], i) => {
        dot("pipe-leaf", top(x + 0.06, z + 0.11), leaf, 0.92, 1 + i * 0.4);
        dot("lily", top(x, z), "#fff7e7", i % 2 ? 0.83 : 1.07, i * 0.63);
      });
      dot("butterfly", top(0.42, -0.32), "#efd9c6", 0.72, 0.35);
    },
    [
      "选择 6 寸花朵形抹茶胚。",
      "铺上麻薯夹心，再合起花朵形胚体。",
      "沿花瓣的弧线缓慢抹平奶油。用浅松绿色抹面，叶片另调成深一点的绿色。",
      "在花朵将要落下的位置挤短小叶片。",
      "将铃兰分成两簇，在空处停一只浅色蝴蝶。",
      "把姓名放在两簇铃兰之间，字号保持小巧。",
      "选择奶白瓷托，略微俯拍，让花形边缘完整入镜。",
    ],
  ),
  recipe(
    10,
    "维多利亚茶会",
    "Victorian Tea Party",
    "复古奶油",
    "双层香草蛋糕披着象牙白奶油，粉色花冠与香槟金细节围出茶会的仪式感。",
    "熟练",
    {
      layers: 2,
      height: "tall",
      color: "#f8e9cf",
      size: 8,
      flavor: "vanilla",
      fillings: ["cream", "jam"],
      finish: "vintage",
      board: "gold",
    },
    ({ dot, ring, side }) => {
      ring("pipe-shell", 28, 0.87, ivory, 0.85);
      ring("pearl", 15, 0.7, "#e2c987", 0.81);
      side("pipe-ruffle", 24, 0.18, "#efc4bf", 0.78);
      side("pearl", 19, 0.59, ivory, 0.75);
      dot("crown", top(0.02, -0.25), "#d7b66a", 1.03, 0.08);
      [
        [-0.43, 0.09],
        [-0.19, 0.36],
        [0.16, 0.36],
        [0.43, 0.1],
      ].forEach(([x, z], i) =>
        dot(
          "pipe-rose",
          top(x, z),
          i % 2 ? "#f1c7be" : "#d89c9d",
          i % 2 ? 0.78 : 0.96,
          0.65 * i,
        ),
      );
    },
    [
      "准备 8 寸高筒香草胚，层数选为双层。",
      "第一层选动物奶油，第二层用果酱。",
      "给上下两层抹上复古刮刀纹，沿边缘收干净。以象牙白为底色，为花冠调出两种深浅的粉。",
      "上边缘挤贝壳花，在前侧排四朵渐变玫瑰。",
      "在花冠后放一顶小皇冠，散落少量金色糖珍珠。",
      "将文字置于花冠内，留出皇冠投下的影子。",
      "搭配香槟金底托，拉远镜头拍全双层轮廓。",
    ],
  ),
];

// The journal uses preset references today. A future image provider receives a
// local Blob and returns the same structured recipe; no photo leaves the browser here.
export async function resolveRecipeReference(reference, imageProvider) {
  if (reference.presetId !== undefined) {
    const preset = recipes.find(
      (recipe) => recipe.id === Number(reference.presetId),
    );
    if (!preset) throw new RangeError("找不到这份配方");
    return structuredClone(preset);
  }
  if (!(reference.image instanceof Blob) || typeof imageProvider !== "function")
    throw new TypeError("图片配方需要图像解析服务");
  const recipe = await imageProvider(reference.image);
  if (
    !recipe?.design ||
    !Array.isArray(recipe.design.items) ||
    ![7, 8].includes(recipe.tips?.length)
  )
    throw new TypeError("图片解析服务返回的配方不完整");
  const tips =
    recipe.tips.length === 8
      ? recipe.tips.filter((_, i) => i !== 3)
      : recipe.tips;
  return { ...recipe, tips, design: { ...blankDesign(), ...recipe.design } };
}
