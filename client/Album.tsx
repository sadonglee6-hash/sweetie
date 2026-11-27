import React, { useEffect, useState } from "react";
import { loadWorks, storeWork, removeWork, uid } from "../src/storage.js";
import { storyRecipes } from "../src/recipes.js";
import { art, startWork, useGame } from "./state";
export default function Album({ book }: { book: (i: number) => void }) {
  const [works, setWorks] = useState<any[]>([]),
    [tab, setTab] = useState(false),
    [del, setDel] = useState(""),
    [error, setError] = useState("");
  const fav = useGame((s) => s.favorites);
  async function refresh() {
    setWorks(await loadWorks());
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div className="album">
      <div className="book-tabs">
        <button aria-pressed={!tab} onClick={() => setTab(false)}>
          我的作品
        </button>
        <button aria-pressed={tab} onClick={() => setTab(true)}>
          收藏的款式
        </button>
      </div>
      {tab ? (
        <div className="album-list">
          {storyRecipes.map(
            (r, i) =>
              fav.includes(r.id) && (
                <button key={r.id} onClick={() => book(i)}>
                  <img src={art("recipes/" + (i + 1))} />
                  {r.name}
                </button>
              ),
          )}
          {!fav.length && (
            <p>在食谱上点「收藏这页」，喜欢的配方就会出现在这里。</p>
          )}
        </div>
      ) : (
        <div className="album-list">
          {works.map((w) => (
            <article key={w.id}>
              <img src={w.photo} alt={w.name} />
              <h3>{w.name}</h3>
              <p>{w.creator}</p>
              <div>
                <button onClick={() => startWork({ ...w, preview: false })}>
                  继续制作
                </button>
                <button onClick={() => startWork({ ...w, preview: true })}>
                  看成品
                </button>
                <button
                  onClick={async () => {
                    try {
                      await storeWork({
                        ...w,
                        id: uid(),
                        name: w.name + " · 副本",
                        date: Date.now(),
                      });
                      await refresh();
                    } catch {
                      setError("当前浏览器存储空间不足。");
                    }
                  }}
                >
                  复制
                </button>
                <button
                  onClick={async () => {
                    if (del !== w.id) {
                      setDel(w.id);
                      return;
                    }
                    await removeWork(w.id);
                    setDel("");
                    await refresh();
                  }}
                >
                  {del === w.id ? "确认删除" : "删除"}
                </button>
              </div>
            </article>
          ))}
          {!works.length && (
            <p>
              照片墙还空着。做好蛋糕后点「保存作品」，下次就能从这里继续制作。
            </p>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
