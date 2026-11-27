import {
  materials,
  quote,
  label,
  spongeFlavors,
  creamDescription,
} from "./recipes.js";
function wrap(ctx, value, width) {
  let lines = [],
    line = "";
  for (const ch of String(value)) {
    if (ch === "\n" || (line && ctx.measureText(line + ch).width > width)) {
      lines.push(line);
      line = "";
      if (ch === "\n") continue;
    }
    line += ch;
  }
  lines.push(line);
  return lines;
}
function imageOf(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
async function postcard(work) {
  const photo = await imageOf(work.photo),
    paper = document.createElement("canvas"),
    ctx = paper.getContext("2d");
  paper.width = 2000;
  paper.height = 1460;
  ctx.fillStyle = "#fbf0df";
  ctx.fillRect(0, 0, 2000, 1460);
  const x = 72,
    y = 68,
    w = 1856,
    h = 1044,
    ratio = Math.min(w / photo.width, h / photo.height);
  ctx.fillStyle = "#ead5bb";
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(
    photo,
    x + (w - photo.width * ratio) / 2,
    y + (h - photo.height * ratio) / 2,
    photo.width * ratio,
    photo.height * ratio,
  );
  ctx.strokeStyle = "#b99976";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "#733f3e";
  ctx.font = "italic 50px Georgia";
  ctx.fillText("Sweetie!", x, 1190);
  ctx.textAlign = "right";
  ctx.fillStyle = "#875e51";
  ctx.font = '32px "Songti SC",serif';
  ctx.fillText(new Date(work.date).toLocaleDateString("zh-CN"), 1928, 1190);
  ctx.textAlign = "left";
  ctx.fillStyle = "#4b312a";
  ctx.font = 'bold 62px "Songti SC",Georgia,serif';
  ctx.fillText(work.name || "我的蛋糕", x, 1285, 1820);
  ctx.font = '36px "Songti SC",Georgia,serif';
  ctx.fillStyle = "#855e51";
  ctx.fillText(
    "Made with love by " + (work.creator || "Sweetie 手作人") + ".",
    x,
    1370,
    940,
  );
  ctx.textAlign = "right";
  ctx.fillText(
    work.design.card || work.design.text || "给平凡的一天，加上一点甜。",
    1928,
    1370,
    840,
  );
  return paper;
}

export async function designCard(work, type = "png") {
  if (type === "png") return postcard(work);
  const { design: d, name, creator, photo, date } = work,
    im = await imageOf(photo);
  const c = document.createElement("canvas");
  c.width = 1000;
  const ctx = c.getContext("2d");
  const detailRows = [
    [
      "造型",
      [d.size + " 寸", label(d.shape), d.layers + " 层", label(d.height)].join(
        " · ",
      ),
    ],
    [
      "口味与夹心",
      [
        ...spongeFlavors(d).map(
          (f, i) =>
            (d.layers > 1 ? "第 " + (i + 1) + " 层 " : "") +
            label(f) +
            "蛋糕胚",
        ),
        ...(d.fillings || []).map(
          (v, i) => "第 " + (i + 1) + " 层 " + label(v),
        ),
        ...materials(d).filter(
          (v) => v.includes("层果肉") || v.includes("层涂抹"),
        ),
      ].join(" · "),
    ],
    ["奶油", creamDescription(d)],
    [
      "裱花与装饰",
      materials(d)
        .filter(
          (s) =>
            s.includes(" × ") && !s.includes("蛋糕胚") && !s.includes("层果肉"),
        )
        .join("、") || "无",
    ],
    [
      "蛋糕题字",
      [d.letterName, d.text, d.letterDate].filter(Boolean).join(" · ") || "无",
    ],
    [
      "包装",
      [
        { ivory: "奶白瓷托", gold: "香槟金托", rose: "玫瑰色底托" }[d.board],
        d.box === "none" ? "" : label(d.box),
        d.box !== "none" ? d.ribbon : "",
        d.sticker ? "品牌贴纸" : "",
        d.card,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "用途与制作说明",
      [d.occasion, d.notes].filter(Boolean).join(" · ") || "按图制作",
    ],
    ["用料说明", "用料与金额均为演示估算，实际配方、用量及价格由蛋糕师确认。"],
    ["参考报价", "¥ " + quote(d) + "（演示价格）"],
  ];
  ctx.font = "23px sans-serif";
  const rows = detailRows.map(([k, v]) => [k, wrap(ctx, v, 630)]);
  const titleLines = wrap(
    Object.assign(ctx, { font: "bold 46px serif" }),
    name || "我的蛋糕",
    850,
  );
  const titleH = titleLines.length * 57,
    photoY = 153 + titleH;
  c.height =
    photoY +
    520 +
    rows.reduce((s, [, lines]) => s + Math.max(56, lines.length * 31 + 22), 0) +
    110;
  ctx.fillStyle = "#fcf8f0";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#934554";
  ctx.font = "italic 54px Georgia";
  ctx.fillText("Sweetie", 64, 79);
  ctx.textAlign = "right";
  ctx.font = "20px serif";
  ctx.fillText(type === "pdf" ? "蛋糕定制需求单" : "蛋糕设计卡", 936, 66);
  ctx.textAlign = "left";
  ctx.strokeStyle = "#d6c2ad";
  ctx.beginPath();
  ctx.moveTo(64, 103);
  ctx.lineTo(936, 103);
  ctx.stroke();
  ctx.fillStyle = "#453a35";
  ctx.font = "bold 46px serif";
  titleLines.forEach((l, i) => ctx.fillText(l, 64, 167 + 57 * i));
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#7e7065";
  ctx.fillText(
    (creator || "Sweetie 手作人") +
      "  ·  " +
      new Date(date).toLocaleDateString("zh-CN"),
    66,
    135 + titleH,
  );
  const px = 64,
    pw = 872,
    ph = 486;
  ctx.fillStyle = "#eee3d6";
  ctx.fillRect(px, photoY, pw, ph);
  const scale = Math.min(pw / im.width, ph / im.height);
  ctx.drawImage(
    im,
    px + (pw - im.width * scale) / 2,
    photoY + (ph - im.height * scale) / 2,
    im.width * scale,
    im.height * scale,
  );
  let yy = photoY + 530;
  for (const [k, lines] of rows) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#886d61";
    ctx.fillText(k, 66, yy);
    ctx.font = "23px sans-serif";
    ctx.fillStyle = "#493c35";
    lines.forEach((l, i) => ctx.fillText(l, 269, yy + i * 31));
    yy += Math.max(56, lines.length * 31 + 22);
    ctx.fillStyle = "#dfd3c5";
    ctx.fillRect(64, yy - 32, 872, 1);
  }
  ctx.fillStyle = "#98575f";
  ctx.font = "italic 21px Georgia";
  ctx.fillText("Sweetie Cake Atelier", 64, c.height - 49);
  ctx.textAlign = "right";
  ctx.font = "18px serif";
  ctx.fillText("让甜蜜的想象，变成专属的蛋糕", 936, c.height - 49);
  return c;
}
function pdfBlob(c) {
  const jpg = Uint8Array.from(
    atob(c.toDataURL("image/jpeg", 0.94).split(",")[1]),
    (ch) => ch.charCodeAt(0),
  );
  const enc = new TextEncoder(),
    pieces = [],
    offsets = [0];
  let length = 0;
  function add(data) {
    const x = typeof data === "string" ? enc.encode(data) : data;
    pieces.push(x);
    length += x.length;
  }
  function obj(id, data) {
    offsets[id] = length;
    add(id + " 0 obj\n");
    add(data);
    add("\nendobj\n");
  }
  add("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  );
  offsets[4] = length;
  add(
    "4 0 obj\n<< /Type /XObject /Subtype /Image /Width " +
      c.width +
      " /Height " +
      c.height +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
      jpg.length +
      " >>\nstream\n",
  );
  add(jpg);
  add("\nendstream\nendobj\n");
  const sc = Math.min(595.28 / c.width, 841.89 / c.height),
    w = (c.width * sc).toFixed(3),
    h = (c.height * sc).toFixed(3),
    cmd =
      "q " +
      w +
      " 0 0 " +
      h +
      " " +
      ((595.28 - w) / 2).toFixed(3) +
      " " +
      (841.89 - h).toFixed(3) +
      " cm /Im0 Do Q\n";
  obj(5, "<< /Length " + cmd.length + " >>\nstream\n" + cmd + "endstream");
  const xref = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++)
    add(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  add("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
  return new Blob(pieces, { type: "application/pdf" });
}
export async function exportWork(work, type) {
  const c = await designCard(work, type);
  const blob =
    type === "pdf"
      ? pdfBlob(c)
      : await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) throw Error("图片导出失败");
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.download =
    (work.name || "Sweetie").replace(/[\\/<>:"|?*]/g, "-") +
    (type === "pdf" ? " · 定制需求单.pdf" : " · 甜品明信片.png");
  a.href = u;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 20000);
}
