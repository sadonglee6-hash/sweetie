import * as T from "three";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function inkTexture(text, tint, style, arc) {
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  const font =
    style === "cream"
      ? '600 italic 96px "Baskerville","Songti SC","Noto Serif CJK SC",serif'
      : style === "fondant"
        ? '650 96px "Avenir Next","PingFang SC",sans-serif'
        : 'bold 96px Georgia,"Songti SC",serif';
  ctx.font = font;
  const lines = [];
  for (const paragraph of String(text).trim().split(/\r?\n/)) {
    let line = "";
    const tokens = paragraph.match(/[A-Za-z0-9.,!?'-]+\s*|./gu) || [];
    for (const token of tokens) {
      if (line && ctx.measureText(line + token).width > 920) {
        lines.push(line.trim());
        line = "";
      }
      line += token;
    }
    lines.push(line.trim());
  }
  const lineWidth = Math.max(1, ...lines.map((s) => ctx.measureText(s).width));
  const pad = 22,
    lineHeight = 112,
    bend = arc ? 28 : 0;
  const w = Math.ceil(lineWidth + pad * 2),
    h = Math.ceil(lines.length * lineHeight + bend + pad);
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ink = new T.Color(tint || "#87484a");
  const highlight = ink.clone().lerp(new T.Color("#fff2d9"), 0.22).getStyle();
  const edge = ink.clone().multiplyScalar(0.53).getStyle();
  function draw(s, x, y, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = "rgba(61,31,23,.55)";
    ctx.shadowBlur = 2.6;
    ctx.shadowOffsetY = 2.4;
    ctx.strokeStyle = edge;
    ctx.lineWidth = style === "cream" ? 6 : 3.5;
    ctx.strokeText(s, 0, 1.7);
    ctx.shadowColor = "transparent";
    ctx.lineWidth = style === "cream" ? 3 : 1.8;
    ctx.strokeStyle = highlight;
    ctx.strokeText(s, 0, -1);
    ctx.fillStyle = tint || "#87484a";
    ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  lines.forEach((line, i) => {
    const mid = pad * 0.55 + lineHeight * (i + 0.5);
    if (!arc) {
      draw(line, w / 2, mid);
      return;
    }
    const chars = Array.from(line),
      widths = chars.map((c) => ctx.measureText(c).width),
      total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    chars.forEach((ch, j) => {
      x += widths[j] / 2;
      const t = x / Math.max(1, total * 0.5);
      draw(ch, w / 2 + x, mid + bend * t * t, 0.16 * t);
      x += widths[j] / 2;
    });
  });
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return { map, w, h };
}

export function makeCakeLettering(group, d, geo, radiusAt, obstacles = []) {
  group.userData.placement = null;
  if (!d.text?.trim()) return;
  const { map, w, h } = inkTexture(d.text, d.textColor, d.textStyle, d.textArc);
  const mat = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const r = geo.topRadius,
    size = clamp(Number(d.textSize) || 1, 0.3, 1.6),
    isSign = d.textPlacement === "pick";
  const maxW = (isSign ? 1.4 : 1.43) * r,
    maxH = (isSign ? 0.76 : 0.79) * r;
  const factor = Math.min((r * 0.345) / 112, maxW / w, maxH / h) * size;
  const width = w * factor,
    height = h * factor;
  if (isSign) {
    const holder = new T.Group();
    group.add(holder);
    holder.position.set((d.textX || 0) * r, geo.height, (d.textZ || 0) * r);
    holder.rotation.y = Number(d.textRotation) || 0;
    const signW = width + r * 0.13,
      signH = height + r * 0.095,
      round = Math.min(signH * 0.36, r * 0.07);
    const x = signW * 0.5,
      y = signH * 0.5,
      s = new T.Shape();
    s.moveTo(-x + round, -y);
    s.lineTo(x - round, -y);
    s.quadraticCurveTo(x, -y, x, -y + round);
    s.lineTo(x, y - round);
    s.quadraticCurveTo(x, y, x - round, y);
    s.lineTo(-x + round, y);
    s.quadraticCurveTo(-x, y, -x, y - round);
    s.lineTo(-x, -y + round);
    s.quadraticCurveTo(-x, -y, -x + round, -y);
    const lift = r * 0.31 + signH * 0.5;
    const wafer = new T.Mesh(
      new T.ExtrudeGeometry(s, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSize: 0.009,
        bevelThickness: 0.008,
        bevelSegments: 3,
      }),
      new T.MeshStandardMaterial({ color: "#fff1d9", roughness: 0.69 }),
    );
    wafer.position.y = lift;
    wafer.castShadow = true;
    wafer.receiveShadow = true;
    wafer.userData.localMat = true;
    holder.add(wafer);
    const stick = new T.Mesh(
      new T.CylinderGeometry(0.011, 0.012, lift, 10),
      new T.MeshStandardMaterial({ color: "#b98d61", roughness: 0.79 }),
    );
    stick.position.y = lift * 0.5;
    stick.userData.localMat = true;
    holder.add(stick);
    const letters = new T.Mesh(new T.PlaneGeometry(width, height), mat);
    letters.position.set(0, lift, 0.036);
    letters.userData.ownMat = true;
    holder.add(letters);
    return;
  }
  const rot = Number(d.textRotation) || 0,
    co = Math.cos(rot),
    si = Math.sin(rot);
  let cx = (d.textX || 0) * r,
    cz = (d.textZ || 0) * r;
  // Fit all of the inscription inside the chosen outline, including the lobes of a heart.
  function inside(x, z) {
    return Math.hypot(x, z) <= r * radiusAt(d.shape, Math.atan2(z, x)) * 0.95;
  }
  function fits(x, z, scale) {
    for (const u of [-0.5, 0, 0.5])
      for (const v of [-0.5, 0, 0.5]) {
        if (
          !inside(
            x + scale * (width * u * co + height * v * si),
            z + scale * (-width * u * si + height * v * co),
          )
        )
          return false;
      }
    return true;
  }
  let fit = 1;
  while (!fits(0, 0, fit) && fit > 0.12) fit *= 0.975;
  let inset = 1;
  while (!fits(cx * inset, cz * inset, fit) && inset > 0.01) inset -= 0.025;
  cx *= Math.max(0, inset);
  cz *= Math.max(0, inset);
  const auto =
    d.textPosition !== "manual" && !d.textX && !d.textZ && !d.textRotation;
  if (auto && obstacles.length) {
    let bestScore = Infinity,
      best = [cx, cz, fit];
    for (const shrink of [1, 0.9, 0.78, 0.66]) {
      const scale = fit * shrink,
        hw = width * scale * 0.48,
        hh = height * scale * 0.44;
      for (let iz = -8; iz <= 8; iz++)
        for (let ix = -8; ix <= 8; ix++) {
          const x = r * ix * 0.083,
            z = r * iz * 0.083;
          if (!fits(x, z, scale)) continue;
          let covered = 0;
          for (const ob of obstacles) {
            const wx = Math.max(
              0,
              Math.min(x + hw, ob.max.x) - Math.max(x - hw, ob.min.x),
            );
            const wz = Math.max(
              0,
              Math.min(z + hh, ob.max.z) - Math.max(z - hh, ob.min.z),
            );
            covered += wx * wz;
          }
          const score =
            (covered / Math.max(0.001, 4 * hw * hh)) * 12 +
            (Math.hypot(x, z) / r) * 0.28 +
            (1 - shrink) * 0.55;
          if (score < bestScore) {
            bestScore = score;
            best = [x, z, scale];
          }
        }
    }
    [cx, cz, fit] = best;
  }
  group.userData.placement = { x: cx / r, z: cz / r };
  const geometry = new T.PlaneGeometry(width * fit, height * fit, 32, 12);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(rot);
  geometry.translate(cx, 0, cz);
  const letters = new T.Mesh(geometry, mat);
  letters.userData.ownMat = true;
  letters.userData.onCake = true;
  group.add(letters);
}

export function settleLettering(group, d, geo, painter) {
  const mesh = group.children.find((m) => m.userData.onCake);
  if (!mesh) return;
  const pts = mesh.geometry.attributes.position,
    r = geo.topRadius,
    tier = geo.tiers.length - 1;
  const smoothTop =
    (d.creamPaint?.base ?? d.coverage) > 0
      ? d.finish === "drip"
        ? 0.026
        : 0.017
      : 0.006;
  for (let i = 0; i < pts.count; i++) {
    const relief = d.creamPaint
      ? painter.heightAt(
          tier,
          "top",
          0.5 + pts.getX(i) / (2 * r),
          0.5 + pts.getZ(i) / (2 * r),
        )
      : 0;
    pts.setY(i, geo.height + Math.max(smoothTop, relief + 0.004) + 0.005);
  }
  pts.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
