import { createViewport, outline } from "./cake3d.js";
import {
  blankDesign,
  recipes,
  label,
  quote,
  materials,
  stageDesign,
  formatCoverage,
  creamBowls,
  fruitKind,
  pieceLabel,
  spongeFlavors,
  spongeSummary,
} from "./recipes.js";
import {
  asset,
  icon,
  esc,
  colors,
  stepNames,
  stepIcons,
  stepEnglish,
  stepsTips,
} from "./ui.js";
import { uid, writeLocal, storeWork } from "./storage.js";
import { fruitCuts } from "./fruit-catalog.js";
import { scrapeMotion, releaseScrape } from "./sound.js";
import { exportWork } from "./export.js";
const pipes = [
  "pipe-round",
  "pipe-star",
  "pipe-shell",
  "pipe-rose",
  "pipe-leaf",
  "pipe-wave",
  "pipe-ruffle",
  "pipe-kiss",
  "pipe-hem",
  "pipe-scallop",
  "pipe-sprig",
  "pipe-field-daisy",
];
const drawers = {
  水果: Object.keys(fruitCuts),
  花卉: ["rose", "daisy", "lily"],
  糖果: ["macaron", "marshmallow", "pearl"],
  浪漫: ["bow", "satin-bow", "lace", "heart"],
  巧克力: ["chocolate", "truffle"],
  生日: ["candle", "number", "party-pick"],
  童话: ["crown", "star", "moon", "butterfly"],
  点缀: ["sugar", "gold", "coconut"],
};
const inherent = {
  cherry: "#a6273b",
  strawberry: "#d3484a",
  blueberry: "#515778",
  fig: "#955267",
  mango: "#eeba55",
  lemon: "#ebcc64",
  rose: "#dc92a0",
  daisy: "#fff0df",
  lily: "#fff6e8",
  macaron: "#ceb497",
  marshmallow: "#f4abb7",
  pearl: "#fff4df",
  bow: "#dd94a7",
  "satin-bow": "#d5778a",
  "party-pick": "#c99b51",
  lace: "#fff3e1",
  heart: "#d37b90",
  chocolate: "#734b3c",
  truffle: "#795044",
  candle: "#dca2ac",
  number: "#d7af68",
  crown: "#d3ac60",
  star: "#e3bb60",
  moon: "#e1b962",
  butterfly: "#deafc0",
  sugar: "#fff9f1",
  gold: "#d8b060",
  coconut: "#fcf6e9",
};
const fillings = [
  "cream",
  "berry-cream",
  "cocoa-cream",
  "strawberry",
  "mango",
  "blueberry",
  "cookie",
  "pudding",
  "mochi",
  "jam",
];
const finishNames = [
  "smooth",
  "naked",
  "vintage",
  "wave",
  "gradient",
  "drip",
  "marble",
];
const clone = structuredClone;
const btn = (cmd, txt, ic = "", cls = "secondary", attrs = "") =>
  '<button type="button" class="' +
  cls +
  '" data-ed="' +
  cmd +
  '" ' +
  attrs +
  ">" +
  (ic ? icon(ic, 16) : "") +
  txt +
  "</button>";
const ib = (cmd, txt, ic) =>
  btn(cmd, "", ic, "tool-icon", 'title="' + txt + '" aria-label="' + txt + '"');
const field = (name, html) =>
  '<div class="tool-field"><h4>' + name + "</h4>" + html + "</div>";
const toggles = (key, vals, current, names = {}) =>
  '<div class="choices">' +
  vals
    .map(
      (v) =>
        '<button data-ed="set" data-key="' +
        key +
        '" data-val="' +
        esc(v) +
        '" aria-pressed="' +
        (current === v) +
        '" class="' +
        (current === v ? "chosen" : "") +
        '">' +
        esc(names[v] ?? label(v)) +
        "</button>",
    )
    .join("") +
  "</div>";
function slider(key, val, min, max, step, title) {
  return (
    '<label class="slider-field"><span>' +
    title +
    '</span><input type="range" min="' +
    min +
    '" max="' +
    max +
    '" step="' +
    step +
    '" value="' +
    val +
    '" data-range="' +
    key +
    '"><output>' +
    val +
    "</output></label>"
  );
}
function colorInput(key, value, title) {
  return (
    '<label class="color-field"><span>' +
    title +
    '</span><input type="color" value="' +
    esc(value) +
    '" data-color="' +
    key +
    '"><code>' +
    esc(value) +
    "</code></label>"
  );
}
function colorPicker(key, val) {
  return (
    '<div class="palette">' +
    colors
      .map(
        ([name, c]) =>
          '<button style="--sw:' +
          c +
          '" aria-label="' +
          name +
          '" title="' +
          name +
          '" data-ed="set-color" data-key="' +
          key +
          '" data-val="' +
          c +
          '" class="' +
          (val.toLowerCase() === c ? "chosen" : "") +
          '"></button>',
      )
      .join("") +
    "</div>" +
    colorInput(key, val, "自定义颜色")
  );
}
function ingredientGrid(ids, active, key, thumbOverrides = {}) {
  return (
    '<div class="ingredients">' +
    ids
      .map((entry) => {
        const { id, label: caption } =
          typeof entry === "string"
            ? { id: entry, label: label(entry) }
            : entry;
        const canDrag = [
          "material",
          "nozzle",
          "cut-choice",
          "filling-cut",
          "fruit-piece",
        ].includes(key);
        return `<button type="button" draggable="${canDrag}" class="${id === active ? "chosen" : ""}" aria-pressed="${id === active}" data-ed="ingredient" data-key="${key}" data-val="${id}"><img draggable="false" src="${asset("ingredient-" + (thumbOverrides[id] || id) + ".webp")}" alt=""><span>${esc(caption)}</span></button>`;
      })
      .join("") +
    "</div>"
  );
}
export async function createEditor(root, payload, app) {
  const restoredStep = (value) => {
    const old = Math.floor(Number(value) || 0);
    return Math.max(
      0,
      Math.min(
        stepNames.length - 1,
        old - (payload.workflowVersion !== 2 && old >= 3 ? 1 : 0),
      ),
    );
  };
  let d = { ...blankDesign(), ...clone(payload.design) },
    step = restoredStep(payload.step),
    name = payload.name || "我的手作蛋糕",
    creator = payload.creator || "",
    id = payload.id || null;
  const recipe = recipes.find((x) => x.id === payload.recipeId);
  let guided = !!payload.guided && !!recipe;
  let assembly = false,
    fillFruit = "strawberry",
    spongeTier = 0,
    digit = "1",
    brushWidth = 0.32,
    brushAction = "spread",
    paintPot = null,
    fillingPot = null;
  const cuts = new Map();
  for (const pieces of d.fillingPieces || [])
    for (const piece of pieces || []) {
      if (piece.point) {
        piece.x = piece.point.x;
        piece.z = piece.point.z;
        delete piece.point;
      }
      if (!piece.id) {
        piece.id = uid();
        if (piece.type === "mango") piece.type = "mango-dice";
        else if (piece.type === "strawberry") piece.type = "strawberry-half";
      }
      piece.rotation ??= 0;
      piece.scale ??= 1;
    }
  function cutFor(kind) {
    return cuts.get(kind) || fruitCuts[kind]?.[0]?.id || kind;
  }
  function activeMaterial() {
    return material === "number" ? "number-" + digit : cutFor(material);
  }
  function selectedItem() {
    return (assembly ? d.fillingPieces?.[tier] : d.items)?.find(
      (a) => a?.id === selected,
    );
  }
  let lastPaintPoint = null,
    lastPaintTime = 0;
  function applyBrush() {
    const id = assembly ? fillingPot : paintPot;
    view?.setBrush?.({
      width: brushWidth,
      action: brushAction,
      color: creamBowls.find((b) => b.id === id)?.color ?? null,
    });
  }

  let preview = false,
    cut = step === 1,
    auto = false,
    mode = "orbit",
    selected = null,
    nozzle = "pipe-shell",
    material = "strawberry",
    pipingColor = "#fff0d6",
    itemSize = 1,
    direction = 0,
    spacing = 0.17,
    group = "水果",
    tier = 0,
    background = "#f2e4d5",
    angle = Number.isFinite(d.referenceAngle) ? "reference" : "angle",
    showWrapped = true,
    view,
    disposed = false;
  const past = [],
    future = [];
  let gestureSaved = false,
    stroke = false,
    storageTimer,
    lastFx = 0,
    requestedSave = false,
    guideProgress =
      payload.guideProgress == null
        ? step
        : restoredStep(payload.guideProgress);
  function current() {
    return {
      id,
      name,
      creator,
      design: d,
      step,
      recipeId: recipe?.id,
      guided,
      guideProgress,
      workflowVersion: 2,
    };
  }
  function draft() {
    clearTimeout(storageTimer);
    if (!writeLocal("draft", current()) && !requestedSave) {
      requestedSave = true;
      app.notify("浏览器草稿空间不足，请保存到甜品屋");
    }
  }
  function queueDraft() {
    clearTimeout(storageTimer);
    storageTimer = setTimeout(draft, 230);
  }
  function snapshot() {
    past.push(clone(d));
    if (past.length > 55) past.shift();
    future.length = 0;
  }
  function mutate(fn, { panel = true, remember = true } = {}) {
    if (remember) {
      if (!stroke || !gestureSaved) snapshot();
      if (stroke) gestureSaved = true;
    }
    fn();
    sync(panel);
  }
  function updateAssembly() {
    if (!view) return;
    view.setAssembly?.(
      assembly
        ? {
            tier,
            progress: d.fillingCoverage?.[tier] ?? 0,
            fruitPoints: d.fillingPieces?.[tier] || [],
            filling: d.fillings[tier] || "cream",
          }
        : null,
    );
    if (assembly && d.fillingPaint?.[tier]) {
      const actual = view.paintCoverage?.("filling");
      if (actual != null) (d.fillingCoverage ??= [])[tier] = actual;
    }
  }
  function packageViewControls() {
    if (!d.box || d.box === "none") return "";
    return field(
      "查看效果",
      '<div class="choices">' +
        [
          ["cake", "看蛋糕"],
          ["box", "看礼盒"],
        ]
          .map(([id, title]) =>
            btn(
              "package-view",
              title,
              "",
              "chip " + ((id === "box") === showWrapped ? "chosen" : ""),
              'data-val="' +
                id +
                '" aria-pressed="' +
                ((id === "box") === showWrapped) +
                '"',
            ),
          )
          .join("") +
        "</div>",
    );
  }
  function sync(panel = true) {
    view?.setPackagingVisible((preview || step === 6) && showWrapped);

    view?.setDesign(d);
    if (assembly) updateAssembly();
    if (!assembly && d.creamPaint) {
      const actual = view?.paintCoverage?.("outer");
      if (actual != null) d.coverage = actual;
    }
    queueDraft();
    syncTools();
    if (panel) drawer();
    syncToolbar();
    const fillAmount = root.querySelector("[data-fill-percent]");
    if (fillAmount) {
      const v = d.fillingCoverage?.[tier] || 0;
      fillAmount.textContent = formatCoverage(v);
      root.querySelector("[data-fill-meter]").value = v;
    }
    const coverage = root.querySelector("#coverage");
    if (coverage) {
      coverage.textContent = formatCoverage(d.coverage);
      root.querySelector("#fill-progress").value = d.coverage;
    }
    root
      .querySelectorAll("[data-item-count]")
      .forEach((b) => (b.textContent = d.items.length));
  }
  function syncTools() {
    const hist = root.querySelector('[data-ed="undo"]'),
      redo = root.querySelector('[data-ed="redo"]');
    if (hist) hist.disabled = !past.length;
    if (redo) redo.disabled = !future.length;
    root.querySelectorAll("button[data-mode]").forEach((b) => {
      b.classList.toggle("on", b.dataset.mode === mode);
      b.setAttribute("aria-pressed", b.dataset.mode === mode);
    });
    root.querySelectorAll('[data-ed="auto"],[data-ed="cut"]').forEach((b) => {
      const on = b.dataset.ed === "cut" ? cut : auto;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });
  }
  function modeOfStep() {
    if (step === 1 && assembly) return "fill";
    return { 2: "paint", 3: "pipe", 4: "place" }[step] || "orbit";
  }
  function setMode(val) {
    mode = val;
    view?.setMode(val);
    applyBrush();
    const c = root.querySelector(".stage-canvas");
    if (c) c.dataset.mode = val;
    syncTools();
    help();
  }
  function help() {
    const el = root.querySelector(".stage-hint");
    if (el)
      el.innerHTML =
        icon(
          mode === "orbit" ? "rotate" : mode === "move" ? "move" : "hands",
          15,
        ) +
        (preview
          ? "拖动旋转 · 滚轮或双指缩放"
          : step === 5
            ? "祝福直接写在蛋糕上 · 拖动转台可换角度"
            : {
                orbit: "拖动转台 · 滚轮缩放",
                fill:
                  brushAction === "smooth"
                    ? "轻拖刮刀，收平已经铺开的夹心"
                    : "沿切开的胚面拖动刮刀，铺开夹心",
                paint:
                  brushAction === "smooth"
                    ? "轻拖刀面，收平已有奶油"
                    : "拖动抹开奶油 · 转动视角可抹侧面",
                pipe: "点击挤花 · 拖动连续裱花",
                place: "点空处放置 · 拖动已有材料调整位置",
                move: "拖动装饰调整位置 · 点击选中",
              }[mode]);
  }
  function syncToolbar() {
    const bar = root.querySelector(".piece-tools"),
      ring = root.querySelector(".piece-ring");
    if (!bar || !ring) return;
    const item = selectedItem();
    const editing =
      !preview && item && ([3, 4].includes(step) || (step === 1 && assembly));
    const pos = editing ? view?.selectionScreenPoint?.(selected) : null;
    bar.hidden = ring.hidden = !pos?.visible;
    if (bar.hidden) return;
    const stage = bar.parentElement,
      half = bar.offsetWidth / 2;
    const radius = Math.max(
      12,
      Math.min(
        82,
        pos.radiusPx ?? stage.clientWidth * 0.029 * (item.scale || 1),
      ),
    );
    bar.style.left =
      Math.min(stage.clientWidth - half - 6, Math.max(half + 6, pos.x)) + "px";
    bar.style.top =
      Math.min(stage.clientHeight - 58, Math.max(8, pos.y - radius - 37)) +
      "px";
    ring.style.left = pos.x + "px";
    ring.style.top = pos.y + "px";
    ring.style.width = radius * 2.25 + "px";
    ring.style.height = radius * 1.65 + "px";
  }
  function stepNav() {
    root.querySelector(".step-list").innerHTML = stepNames
      .map(
        (n, i) =>
          '<button data-ed="step" data-val="' +
          i +
          '" class="' +
          (i === step ? "active" : "") +
          '" ' +
          (i === step ? 'aria-current="step"' : "") +
          '><span class="step-n">' +
          String(i + 1).padStart(2, "0") +
          "</span><span>" +
          n +
          "</span>" +
          icon(stepIcons[i], 16) +
          "</button>",
      )
      .join("");
  }
  function shell() {
    root.innerHTML =
      '<div class="editor-wrap"><div class="editor-title"><div><a href="#home" class="back-link">' +
      icon("prev", 14) +
      " 工坊首页</a><h1>" +
      (preview ? "成品摄影台" : "蛋糕工作台") +
      " <i>" +
      (preview ? "The Final Cut" : "The Worktable") +
      '</i></h1></div><div class="editor-title-actions">' +
      (preview
        ? btn("back-edit", "继续制作", "pipe")
        : btn("reference", "参考配方", "book") +
          btn("materials", "材料清单", "list")) +
      (preview ? "" : btn("preview", "成品预览", "eye", "primary")) +
      '</div></div><div class="editor-grid' +
      (preview ? " is-preview" : "") +
      '"><aside class="steps-panel"><div class="panel-heading">制作步骤 <i>Method</i></div><div class="step-list"></div></aside><div class="stage"><div class="stage-canvas"></div><div class="stage-label"><span></span>' +
      (preview
        ? "<b data-photo-name>" +
          esc(name || "我的手作蛋糕") +
          "</b><small data-photo-author>" +
          esc(creator ? " · " + creator : "") +
          "</small>"
        : "3D 手作转台") +
      '</div><div class="piece-ring" aria-hidden="true" hidden></div><div class="piece-tools" role="group" aria-label="所选材料" hidden>' +
      btn(
        "turn-left",
        "−15°",
        "",
        "piece-tool",
        'title="逆时针旋转 15°" aria-label="逆时针旋转 15°"',
      ) +
      btn(
        "turn-right",
        "+15°",
        "",
        "piece-tool",
        'title="顺时针旋转 15°" aria-label="顺时针旋转 15°"',
      ) +
      ib("piece-smaller", "缩小材料", "minus") +
      ib("piece-larger", "放大材料", "plus") +
      ib("piece-remove", "移除材料", "trash") +
      '</div><div class="stage-hint"></div><div class="stage-tools">' +
      ib("undo", "撤销", "undo") +
      ib("redo", "重做", "redo") +
      "<i></i>" +
      ib("zoomout", "缩小", "minus") +
      ib("zoomin", "放大", "plus") +
      "<i></i>" +
      ib("auto", "自动环绕", "rotate") +
      ib("cut", "查看剖面", "slice") +
      ib("camera", "重置拍摄角度", "camera") +
      '</div></div><div class="letter-slot"></div><aside class="drawer"><div id="drawer-body"></div></aside></div><div class="editor-bottom"><span>' +
      icon("bookmark", 15) +
      " 草稿自动保存在此浏览器</span><div>" +
      btn("save", "保存作品", "save") +
      (preview
        ? ""
        : btn(
            "next",
            step === 6 ? "欣赏成品" : "下一步",
            step === 6 ? "eye" : "next",
            "primary",
          )) +
      "</div></div></div>";
    stepNav();
    const host = root.querySelector(".stage-canvas");
    view = createViewport(host, {
      spacing: () => spacing,
      onViewChange: syncToolbar,
      onPlace: (p) => {
        if (preview || !["place", "pipe"].includes(mode)) return;
        if (assembly && step === 1) {
          placeFilling(p);
        } else place(p);
      },
      onSelect: (key) => {
        selected = key;
        if (!preview && (assembly || [3, 4].includes(step))) drawer();
        syncToolbar();
      },
      onMove: (key, p) => {
        if (preview) return;
        const a = (assembly ? d.fillingPieces?.[tier] : d.items)?.find(
          (x) => x.id === key,
        );
        if (a)
          mutate(
            () => {
              if (assembly) {
                a.x = p.x;
                a.z = p.z;
              } else a.point = p;
            },
            { panel: false },
          );
      },
      onPaint: (change) => {
        if (preview) return;
        mutate(
          () => {
            if (change.scope === "filling") {
              d.fillingPaint ??= [];
              d.fillingCoverage ??= [];
              d.fillingPaint[change.tier] = change.paint;
              d.fillingCoverage[change.tier] = change.coverage;
            } else {
              d.creamPaint = change.paint;
              d.coverage = change.coverage;
            }
          },
          { panel: false },
        );
        const now = performance.now(),
          p = change.point;
        const speed =
          p && lastPaintPoint
            ? (Math.hypot(
                p.x - lastPaintPoint.x,
                p.y - lastPaintPoint.y,
                p.z - lastPaintPoint.z,
              ) *
                1000) /
              Math.max(10, now - lastPaintTime)
            : 0.25;
        scrapeMotion(speed, brushAction === "smooth");
        lastPaintPoint = p;
        lastPaintTime = now;
      },
    });
    host.addEventListener(
      "pointerdown",
      () => {
        stroke = true;
        gestureSaved = false;
      },
      { capture: true },
    );
    const canDrop = () => !preview && (assembly || [3, 4].includes(step));
    host.addEventListener("dragover", (e) => {
      if (canDrop()) e.preventDefault();
    });
    host.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!canDrop()) return;
      const type = e.dataTransfer.getData("application/x-sweetie");
      const p = view.surfaceAt(e.clientX, e.clientY);
      if (!p) return;
      if (assembly) {
        if (fruitKind(type)) placeFilling(p, type);
        return;
      }
      if (step === 3 && !pipes.includes(type)) return;
      if (
        step === 4 &&
        !(type in inherent) &&
        !fruitKind(type) &&
        !/^number-[0-9]$/.test(type)
      )
        return;
      place(p, type === "number" ? "number-" + digit : type);
    });
    view.setStudioProps?.(!preview);
    view.setBackground(background);
    view.setPackagingVisible((preview || step === 6) && showWrapped);
    view.setDesign(d);
    view.setCut(cut);
    view.cameraView(!preview && step === 5 ? "lettering" : angle);
    view.setAuto(auto);
    setMode(preview ? "orbit" : modeOfStep());
    drawer();
    syncTools();
  }
  function fx(kind) {
    const t = performance.now();
    if (t - lastFx > 120) {
      lastFx = t;
      app.play(kind);
    }
  }
  function placeFilling(p, type = cutFor(fillFruit)) {
    const fruit = { id: uid(), type, x: p.x, z: p.z, scale: 1, rotation: 0 };
    mutate(() => {
      d.fillingPieces ??= [];
      d.fillingPieces[tier] ??= [];
      d.fillingPieces[tier].push(fruit);
      selected = fruit.id;
    });
    fx("place");
  }
  function makeItem(p, type = step === 3 ? nozzle : activeMaterial()) {
    return {
      id: uid(),
      type,
      color: type.startsWith("pipe-")
        ? pipingColor
        : inherent[
            fruitKind(type) || (/^number-[0-9]$/.test(type) ? "number" : type)
          ],
      point: p,
      scale: itemSize,
      rotation: (direction * Math.PI) / 180,
    };
  }
  function place(p, type) {
    const item = makeItem(p, type);
    mutate(
      () => {
        d.items.push(item);
        selected = item.id;
      },
      { panel: !stroke || mode !== "pipe" },
    );
    view.animatePlacement(item.id);
    fx(step === 3 ? "pipe" : material === "sugar" ? "sugar" : "place");
  }
  function fieldsForSelection() {
    const a = selectedItem();
    if (!a)
      return '<p class="item-tip">点一下已放好的材料，就能旋转、缩放或移除。</p>';
    const kind = fruitKind(a.type),
      isNumber = a.type === "number" || /^number-[0-9]$/.test(a.type);
    const choices = kind
      ? fruitCuts[kind]
      : isNumber
        ? Array.from({ length: 10 }, (_, i) => ({
            id: "number-" + i,
            label: String(i),
          }))
        : null;
    const current = a.type === "number" ? "number-1" : a.type;
    const swap = choices
      ? `<label class="piece-edit-kind">${kind ? "更换切法" : "更换数字"}<select data-piece-type>${choices.map((c) => `<option value="${c.id}" ${current === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>`
      : "";
    return (
      '<div class="selected-item"><div><strong>已选 · ' +
      esc(pieceLabel(a.type)) +
      "</strong>" +
      ib("copy", "复制所选材料", "copy") +
      ib("delete", "删除所选材料", "trash") +
      "</div>" +
      swap +
      slider("sel-size", a.scale ?? 1, 0.35, 2.2, 0.05, "大小") +
      slider(
        "sel-rot",
        Math.round(((a.rotation || 0) * 180) / Math.PI),
        -180,
        180,
        5,
        "旋转",
      ) +
      (!assembly ? colorInput("sel-color", a.color || "#fff0d6", "颜色") : "") +
      "</div>"
    );
  }
  function brushControls() {
    const chosen = assembly ? fillingPot : paintPot;
    return (
      field(
        "蘸取奶油",
        '<div class="ingredients cream-bowls">' +
          creamBowls
            .map(
              (b) =>
                `<button aria-label="蘸取${b.name}奶油" aria-pressed="${chosen === b.id}" data-ed="dip" data-val="${b.id}" class="${chosen === b.id ? "chosen" : ""}"><img src="${asset("bowl-" + b.id + ".webp")}" alt=""><span>${b.name}</span></button>`,
            )
            .join("") +
          "</div>" +
          btn(
            "dip",
            "使用配方原色",
            "",
            "brush-base",
            'data-val="" aria-pressed="' + !chosen + '"',
          ),
      ) +
      field(
        "刮刀",
        '<div class="choices">' +
          [
            ["spread", "抹开"],
            ["smooth", "收平"],
          ]
            .map(([id, txt]) =>
              btn(
                "blade-action",
                txt,
                "",
                "chip " + (brushAction === id ? "chosen" : ""),
                'data-val="' +
                  id +
                  '" aria-pressed="' +
                  (brushAction === id) +
                  '"',
              ),
            )
            .join("") +
          '</div><div class="choices">' +
          [
            [0.18, "窄刃"],
            [0.32, "中刃"],
            [0.52, "宽刃"],
          ]
            .map(([w, txt]) =>
              btn(
                "blade-width",
                txt,
                "",
                "chip " + (brushWidth === w ? "chosen" : ""),
                'data-val="' +
                  w +
                  '" aria-pressed="' +
                  (brushWidth === w) +
                  '"',
              ),
            )
            .join("") +
          "</div>",
      )
    );
  }
  function fruitChoices(base, key) {
    return field(
      label(base) + "切法",
      ingredientGrid(fruitCuts[base], cutFor(base), key),
    );
  }
  function tierChoices(command, index) {
    return (
      '<div class="choices">' +
      Array.from({ length: d.layers }, (_, i) =>
        btn(
          command,
          "第 " + (i + 1) + " 层",
          "",
          "chip " + (i === index ? "chosen" : ""),
          'data-val="' + i + '"',
        ),
      ).join("") +
      "</div>"
    );
  }
  function digitChoices() {
    return field(
      "选择数字",
      '<div class="number-picks">' +
        Array.from({ length: 10 }, (_, n) =>
          btn(
            "digit",
            String(n),
            "",
            "chip " + (digit === String(n) ? "chosen" : ""),
            'data-val="' + n + '" aria-pressed="' + (digit === String(n)) + '"',
          ),
        ).join("") +
        "</div>",
    );
  }
  const narrow = window.matchMedia("(max-width:740px)");
  function placeLetterEntry() {
    const slot = root.querySelector(".letter-slot");
    const entry = root.querySelector(".letter-entry");
    if (!entry || !slot) return;
    if (narrow.matches) slot.append(entry);
    else root.querySelector("#drawer-body .letter-home")?.append(entry);
  }
  function drawer() {
    root.querySelector(".letter-slot")?.replaceChildren();
    root
      .querySelector(".editor-grid")
      ?.classList.toggle("is-lettering", !preview && step === 5);
    const host = root.querySelector("#drawer-body");
    if (!host) return;
    if (preview) {
      host.innerHTML =
        '<div class="drawer-title"><small>FINISHED CAKE</small><h2>作品设计卡</h2></div><div class="tool-field"><label class="text-label">蛋糕名称<input data-meta="name" maxlength="40" value="' +
        esc(name) +
        '"></label><label class="text-label">创作者<input data-meta="creator" maxlength="32" value="' +
        esc(creator) +
        '" placeholder="你的名字"></label></div><div class="finish-facts"><span>' +
        d.size +
        " 寸 · " +
        d.layers +
        " 层 · " +
        spongeSummary(d) +
        "胚</span><strong>¥ " +
        quote(d) +
        " <small>演示参考价</small></strong></div>" +
        packageViewControls() +
        (recipe?.id <= 4
          ? '<details class="photo-reference"><summary>对照参考照片</summary><img src="' +
            asset("cake-" + recipe.id + ".webp") +
            '" alt="' +
            esc(recipe.name) +
            '的原始参考照片"></details>'
          : "") +
        field(
          "拍摄角度",
          '<div class="choices">' +
            [
              ...(Number.isFinite(d.referenceAngle)
                ? [["reference", "参考图角度"]]
                : []),
              ["angle", "斜上方"],
              ["front", "正面"],
              ["top", "俯视"],
            ]
              .map(([key, txt]) =>
                btn(
                  "angle",
                  txt,
                  "",
                  "chip " + (key === angle ? "chosen" : ""),
                  'data-val="' + key + '"',
                ),
              )
              .join("") +
            "</div>",
        ) +
        field(
          "背景",
          '<div class="palette">' +
            [
              ["#f2e4d5", "奶油白"],
              ["#dfcace", "玫瑰粉"],
              ["#d0d7c5", "开心果"],
              ["#d7dce0", "海盐蓝"],
            ]
              .map(
                ([c, n]) =>
                  '<button data-ed="bg" data-val="' +
                  c +
                  '" title="' +
                  n +
                  '" aria-label="' +
                  n +
                  '" style="--sw:' +
                  c +
                  '" class="' +
                  (background === c ? "chosen" : "") +
                  '"></button>',
              )
              .join("") +
            "</div>",
        ) +
        '<div class="export-actions">' +
        btn("png", "导出 PNG 设计卡", "download", "primary wide") +
        btn("pdf", "导出 PDF 定制需求单", "download", "secondary wide") +
        "</div>";
      return;
    }
    const title =
      '<div class="drawer-title"><small>STEP ' +
      String(step + 1).padStart(2, "0") +
      " / 07</small><h2>" +
      stepNames[step] +
      " <i>" +
      stepEnglish[step] +
      "</i></h2><p>" +
      esc(guided ? recipe.tips[step] : stepsTips[step]) +
      "</p></div>";
    let body = "";
    if (step === 0) {
      body =
        field(
          "蛋糕形状",
          toggles("shape", ["round", "square", "heart", "flower"], d.shape),
        ) +
        field(
          "尺寸",
          toggles("size", [4, 6, 8, 10], d.size, {
            4: "4 寸",
            6: "6 寸",
            8: "8 寸",
            10: "10 寸",
          }),
        ) +
        field(
          "高度与层数",
          toggles("height", ["low", "standard", "tall"], d.height) +
            toggles("layers", [1, 2, 3], d.layers, {
              1: "单层",
              2: "双层",
              3: "三层",
            }),
        ) +
        field(
          "蛋糕胚口味",
          (d.layers > 1 ? tierChoices("sponge-tier", spongeTier) : "") +
            ingredientGrid(
              ["vanilla", "cocoa", "berry", "matcha", "velvet"],
              spongeFlavors(d)[spongeTier],
              "flavor",
            ),
        );
    }
    if (step === 1) {
      tier = Math.min(tier, d.layers - 1);
      body = d.layers > 1 ? field("夹心位置", tierChoices("tier", tier)) : "";
      if (!assembly) {
        body +=
          field(
            "选择夹心",
            ingredientGrid(fillings, d.fillings[tier], "filling", {
              mango: "mango-dice",
            }),
          ) +
          btn("assembly", "揭开上片，铺夹心", "layers", "primary wide") +
          btn("cut", cut ? "合上剖面" : "查看剖面", "slice", "secondary wide");
      } else {
        const painting = mode === "fill" || mode === "orbit";
        body += field(
          "第 " + (tier + 1) + " 层 · " + label(d.fillings[tier] || "cream"),
          '<div class="progress-row"><progress data-fill-meter max="1" value="' +
            (d.fillingCoverage?.[tier] || 0) +
            '"></progress><span data-fill-percent>' +
            formatCoverage(d.fillingCoverage?.[tier]) +
            "</span></div>",
        );
        if (painting)
          body +=
            brushControls() +
            btn("fruit-tool", "开始摆放果肉", "next", "primary wide") +
            btn("fill-all", "铺满本层夹心", "", "brush-base");
        else
          body +=
            field(
              "选择果肉",
              ingredientGrid(Object.keys(fruitCuts), fillFruit, "fruit-piece"),
            ) +
            fruitChoices(fillFruit, "filling-cut") +
            fieldsForSelection();
        body += btn("assembly", "盖上蛋糕胚", "layers", "secondary wide");
      }
    }
    if (step === 2) {
      body =
        field(
          "抹面进度",
          '<div class="progress-row"><progress id="fill-progress" max="1" value="' +
            d.coverage +
            '"></progress><span id="coverage">' +
            formatCoverage(d.coverage) +
            '</span></div><div class="button-row">' +
            btn("full-cover", "整面覆盖", "whisk") +
            btn("uncover", "还原裸胚") +
            "</div>",
        ) +
        brushControls() +
        field("抹面质感", toggles("finish", finishNames, d.finish));
    }
    if (step === 3) {
      body =
        field("裱花嘴", ingredientGrid(pipes, nozzle, "nozzle")) +
        field("奶油颜色", colorPicker("piping", pipingColor)) +
        field(
          "挤花设置",
          slider("item-size", itemSize, 0.4, 2, 0.1, "大小") +
            slider("spacing", spacing, 0.06, 0.38, 0.01, "间距") +
            slider("direction", direction, -180, 180, 5, "方向") +
            btn("ring", "沿上缘裱花一圈", "rotate", "secondary wide"),
        ) +
        fieldsForSelection();
    }
    if (step === 4) {
      body =
        '<div class="ingredient-tabs">' +
        Object.keys(drawers)
          .map((k) =>
            btn(
              "group",
              k,
              "",
              "chip " + (group === k ? "chosen" : ""),
              'data-val="' + k + '"',
            ),
          )
          .join("") +
        "</div>" +
        field(
          group,
          ingredientGrid(
            drawers[group],
            material,
            "material",
            material === "number" ? { number: "number-" + digit } : {},
          ),
        ) +
        (fruitCuts[material]
          ? fruitChoices(material, "cut-choice")
          : material === "number"
            ? digitChoices()
            : "") +
        field("摆放大小", slider("item-size", itemSize, 0.4, 2, 0.1, "大小")) +
        fieldsForSelection();
    }
    if (step === 5) {
      body =
        '<div class="letter-home"><div class="letter-entry"><label class="text-label" for="cake-message">蛋糕题字</label><textarea rows="2" id="cake-message" aria-label="蛋糕题字" class="full-input" data-text="text" placeholder="输入祝福，可换行" maxlength="32">' +
        esc(d.text) +
        '</textarea><div class="choices letter-phrases">' +
        ["生日快乐", "Happy Birthday", "给最爱的你"]
          .map((t) => btn("phrase", t, "", "chip", 'data-val="' + t + '"'))
          .join("") +
        "</div></div></div>" +
        field(
          "题字位置",
          toggles(
            "textPlacement",
            ["surface", "pick"],
            d.textPlacement || "surface",
            { surface: "写在蛋糕面", pick: "做成祝福插牌" },
          ),
        ) +
        field(
          "字形",
          toggles("textStyle", ["cream", "chocolate", "fondant"], d.textStyle, {
            cream: "手写奶油",
            chocolate: "巧克力",
            fondant: "翻糖",
          }),
        ) +
        colorInput("textColor", d.textColor, "文字颜色") +
        field(
          "排版",
          slider("textSize", d.textSize, 0.3, 1.6, 0.05, "字号") +
            slider("textX", d.textX, -0.6, 0.6, 0.02, "左右") +
            slider("textZ", d.textZ, -0.6, 0.6, 0.02, "前后") +
            (d.text && d.textPlacement !== "pick"
              ? btn("clear-letter-position", "寻找空位", "", "chip")
              : "") +
            '<label class="check-label"><input type="checkbox" data-check="textArc" ' +
            (d.textArc ? "checked" : "") +
            "> 弧形排列</label>",
        );
    }
    if (step === 6) {
      body =
        field(
          "蛋糕底托",
          toggles("board", ["ivory", "gold", "rose"], d.board, {
            ivory: "奶白瓷托",
            gold: "香槟金托",
            rose: "玫瑰色托",
          }),
        ) +
        field(
          "蛋糕盒",
          toggles("box", ["none", "clear", "paper"], d.box, {
            none: "敞开陈列",
            clear: "透明盒",
            paper: "纸盒",
          }),
        ) +
        packageViewControls() +
        (d.box !== "none" ? colorInput("ribbon", d.ribbon, "缎带颜色") : "") +
        field(
          "随盒贺卡",
          '<input class="full-input" aria-label="贺卡文字" data-text="card" maxlength="45" placeholder="留一句给收礼人的话" value="' +
            esc(d.card) +
            '">',
        ) +
        '<label class="check-label"><input type="checkbox" data-check="sticker" ' +
        (d.sticker ? "checked" : "") +
        "> Sweetie 品牌贴纸</label>";
    }
    const modes = [
      ["orbit", "rotate", "旋转"],
      ...(assembly
        ? [
            ["fill", "whisk", "刮刀"],
            ["place", "plus", "放置"],
            ["move", "move", "移动"],
          ]
        : step === 2
          ? [["paint", "whisk", "刮刀"]]
          : step === 3
            ? [
                ["pipe", "pipe", "裱花"],
                ["move", "move", "移动"],
              ]
            : step === 4
              ? [
                  ["place", "plus", "放置"],
                  ["move", "move", "移动"],
                ]
              : []),
    ];
    host.innerHTML =
      title +
      (modes.length > 1
        ? '<div class="modebar">' +
          modes
            .map(
              ([k, ic, txt]) =>
                '<button data-ed="mode" data-mode="' +
                k +
                '" class="' +
                (mode === k ? "on" : "") +
                '">' +
                icon(ic, 14) +
                txt +
                "</button>",
            )
            .join("") +
          "</div>"
        : "") +
      body;
    if (step === 5) placeLetterEntry();
  }
  function changeStep(n) {
    if (n < 0 || n > 6) return;
    if (preview) {
      step = n;
      resetView(false);
      return;
    }
    const leavingLettering = step === 5;
    if (assembly || leavingLettering) view.cameraView(angle);
    assembly = false;
    updateAssembly();
    step = n;
    if (step === 6) showWrapped = true;
    if (step === 5) {
      auto = false;
      view.setAuto(false);
      view.cameraView("lettering");
    }
    selected = null;
    cut = step === 1;
    if (guided && n > guideProgress) {
      const staged = stageDesign(recipe.design, n);
      snapshot();
      for (let i = guideProgress + 1; i <= n; i++) {
        if (i === 1) d.fillings = clone(staged.fillings);
        if (i === 2)
          Object.assign(d, {
            finish: staged.finish,
            color: staged.color,
            color2: staged.color2,
          });
        if (i === 3 || i === 4) {
          const types = staged.items.filter((x) =>
            i === 3 ? x.type.startsWith("pipe-") : !x.type.startsWith("pipe-"),
          );
          d.items.push(
            ...clone(types).filter((x) => !d.items.some((y) => y.id === x.id)),
          );
        }
        if (i === 5)
          for (const key of [
            "text",
            "textColor",
            "textSize",
            "textArc",
            "textX",
            "textZ",
            "textStyle",
            "textRotation",
            "textPlacement",
          ])
            d[key] = staged[key];
        if (i === 6)
          for (const key of ["board", "box", "ribbon", "card", "sticker"])
            d[key] = staged[key];
      }
      guideProgress = n;
    }
    view.setCut(cut);
    view.setMode(modeOfStep());
    setMode(modeOfStep());
    stepNav();
    sync();
    root.querySelector(".drawer").scrollTop = 0;
    const next = root.querySelector('[data-ed="next"]');
    if (next)
      next.innerHTML =
        icon(step === 6 ? "eye" : "next", 16) +
        (step === 6 ? "欣赏成品" : "下一步");
  }
  function setColor(k, val, panel = true) {
    if (k === "piping") {
      pipingColor = val;
      setMode("pipe");
      if (panel) drawer();
      return;
    }
    mutate(
      () => {
        if (k === "sel-color") {
          const a = selectedItem();
          if (a) a.color = val;
        } else {
          d[k] = val;
          if (k === "color" || k === "color2") {
            paintPot = null;
            if (k === "color2" && !["gradient", "marble"].includes(d.finish))
              d.finish = "gradient";
          }
        }
      },
      { panel },
    );
  }
  function resetView(toPreview) {
    assembly = false;
    view.dispose();
    preview = toPreview;
    auto = false;
    showWrapped = !toPreview && step === 6;
    cut = false;
    angle = Number.isFinite(d.referenceAngle) ? "reference" : "angle";
    shell();
    if (toPreview) app.play("save");
  }
  async function record() {
    const photo = view.capture();
    const im = new Image();
    im.src = photo;
    await im.decode();
    const c = document.createElement("canvas");
    c.width = Math.min(1100, im.width);
    c.height = Math.round((im.height * c.width) / im.width);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    return {
      ...current(),
      name: name.trim() || "我的手作蛋糕",
      creator: creator.trim(),
      date: Date.now(),
      design: clone(d),
      photo: c.toDataURL("image/jpeg", 0.9),
      id: id || uid(),
    };
  }
  async function save() {
    const work = await record();
    await storeWork(work);
    id = work.id;
    name = work.name;
    draft();
    app.closeSheet();
    app.play("save");
    app.notify("已保存到我的甜品屋");
  }
  function savePrompt() {
    app.openSheet(
      '<form id="save-form" class="simple-sheet"><h2>收进我的甜品屋</h2><label class="text-label">蛋糕名称<input name="name" maxlength="40" required value="' +
        esc(name) +
        '"></label><label class="text-label">创作者<input name="creator" maxlength="32" placeholder="你的名字" value="' +
        esc(creator) +
        '"></label><button class="primary wide" type="submit">' +
        icon("save") +
        " 保存作品</button></form>",
    );
    document.querySelector("#save-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      name = String(f.get("name")).trim() || "我的手作蛋糕";
      creator = String(f.get("creator")).trim();
      const b = e.target.querySelector("button");
      b.disabled = true;
      try {
        await save();
        if (preview) drawer();
      } catch (err) {
        b.disabled = false;
        app.notify(err.message);
      }
    };
  }
  function undo(backward) {
    const from = backward ? past : future,
      to = backward ? future : past;
    if (!from.length) return;
    to.push(clone(d));
    d = from.pop();
    if (!selectedItem()) selected = null;
    tier = Math.min(tier, d.layers - 1);
    spongeTier = Math.min(spongeTier, d.layers - 1);
    sync();
  }
  async function click(e) {
    const el = e.target.closest("[data-ed]");
    if (!el || el.disabled) return;
    const key = el.dataset.key,
      val = el.dataset.val,
      cmd = el.dataset.ed;
    app.play("tap");
    if (cmd === "step") changeStep(+val);
    if (cmd === "next") {
      if (step === 6) resetView(true);
      else changeStep(step + 1);
    }
    if (cmd === "clear-letter-position") {
      mutate(() => {
        d.textX = d.textZ = d.textRotation = 0;
        d.textPosition = "auto";
      });
    }
    if (cmd === "phrase") {
      mutate(() => {
        d.text = val;
      });
    }
    if (cmd === "package-view") {
      showWrapped = val === "box";
      view.setPackagingVisible(showWrapped);
      drawer();
    }
    if (cmd === "mode") {
      setMode(el.dataset.mode);
      if (assembly) drawer();
    }
    if (cmd === "sponge-tier") {
      spongeTier = +val;
      drawer();
    }
    if (cmd === "dip" || cmd === "blade-action" || cmd === "blade-width") {
      if (cmd === "dip") {
        if (assembly) fillingPot = val || null;
        else paintPot = val || null;
        brushAction = "spread";
      }
      if (cmd === "blade-action") brushAction = val;
      if (cmd === "blade-width") brushWidth = Number(val);
      setMode(assembly ? "fill" : "paint");
      drawer();
    }
    if (cmd === "digit") {
      digit = val;
      selected = null;
      setMode("place");
      drawer();
      syncToolbar();
    }
    if (cmd === "set")
      mutate(() => {
        d[key] = ["size", "layers"].includes(key) ? Number(val) : val;
        if (key === "layers") {
          d.fillings = Array.from(
            { length: d.layers },
            (_, i) => d.fillings[i] || "cream",
          );
          if (d.fillingPieces) d.fillingPieces.length = d.layers;
          if (d.fillingCoverage) d.fillingCoverage.length = d.layers;
          if (d.fillingPaint) d.fillingPaint.length = d.layers;
          if (d.fillingBaseColors) d.fillingBaseColors.length = d.layers;
          if (d.creamPaint) {
            const remaining = d.creamPaint.strokes.filter(
              (s) => s.tier < d.layers,
            );
            if (remaining.length)
              d.creamPaint = { ...d.creamPaint, strokes: remaining };
            else {
              d.coverage = d.creamPaint.base || 0;
              delete d.creamPaint;
            }
          }
          if (d.layerFlavors) d.layerFlavors = spongeFlavors(d);
          tier = Math.min(tier, d.layers - 1);
          spongeTier = Math.min(spongeTier, d.layers - 1);
        }
        if (key === "height") delete d.heightRatio;
        if (key === "box") {
          showWrapped = true;
          app.play("paper");
        }
      });
    if (cmd === "set" && key === "textPlacement") view.cameraView("lettering");
    if (cmd === "set-color") setColor(key, val);
    if (cmd === "ingredient") {
      if (key === "flavor")
        mutate(() => {
          const f = spongeFlavors(d);
          f[spongeTier] = val;
          d.layerFlavors = f;
          d.flavor = f[0];
        });
      if (key === "cut-choice" || key === "filling-cut") {
        const kind = fruitKind(val);
        if (kind) {
          cuts.set(kind, val);
          if (key === "filling-cut") fillFruit = kind;
          else material = kind;
          selected = null;
          setMode("place");
          drawer();
          syncToolbar();
        }
      }
      if (key === "filling")
        mutate(() => {
          d.fillings[tier] = val;
          if (d.fillingBaseColors) delete d.fillingBaseColors[tier];
        });
      if (key === "nozzle") {
        nozzle = val;
        setMode("pipe");
        drawer();
      }
      if (key === "material") {
        material = val;
        selected = null;
        syncToolbar();
        setMode("place");
        drawer();
      }
    }
    if (cmd === "assembly") {
      assembly = !assembly;
      selected = null;
      syncToolbar();
      view.cameraView(assembly ? "spread" : "angle");
      cut = false;
      view.setCut(false);
      if (assembly && !d.fillings[tier]) {
        mutate(() => (d.fillings[tier] = "cream"));
      }
      updateAssembly();
      setMode(assembly ? "fill" : "orbit");
      drawer();
      root.querySelector(".drawer").scrollTop = 0;
      app.play("place");
    }
    if (cmd === "fruit-tool") {
      setMode("place");
      drawer();
      root.querySelector(".drawer").scrollTop = 0;
    }
    if (cmd === "fill-tool") {
      setMode("fill");
      drawer();
    }
    if (cmd === "fill-all") {
      mutate(() => {
        d.fillingCoverage ??= [];
        d.fillingCoverage[tier] = 1;
        if (d.fillingPaint) delete d.fillingPaint[tier];
        if (fillingPot) {
          d.fillingBaseColors ??= [];
          d.fillingBaseColors[tier] = creamBowls.find(
            (b) => b.id === fillingPot,
          )?.color;
        } else if (d.fillingBaseColors) delete d.fillingBaseColors[tier];
      });
      setMode("place");
      drawer();
    }
    if (cmd === "ingredient" && key === "fruit-piece") {
      fillFruit = val;
      selected = null;
      syncToolbar();
      setMode("place");
      drawer();
    }
    if (cmd === "group") {
      group = val;
      selected = null;
      syncToolbar();
      material = drawers[val][0];
      setMode("place");
      drawer();
    }
    if (cmd === "tier") {
      tier = +val;
      selected = null;
      syncToolbar();
      if (assembly) updateAssembly();
      drawer();
    }
    if (cmd === "full-cover" || cmd === "uncover") {
      mutate(() => {
        delete d.creamPaint;
        d.coverage = cmd === "full-cover" ? 1 : 0;
        if (d.coverage && paintPot)
          d.color = creamBowls.find((b) => b.id === paintPot)?.color || d.color;
      });
      fx("scrape");
    }
    if (cmd === "ring") {
      const count = Math.round(5.5 / spacing);
      mutate(() => {
        for (let i = 0; i < count; i++) {
          const a = (i / count) * 2 * Math.PI,
            p = outline(d.shape, a),
            next = outline(d.shape, a + 0.001);
          const item = makeItem(
            { x: p.x * 0.86, y: 1, z: p.z * 0.86, nx: 0, ny: 1, nz: 0 },
            nozzle,
          );
          item.rotation += Math.atan2(next.x - p.x, next.z - p.z);
          d.items.push(item);
        }
      });
      view.animatePlacement(d.items.slice(-count).map((item) => item.id));
      app.play("pipe");
    }
    if (cmd === "auto") {
      auto = !auto;
      view.setAuto(auto);
      syncTools();
    }
    if (cmd === "cut") {
      if (assembly) {
        assembly = false;
        updateAssembly();
        setMode("orbit");
      }
      cut = !cut;
      view.setCut(cut);
      drawer();
      syncTools();
    }
    if (cmd === "camera" || cmd === "angle") {
      angle =
        cmd === "camera"
          ? Number.isFinite(d.referenceAngle)
            ? "reference"
            : "angle"
          : val;
      view.cameraView(!preview && step === 5 ? "lettering" : angle);
      if (preview) {
        auto = false;
        view.setAuto(false);
        drawer();
        syncTools();
      }
    }
    if (cmd === "zoomin" || cmd === "zoomout")
      view.zoom(cmd === "zoomin" ? 0.15 : -0.15);
    if (cmd === "undo" || cmd === "redo") undo(cmd === "undo");
    if (
      ["turn-left", "turn-right", "piece-smaller", "piece-larger"].includes(cmd)
    ) {
      const a = selectedItem();
      if (a)
        mutate(() => {
          if (cmd.startsWith("turn-")) {
            const r =
              (a.rotation || 0) +
              ((cmd === "turn-left" ? -1 : 1) * Math.PI) / 12;
            a.rotation = Math.atan2(Math.sin(r), Math.cos(r));
          } else
            a.scale = Math.min(
              2.2,
              Math.max(
                0.35,
                Math.round(
                  ((a.scale || 1) + (cmd === "piece-smaller" ? -0.15 : 0.15)) *
                    100,
                ) / 100,
              ),
            );
        });
    }
    if (cmd === "delete" || cmd === "piece-remove")
      mutate(() => {
        if (assembly)
          d.fillingPieces[tier] = (d.fillingPieces?.[tier] || []).filter(
            (x) => x.id !== selected,
          );
        else d.items = d.items.filter((x) => x.id !== selected);
        selected = null;
      });
    if (cmd === "copy") {
      const item = selectedItem();
      if (item)
        mutate(() => {
          const copy = clone(item);
          copy.id = uid();
          if (assembly) {
            copy.x *= 0.82;
            copy.z *= 0.82;
            if (Math.abs(copy.x) + Math.abs(copy.z) < 0.05) copy.x += 0.12;
            selected = copy.id;
            d.fillingPieces[tier].push(copy);
            return;
          }
          if (copy.point.ny > 0.5) {
            copy.point.x *= 0.87;
            copy.point.z *= 0.87;
            if (Math.abs(copy.point.x) + Math.abs(copy.point.z) < 0.04)
              copy.point.x += 0.14;
          } else {
            const { x, z, nx, nz } = copy.point,
              a = 0.17;
            Object.assign(copy.point, {
              x: x * Math.cos(a) - z * Math.sin(a),
              z: x * Math.sin(a) + z * Math.cos(a),
              nx: nx * Math.cos(a) - nz * Math.sin(a),
              nz: nx * Math.sin(a) + nz * Math.cos(a),
            });
          }
          selected = copy.id;
          d.items.push(copy);
        });
    }
    if (cmd === "materials")
      app.openSheet(
        '<div class="simple-sheet"><small class="eyebrow">INGREDIENTS</small><h2>材料清单</h2><ul class="material-list">' +
          materials(d)
            .map((s) => "<li>" + esc(s) + "</li>")
            .join("") +
          "</ul><p>参考报价 ¥ " +
          quote(d) +
          "（演示价格）</p></div>",
      );
    if (cmd === "reference") {
      const r = recipe || recipes[0];
      app.openSheet(
        '<div class="simple-sheet reference-sheet"><small class="eyebrow">RECIPE ' +
          String(r.id).padStart(2, "0") +
          "</small><h2>" +
          esc(r.name) +
          '</h2><img src="' +
          asset("cake-" + r.id + ".webp") +
          '" alt="' +
          esc(r.name) +
          '"><p>' +
          esc(r.tips[step]) +
          "</p><details><summary>查看全部工序</summary><ol>" +
          r.tips.map((t) => "<li>" + esc(t) + "</li>").join("") +
          "</ol></details></div>",
      );
    }
    if (cmd === "preview") resetView(true);
    if (cmd === "back-edit") resetView(false);
    if (cmd === "bg") {
      background = val;
      view.setBackground(val);
      drawer();
    }
    if (cmd === "save") savePrompt();
    if (cmd === "png" || cmd === "pdf") {
      el.disabled = true;
      try {
        await exportWork(await record(), cmd);
        app.notify(
          cmd === "pdf" ? "已导出 PDF 定制需求单" : "已导出 PNG 设计卡",
        );
      } catch (err) {
        app.notify("导出失败，请重试");
        console.error(err);
      } finally {
        el.disabled = false;
      }
    }
  }
  function input(e) {
    const el = e.target;
    if (el.hasAttribute("data-piece-type")) {
      const a = selectedItem();
      if (a)
        mutate(() => {
          a.type = el.value;
        });
      return;
    }
    if (el.dataset.meta) {
      if (el.dataset.meta === "name") name = el.value;
      else creator = el.value;
      const caption = root.querySelector("[data-photo-name]");
      if (caption) {
        caption.textContent = name.trim() || "我的手作蛋糕";
        root.querySelector("[data-photo-author]").textContent = creator.trim()
          ? " · " + creator.trim()
          : "";
      }
      queueDraft();
      return;
    }
    if (el.dataset.text) {
      mutate(() => (d[el.dataset.text] = el.value), { panel: false });
      return;
    }
    if (el.dataset.color) {
      setColor(el.dataset.color, el.value, false);
      el.parentNode.querySelector("code").textContent = el.value;
      return;
    }
    if (el.dataset.check) {
      mutate(() => (d[el.dataset.check] = el.checked));
      return;
    }
    const k = el.dataset.range;
    if (!k) return;
    const v = +el.value;
    el.nextElementSibling.textContent = v;
    if (k === "item-size") itemSize = v;
    else if (k === "spacing") spacing = v;
    else if (k === "direction") direction = v;
    else
      mutate(
        () => {
          const a = selectedItem();
          if (k === "sel-rot" && a) a.rotation = (v * Math.PI) / 180;
          else if (k === "sel-size" && a) a.scale = v;
          else if (k === "textX" || k === "textZ") {
            if (d.textPosition !== "manual" && !d.textX && !d.textZ) {
              const pos = view.letteringPosition();
              if (pos) {
                d.textX = pos.x;
                d.textZ = pos.z;
              }
            }
            d.textPosition = "manual";
            d[k] = v;
          } else d[k] = v;
        },
        { panel: false },
      );
  }
  function endStroke() {
    if (stroke) {
      releaseScrape();
      lastPaintPoint = null;
      stroke = false;
      gestureSaved = false;
      if (step === 3 && mode === "pipe" && !preview) drawer();
    }
  }
  function keys(e) {
    if (
      document.querySelector("dialog[open]") ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    )
      return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo(!e.shiftKey);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      savePrompt();
    }
  }
  function drag(e) {
    const b = e.target.closest("[draggable=true]");
    if (!b) return;
    const key = b.dataset.key,
      val = b.dataset.val;
    const type =
      key === "material" && val === "number"
        ? "number-" + digit
        : key === "material" || key === "fruit-piece"
          ? cutFor(val)
          : val;
    e.dataTransfer.setData("application/x-sweetie", type);
  }
  shell();
  narrow.addEventListener("change", placeLetterEntry);
  root.addEventListener("click", click);
  root.addEventListener("input", input);
  root.addEventListener("dragstart", drag);
  window.addEventListener("pointerup", endStroke);
  window.addEventListener("pointercancel", endStroke);
  window.addEventListener("keydown", keys);
  window.addEventListener("pagehide", draft);
  queueDraft();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      narrow.removeEventListener("change", placeLetterEntry);
      releaseScrape();
      draft();
      root.removeEventListener("click", click);
      root.removeEventListener("input", input);
      root.removeEventListener("dragstart", drag);
      window.removeEventListener("pointerup", endStroke);
      window.removeEventListener("pointercancel", endStroke);
      window.removeEventListener("keydown", keys);
      window.removeEventListener("pagehide", draft);
      view.dispose();
    },
  };
}
