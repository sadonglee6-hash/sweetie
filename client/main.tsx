import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Scene, Panel, type Spot } from "./Room";
import { Story, makeLine } from "./Story";
import {
  art,
  go,
  route,
  useGame,
  occasions,
  startWork,
  workPayload,
  type Room,
} from "./state";
import { blankDesign, creamBowls } from "../src/recipes.js";
import { recoverProgress } from "../src/progress.js";
import { readLocal } from "../src/storage.js";
import {
  audioSettings,
  startAudio,
  play,
  setAudio,
  setSoundScene,
} from "../src/sound.js";
import "../src/style.css";
import "./game.css";
const Specimen = lazy(() => import("./Specimen"));
const Studio = lazy(() => import("./Studio")),
  Book = lazy(() => import("./Book")),
  Album = lazy(() => import("./Album"));
const titles: Record<string, string> = {
  book: "食谱手札",
  album: "照片墙",
  settings: "收音机",
  history: "对话记录",
  materials: "材料柜",
  map: "店内导览",
  draft: "制作室",
  photo: "窗边摄影桌",
  specimen: "转动实物",
};
const loading = <p className="loading-ink">正在准备转台…</p>;
function App() {
  const [room, setRoom] = useState<Room>(route),
    [modal, setModal] = useState(""),
    [line, setLine] = useState(""),
    [auto, setAuto] = useState(false),
    [pins, showPins] = useState(false),
    [bookIndex, index] = useState(0),
    [guide, setGuide] = useState(false),
    [audio, updateAudio] = useState(audioSettings),
    [ingredient, selectIngredient] = useState("奶油"),
    [message, setMessage] = useState("");
  const game = useGame(),
    after = useRef<() => void>(null);
  useEffect(() => {
    const hash = () => {
      setModal("");
      setLine("");
      setRoom(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", hash);
    const unlock = () => startAudio();
    window.addEventListener("pointerdown", unlock, {
      once: true,
      capture: true,
    });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);
  useEffect(() => {
    setSoundScene(room);
    document.title = {
      street: "Sweetie! · 甜心来信",
      lobby: "店内 · Sweetie!",
      gallery: "灵感橱窗 · Sweetie!",
      album: "照片墙 · Sweetie!",
      workshop: "蛋糕制作室 · Sweetie!",
    }[room];
    document.body.dataset.page = room === "workshop" ? "edit" : room;
    if (room === "lobby" && !useGame.getState().visited) setLine("welcome");
    if (room === "album") setModal("album");
    const cb = after.current;
    after.current = null;
    cb?.();
  }, [room]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 2400);
    return () => clearTimeout(t);
  }, [message]);
  function move(r: Room, cb?: () => void) {
    if (room === r) {
      cb?.();
      return;
    }
    after.current = cb || null;
    go(r);
  }
  function openBook(i = 0, g = false) {
    index(i);
    setGuide(g);
    setModal("book");
    play("paper");
  }
  function close() {
    setModal("");
    if (room === "album") go("lobby");
  }
  function sound(key: string, value: any) {
    setAudio(key, value);
    updateAudio(audioSettings());
    if (key === "sound" && value) play("bell");
  }
  function explore() {
    game.patch({ visited: true });
    setLine("");
  }
  function consult(a: string, n?: number) {
    if (a === "chosen") {
      game.patch({ occasion: n! });
      setLine(a);
      return;
    }
    if (a === "suggested" || a === "blank") {
      const c = occasions[game.occasion ?? 0];
      const d = { ...blankDesign(), occasion: c.name, suggestedWish: c.wish };
      if (a === "suggested")
        Object.assign(d, { shape: c.shape, size: c.size, color: c.color });
      explore();
      startWork({ design: d, workflowVersion: 3 });
      return;
    }
    setLine(a);
  }
  function next() {
    if (line === "design") setLine("ask");
    if (line === "chosen") setLine("suggest");
    if (line === "show") {
      explore();
      move("gallery");
    }
    if (line === "teach") {
      explore();
      move("gallery", () => openBook(0, true));
    }
    if (line === "wander") explore();
  }
  const story = line ? makeLine(line, game.occasion ?? 0, consult) : null;
  function work(preview = false) {
    const d = readLocal("draft", null);
    if (d) {
      startWork({ ...d, preview });
      return;
    }
    if (preview) {
      setModal("photo");
      return;
    }
    startWork({ design: blankDesign(), workflowVersion: 3 });
  }
  const lobby: Spot[] = [
    {
      id: "mia",
      name: "和 Mia 说话",
      box: [42, 23, 17, 64],
      act: () => setLine("welcome"),
    },
    {
      id: "case",
      name: "蛋糕展示柜",
      box: [2, 43, 35, 40],
      act: () => move("gallery"),
    },
    {
      id: "book",
      name: "翻开食谱",
      box: [55, 42, 10, 10],
      act: () => move("gallery", () => openBook(0, true)),
    },
    {
      id: "workshop",
      name: "去制作室",
      box: [46, 26, 9, 15],
      act: () => setModal("draft"),
    },
    {
      id: "materials",
      name: "材料柜",
      box: [4, 4, 31, 31],
      act: () => setModal("materials"),
    },
    {
      id: "table",
      name: "窗边摄影桌",
      box: [81, 49, 18, 22],
      act: () => work(true),
    },
    {
      id: "photos",
      name: "照片墙",
      box: [55, 5, 12, 22],
      act: () => setModal("album"),
    },
    {
      id: "radio",
      name: "打开收音机",
      box: [68, 39, 8, 10],
      act: () => setModal("settings"),
    },
    {
      id: "exit",
      name: "回到街道",
      box: [44, 84, 12, 11],
      act: () => go("street"),
    },
  ];
  const street: Spot[] = [
    ["door", "推门进店", [74.4, 35, 11.1, 48]],
    ["bell", "轻触风铃", [82.4, 31.3, 4.3, 20.5]],
    ["cat", "摸摸小猫", [82.5, 70.9, 7.6, 19]],
    ["window", "橱窗里的蛋糕", [56.5, 37.5, 15, 28]],
    ["menu", "今日手写菜单", [36.4, 60.5, 10.5, 25]],
  ].map(([id, name, box]) => ({ id, name, box, act: () => {} })) as Spot[];
  const gallery: Spot[] = [
    "草莓来信",
    "巧克力恋曲",
    "柠檬花园",
    "香芋梦境",
  ].map((n, i) => ({
    id: "cake" + i,
    name: n,
    box: [16 + i * 17.15, 22.6, 16.15, 29.8],
    act: () => openBook(i),
  }));
  gallery.push({
    id: "recipe",
    name: "翻开全部十款食谱",
    box: [28, 56, 44, 36],
    act: () => openBook(0, true),
  });
  const startFromRoom = () => {
    if (readLocal("draft", null)) setModal("draft");
    else work();
  };
  return (
    <>
      <div className="game-world" data-room={room}>
        {room === "workshop" ? (
          <Suspense fallback={loading}>
            <Studio />
          </Suspense>
        ) : (
          <Scene
            key={room}
            room={room}
            showPins={pins}
            spots={
              room === "street"
                ? street
                : room === "gallery"
                  ? gallery
                  : room === "lobby" && !line
                    ? lobby
                    : []
            }
            enter={() => move("lobby")}
            action={(id) => {
              if (id === "window") move("gallery");
              if (id === "menu") openBook(new Date().getDate() % 4);
            }}
            over={
              room === "lobby" && story ? (
                <Story
                  line={story}
                  next={next}
                  auto={auto}
                  setAuto={setAuto}
                  skip={next}
                  history={() => setModal("history")}
                />
              ) : undefined
            }
          >
            {room === "lobby" && !line && (
              <img
                className="idle-mia"
                src={art("characters/mia/portraits/mia")}
                alt="Mia 在柜台旁等你"
              />
            )}
          </Scene>
        )}
        {room !== "workshop" && (
          <div className="scene-hud">
            <div className="room-mark">
              {room !== "street" && (
                <button
                  className="back-scene"
                  onClick={() => {
                    setLine("");
                    go(room === "lobby" ? "street" : "lobby");
                  }}
                >
                  ← {room === "lobby" ? "街道" : "店内"}
                </button>
              )}
              <span>
                {
                  {
                    street: "甜心来信",
                    lobby: "接待大厅",
                    gallery: "灵感橱窗",
                    album: "我的作品",
                  }[room]
                }
              </span>
            </div>
            <div className="hud-controls">
              <button
                className="icon-cookie"
                title="音乐与音效"
                aria-label="音乐与音效"
                onClick={() => setModal("settings")}
              >
                <img src={art("ui/music")} alt="" />
              </button>
              <button
                className="hint-button"
                aria-pressed={pins}
                onClick={() => {
                  if (room === "lobby" && !line) {
                    setModal("map");
                    return;
                  }
                  showPins(!pins);
                }}
              >
                {room === "lobby" && !line
                  ? "店内导览"
                  : pins
                    ? "隐藏提示"
                    : "互动提示"}
              </button>
            </div>
          </div>
        )}
        {room === "gallery" && !modal && (
          <button className="catalog-link" onClick={() => openBook(0, true)}>
            翻开食谱手札
          </button>
        )}
      </div>
      {modal && (
        <Panel
          title={titles[modal] || "Sweetie!"}
          close={close}
          wide={["book", "album", "materials"].includes(modal)}
        >
          {modal === "book" && (
            <Suspense fallback={loading}>
              <Book initial={bookIndex} guide={guide} />
            </Suspense>
          )}
          {modal === "album" && (
            <Suspense fallback={loading}>
              <Album book={(i) => openBook(i)} />
            </Suspense>
          )}
          {modal === "settings" && (
            <div className="sound-desk">
              {(["music", "sound"] as const).map((k, i) => (
                <div key={k}>
                  <img src={art("ui/" + k)} alt="" />
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        checked={audio[k]}
                        onChange={(e) => sound(k, e.target.checked)}
                      />
                      {i ? "环境与动作音效" : "钢琴背景音乐"}
                    </label>
                    <input
                      aria-label={i ? "音效音量" : "音乐音量"}
                      type="range"
                      min="0"
                      max="1"
                      step=".02"
                      value={audio[k + "Volume"]}
                      onChange={(e) => sound(k + "Volume", +e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={game.companion}
                  onChange={(e) => game.patch({ companion: e.target.checked })}
                />{" "}
                制作时让 Mia 陪伴我
              </label>
            </div>
          )}
          {modal === "history" && (
            <ol className="history">
              {game.history.map((h, i) => (
                <li key={i}>
                  <b>{h.who}</b>
                  {h.text}
                </li>
              ))}
            </ol>
          )}
          {modal === "map" && (
            <div className="map-list">
              {lobby.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setModal("");
                    s.act();
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {modal === "draft" && (
            <div className="paper-actions">
              {readLocal("draft", null) && (
                <button onClick={() => work()}>继续上一次的蛋糕</button>
              )}
              <button
                onClick={() =>
                  startWork({ design: blankDesign(), workflowVersion: 3 })
                }
              >
                从空白蛋糕胚开始
              </button>
              <button
                onClick={() => {
                  setModal("");
                  setLine("design");
                }}
              >
                先和 Mia 聊聊
              </button>
            </div>
          )}
          {modal === "photo" && (
            <>
              <p>先在制作室做好一个蛋糕，就能带到窗边拍照。</p>
              <button className="ink-button" onClick={() => work()}>
                开始做蛋糕
              </button>
            </>
          )}
          {modal === "specimen" && (
            <Suspense fallback={loading}>
              <Specimen />
            </Suspense>
          )}
          {modal === "materials" && (
            <>
              <div className="book-tabs">
                {["奶油", "水果", "裱花嘴", "装饰"].map((k) => (
                  <button
                    key={k}
                    aria-pressed={ingredient === k}
                    onClick={() => selectIngredient(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="pantry">
                {(ingredient === "奶油"
                  ? creamBowls.map((b) => [b.name, "bowl-" + b.id])
                  : ingredient === "水果"
                    ? [
                        ["草莓", "ingredient-strawberry"],
                        ["蓝莓", "ingredient-blueberry"],
                        ["芒果", "ingredient-mango"],
                        ["樱桃", "ingredient-cherry"],
                        ["柠檬", "ingredient-lemon"],
                        ["无花果", "ingredient-fig"],
                      ]
                    : ingredient === "裱花嘴"
                      ? [
                          ["圆嘴", "ingredient-pipe-round"],
                          ["星嘴", "ingredient-pipe-star"],
                          ["贝壳", "ingredient-pipe-shell"],
                          ["花瓣", "ingredient-pipe-rose"],
                          ["叶片", "ingredient-pipe-leaf"],
                          ["波浪", "ingredient-pipe-wave"],
                          ["多齿", "ingredient-pipe-ruffle"],
                        ]
                      : [
                          ["缎带", "ingredient-bow"],
                          ["珍珠", "ingredient-pearl"],
                          ["糖花", "ingredient-daisy"],
                          ["皇冠", "ingredient-crown"],
                        ]
                ).map(([n, img]) => (
                  <figure key={n}>
                    <img src={art(img)} alt="" />
                    <figcaption>{n}</figcaption>
                  </figure>
                ))}
              </div>
              <button className="ink-button" onClick={startFromRoom}>
                到工作台试一试
              </button>{" "}
              <button
                className="ink-button"
                onClick={() => setModal("specimen")}
              >
                转动实物
              </button>
            </>
          )}
        </Panel>
      )}
      {message && <div className="scene-note">{message}</div>}
    </>
  );
}
async function startGame() {
  await Promise.race([
    recoverProgress().catch(() => {}),
    new Promise((ok) => setTimeout(ok, 450)),
  ]);
  const memory = readLocal("letter.v1", null);
  if (memory) useGame.getState().patch(memory);
  createRoot(document.getElementById("root")!).render(<App />);
}
startGame();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {}),
  );
