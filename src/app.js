import {
  recipes,
  blankDesign,
  stageDesign,
  materials,
  label,
  quote,
  resolveRecipeReference,
} from "./recipes.js";
import { icon, cherries, asset, esc, stepNames } from "./ui.js";
import {
  readLocal,
  writeLocal,
  storeWork,
  loadWorks,
  removeWork,
  uid,
} from "./storage.js";
import { soundEnabled, toggleSound, play, startAudio } from "./sound.js";

const main = document.querySelector("#main"),
  sheet = document.querySelector("#sheet"),
  header = document.querySelector("#header"),
  footer = document.querySelector("#footer");
const navs = [
  ["home", "工坊首页"],
  ["gallery", "灵感橱窗"],
  ["journal", "甜品手札"],
  ["library", "我的甜品屋"],
];
let firstVisit = true;
let page = "",
  filter = "全部",
  favorite = readLocal("favorites", []),
  heroIndex = 0,
  libTab = "works",
  works = [],
  detail = null,
  modalInstance = null,
  editor = null,
  epoch = 0,
  modalEpoch = 0,
  initialEditor = null,
  toastTimer;
const num = (n) => String(n).padStart(2, "0");
const photo = (r) => asset("cake-" + r.id + ".webp");
const tagNames = [
  "法式复古",
  "鲜果奶油",
  "芭蕾缎带",
  "花园系列",
  "珍珠奶油",
  "油画花卉",
  "韩系极简",
  "童话系列",
  "森系花园",
  "宫廷复古",
];
function notify(msg) {
  const t = document.querySelector("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2300);
}
function navigation() {
  header.classList.remove("menu-open");
  header.innerHTML =
    '<div class="nav-inner"><a class="brand" href="#home" aria-label="Sweetie 工坊首页">' +
    cherries +
    '<span>Sweetie</span></a><nav aria-label="主导航">' +
    navs
      .map(
        ([k, v]) =>
          '<a href="#' +
          k +
          '" ' +
          (page === k ? 'aria-current="page"' : "") +
          ">" +
          v +
          "</a>",
      )
      .join("") +
    '</nav><div class="nav-actions"><button type="button" class="sound-button" data-act="sound" aria-pressed="' +
    soundEnabled() +
    '" title="' +
    (soundEnabled() ? "关闭" : "开启") +
    '工坊声音">' +
    icon(soundEnabled() ? "sound" : "muted", 17) +
    "<span>声音" +
    (soundEnabled() ? "开" : "关") +
    '</span></button><button class="mobile-menu circle" aria-label="展开导航" aria-expanded="false" data-act="menu">' +
    icon("menu") +
    "</button></div></div>";
}
function closeSheet() {
  if (sheet.open) sheet.close();
  modalEpoch++;
  modalInstance?.dispose();
  modalInstance = null;
  detail = null;
}
function openSheet(content, cls = "") {
  closeSheet();
  sheet.className = cls;
  sheet.innerHTML =
    '<button class="circle sheet-x" data-act="close" aria-label="关闭">' +
    icon("close") +
    "</button>" +
    content;
  sheet.showModal();
  sheet.scrollTop = 0;
}
sheet.addEventListener("close", () => {
  if (!sheet.open) {
    modalInstance?.dispose();
    modalInstance = null;
    detail = null;
  }
});
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) {
    const r = sheet.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeSheet();
  }
});
function goto(id) {
  if (location.hash === "#" + id) {
    render();
  } else location.hash = id;
}
function current() {
  const k = location.hash.slice(1).split("/")[0];
  return ["gallery", "journal", "library", "edit"].includes(k) ? k : "home";
}
function favoriteButton(id) {
  const yes = favorite.includes(id);
  return (
    '<button class="like' +
    (yes ? " active" : "") +
    '" data-act="favorite" data-id="' +
    id +
    '" title="' +
    (yes ? "取消收藏" : "收藏灵感") +
    '" aria-label="' +
    (yes ? "取消收藏" : "收藏") +
    esc(recipes[id - 1].name) +
    '" aria-pressed="' +
    yes +
    '">' +
    icon("heart", 17) +
    "</button>"
  );
}
function card(r) {
  return (
    '<article class="recipe-card"><div class="card-photo"><button class="photo-link" data-act="detail" data-id="' +
    r.id +
    '" aria-label="查看' +
    esc(r.name) +
    '"><img loading="lazy" src="' +
    photo(r) +
    '" alt="' +
    esc(r.name) +
    '蛋糕"><span class="card-tag">' +
    tagNames[r.id - 1] +
    "</span></button>" +
    favoriteButton(r.id) +
    '</div><button class="caption" data-act="detail" data-id="' +
    r.id +
    '"><span><strong>' +
    esc(r.name) +
    '</strong></span><span class="caption-arrow">' +
    icon("upRight", 16) +
    "</span></button></article>"
  );
}
function hero() {
  const r = recipes[heroIndex];
  return (
    '<section class="hero slide-' +
    heroIndex +
    '" aria-label="Sweetie 工坊封面"><img class="hero-photo" src="' +
    (heroIndex === 0 ? asset("hero.webp") : photo(r)) +
    '" alt="' +
    esc(r.name) +
    '甜品摄影" fetchpriority="high"><div class="hero-veil"></div><div class="hero-inner"><div class="hero-copy"><h1>Sweetie<span class="hero-stars">' +
    icon("star", 26) +
    icon("star", 13) +
    '</span></h1><h2>让甜蜜的想象，变成专属的蛋糕</h2><p>在 3D 转台上亲手完成你的作品。</p><div class="hero-actions"><button class="primary" data-act="start">' +
    icon("pipe", 19) +
    " 开始创作 " +
    icon("next", 16) +
    '</button><a class="secondary" href="#journal">' +
    icon("book", 17) +
    ' 甜品手札</a></div></div><div class="hero-pages" aria-label="封面切换"><span>' +
    num(heroIndex + 1) +
    "</span><div>" +
    [0, 1, 2, 3]
      .map(
        (i) =>
          '<button data-act="hero" data-id="' +
          i +
          '" aria-label="封面 ' +
          (i + 1) +
          '" aria-pressed="' +
          (heroIndex === i) +
          '"></button>',
      )
      .join("") +
    '</div><small>04</small></div><button class="cover-note" data-act="detail" data-id="' +
    r.id +
    '"><span></span>' +
    r.name +
    "<i> / </i>封面配方 " +
    icon("upRight", 14) +
    "</button></div></section>"
  );
}
function sectionTitle(title, { subtitle = "", link = "" } = {}) {
  return (
    '<div class="section-heading"><div><h2>' +
    title +
    "</h2>" +
    (subtitle ? "<i>" + esc(subtitle) + "</i>" : "") +
    "</div>" +
    link +
    "</div>"
  );
}
function home() {
  main.innerHTML =
    hero() +
    '<section class="container home-gallery">' +
    sectionTitle(
      "灵感橱窗",
      { link: '<a class="text-link" href="#gallery">浏览全部 ' + icon("next", 16) + "</a>" },
    ) +
    '<div class="recipe-grid">' +
    recipes.slice(0, 4).map(card).join("") +
    "</div></section>";
}
function gallery() {
  const cat = ["全部", "复古奶油", "鲜果花园", "浪漫幻想"];
  const list = recipes.filter(
    (r) => filter === "全部" || r.category === filter,
  );
  main.innerHTML =
    '<section class="container collection">' +
    sectionTitle("灵感橱窗") +
    '<div class="filter-row"><div class="tabs">' +
    cat
      .map(
        (t) =>
          '<button data-act="filter" data-name="' +
          t +
          '" class="' +
          (t === filter ? "on" : "") +
          '">' +
          t +
          "</button>",
      )
      .join("") +
    "</div><small>" +
    num(list.length) +
    ' 款配方</small></div><div class="recipe-grid">' +
    list.map(card).join("") +
    "</div></section>";
}
function journal() {
  main.innerHTML =
    '<section class="container collection">' +
    sectionTitle("甜品手札") +
    '<p class="lede">翻开一份配方，看蛋糕如何从一块松软的胚体，变成橱窗里的模样。</p><div class="journal-grid">' +
    recipes
      .map(
        (r) =>
          '<button class="journal-card" data-act="tutorial" data-id="' +
          r.id +
          '"><img src="' +
          photo(r) +
          '" loading="lazy" alt="' +
          esc(r.name) +
          '"><div><small>' +
          esc(r.difficulty) +
          "</small><h3>" +
          esc(r.name) +
          "</h3><span>翻开手札 " +
          icon("next", 14) +
          "</span></div></button>",
      )
      .join("") +
    "</div></section>";
}
async function library(gen) {
  works = (await loadWorks()).sort((a, b) => b.date - a.date);
  if (gen !== epoch) return;
  const list = recipes.filter((r) => favorite.includes(r.id));
  const empty = libTab === "works" ? !works.length : !list.length;
  main.innerHTML =
    '<section class="container collection">' +
    sectionTitle("我的甜品屋", { subtitle: "My Cake Cabinet" }) +
    '<div class="filter-row"><div class="tabs"><button data-act="libtab" data-name="works" class="' +
    (libTab === "works" ? "on" : "") +
    '">我的作品 · ' +
    works.length +
    '</button><button data-act="libtab" data-name="stars" class="' +
    (libTab === "stars" ? "on" : "") +
    '">收藏灵感 · ' +
    list.length +
    "</button></div><small>保存在此浏览器</small></div>" +
    (empty
      ? '<div class="empty">' +
        (libTab === "works" ? icon("cake", 42) : icon("heart", 38)) +
        "<h3>" +
        (libTab === "works"
          ? "第一只蛋糕，等你来做"
          : "把喜欢的配方收进甜品屋") +
        "</h3><p>" +
        (libTab === "works"
          ? "在工作台保存后，作品会出现在这里。"
          : "点一下橱窗照片上的爱心，就可以在这里找到它。") +
        "</p>" +
        (libTab === "works"
          ? '<button class="primary" data-act="start">开始创作 ' +
            icon("next") +
            "</button>"
          : '<a class="primary" href="#gallery">去灵感橱窗 ' +
            icon("next") +
            "</a>") +
        "</div>"
      : libTab === "stars"
        ? '<div class="recipe-grid">' + list.map(card).join("") + "</div>"
        : '<div class="recipe-grid">' +
          works
            .map(
              (w) =>
                '<article class="work-card"><button class="work-photo" data-act="loadwork" data-id="' +
                esc(w.id) +
                '"><img src="' +
                esc(w.photo) +
                '" alt="' +
                esc(w.name) +
                '"></button><h3>' +
                esc(w.name) +
                "</h3><small>" +
                esc(w.creator || "Sweetie 手作人") +
                " · " +
                new Date(w.date).toLocaleDateString("zh-CN") +
                '</small><div class="work-actions"><button data-act="loadwork" data-id="' +
                esc(w.id) +
                '">继续制作</button><button class="miniicon" data-act="copywork" data-id="' +
                esc(w.id) +
                '" aria-label="复制作品">' +
                icon("copy", 16) +
                '</button><button class="miniicon" data-act="deletework" data-id="' +
                esc(w.id) +
                '" aria-label="删除作品">' +
                icon("trash", 16) +
                "</button></div></article>",
            )
            .join("") +
          "</div>") +
    "</section>";
}
function openDoors(container) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const doors = document.createElement("div");
  doors.className = "shop-doors";
  doors.setAttribute("aria-hidden", "true");
  doors.innerHTML = "<i></i><i></i>";
  container.append(doors);
  setTimeout(() => doors.remove(), 1050);
}
function enterEditor(payload) {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const fx = document.createElement("div");
    fx.className = "entry-fade";
    document.body.append(fx);
    setTimeout(() => fx.remove(), 800);
  }
  initialEditor = payload;
  closeSheet();
  goto("edit");
}
function start() {
  const draft = readLocal("draft", null);
  if (draft?.design) {
    openSheet(
      '<div class="simple-sheet">' +
        icon("cake", 32) +
        "<h2>回到工作台</h2><p>你上次正在制作「" +
        esc(draft.name || "我的手作蛋糕") +
        '」。</p><div class="button-row"><button class="primary" data-act="resume">继续制作</button><button class="secondary" data-act="new">从零开始</button></div></div>',
    );
  } else enterEditor({ design: blankDesign(), step: 0 });
}
async function showRecipe(r) {
  openSheet(
    '<div class="recipe-detail"><div class="detail-image"><img src="' +
      photo(r) +
      '" alt="' +
      esc(r.name) +
      '"><div class="image-caption">' +
      (r.id <= 4 ? "灵感摄影" : "配方渲染") +
      '</div></div><div class="detail-copy"><h2>' +
      esc(r.name) +
      "</h2><p>" +
      esc(r.desc) +
      '</p><div class="specs"><span>' +
      icon("cake") +
      r.design.size +
      " 寸 · " +
      r.design.layers +
      " 层</span><span>" +
      icon("layers") +
      esc(label(r.design.flavor)) +
      "胚</span><span>" +
      icon("pipe") +
      esc(r.difficulty) +
      "</span></div><details><summary>配方材料 " +
      icon("down", 15) +
      "</summary><ul>" +
      materials(r.design)
        .map((t) => "<li>" + esc(t) + "</li>")
        .join("") +
      '</ul></details><button class="primary wide" data-act="inspire" data-id="' +
      r.id +
      '">' +
      icon("pipe") +
      " 以它为灵感 " +
      icon("next", 15) +
      '</button><div class="button-row"><button class="secondary" data-act="tutorial" data-id="' +
      r.id +
      '">' +
      icon("book") +
      " 跟着做</button>" +
      favoriteButton(r.id) +
      "</div></div></div>",
    "recipe-dialog",
  );
  detail = r;
}
async function tutorial(r, step = 0) {
  openSheet(
    '<div class="tutorial-sheet"><div class="tutorial-canvas"><div class="loading">正在准备转台…</div></div><div class="tutorial-copy"><h2>' +
      esc(r.name) +
      '</h2><div class="tutorial-steps">' +
      stepNames
        .map(
          (v, i) =>
            '<button data-act="tstep" data-id="' +
            i +
            '" title="' +
            v +
            '" class="' +
            (step === i ? "on" : "") +
            '">' +
            (i + 1) +
            "</button>",
        )
        .join("") +
      '</div><div class="tutorial-text"></div><div class="button-row"><button class="secondary" data-act="tprev">' +
      icon("prev", 15) +
      ' 上一步</button><button class="primary" data-act="tnext">下一步 ' +
      icon("next", 16) +
      '</button></div><button class="text-link" data-act="guided" data-id="' +
      r.id +
      '">打开配方，在工作台跟做 ' +
      icon("upRight", 15) +
      "</button></div></div>",
    "tutorial-dialog",
  );
  detail = { r, step };
  const gen = modalEpoch;
  tutorialStep(step);
  const host = sheet.querySelector(".tutorial-canvas");
  try {
    const { createViewport } = await import("./cake3d.js");
    if (gen !== modalEpoch || !sheet.open) return;
    host.innerHTML = "";
    modalInstance = createViewport(host, {});
    tutorialStep(step);
  } catch {
    if (gen === modalEpoch)
      host.innerHTML =
        '<p class="loading">当前浏览器无法启动 3D 预览，请开启硬件加速。</p>';
  }
}
function tutorialStep(i) {
  if (!detail?.r) return;
  detail.step = i;
  const r = detail.r;
  sheet.querySelector(".tutorial-text").innerHTML =
    "<i>第 " +
    (i + 1) +
    " 步</i><h3>" +
    stepNames[i] +
    "</h3><p>" +
    esc(r.tips[i]) +
    "</p>";
  sheet
    .querySelectorAll('[data-act="tstep"]')
    .forEach((b, n) => b.classList.toggle("on", n === i));
  sheet.querySelector('[data-act="tprev"]').disabled = i === 0;
  sheet.querySelector('[data-act="tnext"]').innerHTML =
    i === 6 ? "进入工作台 " + icon("next", 15) : "下一步 " + icon("next", 15);
  modalInstance?.setDesign(stageDesign(r.design, i));
  modalInstance?.setPackagingVisible(i === 6);
  modalInstance?.cameraView(i === 5 ? "lettering" : "reference");
  modalInstance?.setCut(i === 1);
}
function footerUI() {
  footer.innerHTML =
    '<div class="footer-inner"><a href="#home" class="footer-word">Sweetie</a><span>让甜蜜的想象，变成专属的蛋糕</span><button data-act="credits">制作与素材</button></div>';
}
async function render() {
  const gen = ++epoch;
  if (editor) {
    editor.dispose();
    editor = null;
  }
  closeSheet();
  page = current();
  document.body.dataset.page = page;
  navigation();
  footerUI();
  window.scrollTo({ top: 0, behavior: "instant" });
  document.title =
    page === "edit"
      ? "手作工作台 · Sweetie"
      : (navs.find((n) => n[0] === page)?.[1] || "蛋糕工坊") + " · Sweetie";
  if (page === "home") {
    home();
    if (firstVisit) openDoors(main.querySelector(".hero"));
    firstVisit = false;
  }
  if (page === "gallery") gallery();
  if (page === "journal") journal();
  if (page === "library") await library(gen);
  if (page === "edit") {
    main.innerHTML = '<div class="loading">正在打开手作台…</div>';
    const p = initialEditor ||
      readLocal("draft", null) || { design: blankDesign(), step: 0 };
    initialEditor = null;
    try {
      const { createEditor } = await import("./editor.js");
      if (gen !== epoch) return;
      editor = await createEditor(main, p, {
        notify,
        openSheet,
        closeSheet,
        goto,
        play,
      });
    } catch (e) {
      console.error(e);
      if (gen === epoch)
        main.innerHTML =
          '<div class="empty"><h2>工作台暂时无法打开</h2><p>请在支持 WebGL 的 Safari 或 Chrome 中开启硬件加速，然后重新打开。</p><a class="primary" href="#home">返回首页</a></div>';
    }
  }
}
document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const a = el.dataset.act,
    id = el.dataset.id,
    r = recipes[Number(id) - 1];
  if (a === "sound") {
    toggleSound();
    navigation();
    return;
  }
  if (a === "menu") {
    const x = header.classList.toggle("menu-open");
    el.setAttribute("aria-expanded", x);
    return;
  }
  header.classList.remove("menu-open");
  if (a === "close") {
    closeSheet();
    return;
  }
  play(a === "start" ? "door" : "tap");
  if (a === "start") start();
  if (a === "new") enterEditor({ design: blankDesign(), step: 0 });
  if (a === "resume") enterEditor(readLocal("draft", null));
  if (a === "hero") {
    heroIndex = Number(id);
    main.querySelector(".hero").outerHTML = hero();
  }
  if (a === "detail") showRecipe(r);
  if (a === "tutorial")
    tutorial(await resolveRecipeReference({ presetId: r.id }));
  if (a === "tstep") tutorialStep(Number(id));
  if (a === "tprev") tutorialStep(Math.max(0, detail.step - 1));
  if (a === "tnext") {
    if (detail.step === 6)
      enterEditor({
        design: structuredClone(detail.r.design),
        name: detail.r.name,
        recipeId: detail.r.id,
        step: 6,
        workflowVersion: 2,
      });
    else tutorialStep(detail.step + 1);
  }
  if (a === "inspire")
    enterEditor({
      design: structuredClone(r.design),
      name: r.name,
      recipeId: r.id,
      step: 4,
      workflowVersion: 2,
    });
  if (a === "guided")
    enterEditor({
      design: stageDesign(r.design, 0),
      name: r.name,
      recipeId: r.id,
      guided: true,
      step: 0,
    });
  if (a === "favorite") {
    const n = Number(id);
    favorite = favorite.includes(n)
      ? favorite.filter((i) => i !== n)
      : [...favorite, n];
    writeLocal("favorites", favorite);
    document
      .querySelectorAll('[data-act="favorite"][data-id="' + n + '"]')
      .forEach((b) => (b.outerHTML = favoriteButton(n)));
    if (page === "library" && libTab === "stars") await library(epoch);
    notify(favorite.includes(n) ? "已收藏到我的甜品屋" : "已取消收藏");
  }
  if (a === "filter") {
    filter = el.dataset.name;
    gallery();
  }
  if (a === "libtab") {
    libTab = el.dataset.name;
    await library(epoch);
  }
  if (a === "loadwork") {
    const w = works.find((w) => w.id === id);
    if (w) enterEditor({ ...structuredClone(w), step: 4, workflowVersion: 2 });
  }
  if (a === "copywork") {
    const w = works.find((w) => w.id === id);
    if (w) {
      try {
        await storeWork({
          ...w,
          id: uid(),
          name: w.name + " 副本",
          date: Date.now(),
        });
        await library(epoch);
        notify("已复制作品");
      } catch (e) {
        notify(e.message);
      }
    }
  }
  if (a === "deletework") {
    openSheet(
      '<div class="simple-sheet"><h2>删除这件作品？</h2><p>「' +
        esc(works.find((w) => w.id === id)?.name) +
        '」将从此浏览器的甜品屋移除。</p><div class="button-row"><button class="secondary" data-act="close">保留作品</button><button class="primary" data-act="confirm-delete" data-id="' +
        esc(id) +
        '">删除作品</button></div></div>',
    );
  }
  if (a === "confirm-delete") {
    try {
      await removeWork(id);
      if (readLocal("draft", {})?.id === id) writeLocal("draft", null);
      closeSheet();
      await library(epoch);
      notify("作品已删除");
    } catch (e) {
      notify(e.message);
    }
  }
  if (a === "credits") {
    if (window.SWEETIE_CREDITS) {
      openSheet(
        '<div class="simple-sheet"><h2>制作与素材</h2>' +
          window.SWEETIE_CREDITS +
          "</div>",
      );
      return;
    }
    openSheet(
      '<div class="simple-sheet"><h2>制作与素材</h2><p>橱窗前四款蛋糕以实拍照片为参考，配方报价仅作设计演示。</p><p><a class="text-link" href="./credits.html" target="_blank" rel="noopener">查看摄影作者 ' +
        icon("upRight", 15) +
        "</a></p></div>",
    );
  }
});
document.addEventListener(
  "pointerdown",
  () => {
    try {
      startAudio();
    } catch {}
  },
  { once: true },
);
window.addEventListener("hashchange", render);
render();
