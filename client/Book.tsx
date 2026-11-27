import React, { lazy, Suspense, useState, useMemo } from "react";
import {
  storyRecipes,
  materials,
  stageDesign,
  label,
  pieceLabel,
} from "../src/recipes.js";
import { stepNames } from "../src/ui.js";
import { art, startWork, useGame } from "./state";
import { play } from "../src/sound.js";
const Model = lazy(() => import("./RecipeModel"));
export default function Book({
  initial,
  guide,
}: {
  initial: number;
  guide: boolean;
}) {
  const [index, choose] = useState(Math.max(0, initial)),
    [mode, setMode] = useState<"story" | "recipe" | "material" | "model">(
      guide ? "recipe" : "story",
    ),
    [step, paginate] = useState(0);
  const r = storyRecipes[index],
    fav = useGame((s) => s.favorites),
    patch = useGame((s) => s.patch);
  const staged = useMemo(() => stageDesign(r.design, step), [r, step]);
  function select(i: number) {
    choose(i);
    paginate(0);
    play("paper");
  }
  function begin(which: "preview" | "copy" | "guide") {
    startWork({
      name: r.name,
      recipeId: r.id,
      workflowVersion: 3,
      guided: which === "guide",
      guideProgress: which === "guide" ? step : 0,
      step: which === "guide" ? step : 0,
      preview: which === "preview",
      design: which === "guide" ? staged : r.design,
    });
  }
  return (
    <div className="recipe-book">
      <div className="book-select">
        <label>
          款式{" "}
          <select
            aria-label="选择蛋糕配方"
            value={index}
            onChange={(e) => select(+e.target.value)}
          >
            {storyRecipes.map((r, i) => (
              <option key={r.id} value={i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="bookmark"
          aria-pressed={fav.includes(r.id)}
          onClick={() =>
            patch({
              favorites: fav.includes(r.id)
                ? fav.filter((x) => x !== r.id)
                : [...fav, r.id],
            })
          }
        >
          {fav.includes(r.id) ? "已收藏" : "收藏这页"}
        </button>
      </div>
      <div className="book-spread" key={index}>
        <div className="book-left">
          <div className="book-visual">
            {mode === "recipe" || mode === "model" ? (
              <Suspense fallback={<p>正在摆好转台…</p>}>
                <Model design={mode === "recipe" ? staged : r.design} />
              </Suspense>
            ) : (
              <img src={art("recipes/" + (index + 1))} alt={r.name} />
            )}
          </div>
          <em>{r.english}</em>
          <h3>{r.name}</h3>
          <small>
            {r.design.size} 寸 · {r.design.layers} 层
          </small>
          {mode === "recipe" && (
            <div className="book-samples">
              {[
                r.design.flavor,
                r.design.fillings[0] || "cream",
                r.design.items.find((item) => item.type.startsWith("pipe-"))
                  ?.type || "pipe-shell",
              ].map((id, i) => (
                <figure key={i}>
                  <img src={art("ingredient-" + id)} alt="" />
                  <figcaption>{pieceLabel(id)}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
        <div className="book-right">
          <div className="book-tabs">
            {(
              [
                ["story", "设计故事"],
                ["recipe", "食谱"],
                ["material", "材料与工具"],
                ["model", "看成品"],
              ] as const
            ).map(([k, title]) => (
              <button
                key={k}
                aria-pressed={mode === k}
                onClick={() => {
                  setMode(k);
                  play("paper");
                }}
              >
                {title}
              </button>
            ))}
          </div>
          {mode === "recipe" ? (
            <div className="page-ink" key={step}>
              <small>第 {step + 1} 页 / 8</small>
              <h4>{stepNames[step]}</h4>
              <p>{r.tips[step]}</p>
              <div className="page-turn">
                <button
                  disabled={!step}
                  onClick={() => {
                    paginate(step - 1);
                    play("paper");
                  }}
                >
                  上一页
                </button>
                <button
                  disabled={step === 7}
                  onClick={() => {
                    paginate(step + 1);
                    play("paper");
                  }}
                >
                  下一页
                </button>
              </div>
            </div>
          ) : mode === "material" ? (
            <div className="book-materials">
              <h4>备料</h4>
              <ul>
                {materials(r.design).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              <p>工具：转台、刮刀、裱花袋及花嘴。</p>
            </div>
          ) : (
            <>
              <h4>{mode === "model" ? "转动看看" : "Mia 的手札"}</h4>
              <p>
                {mode === "model"
                  ? "拖动蛋糕可以环绕查看，滚动或双指可调整远近。"
                  : r.desc}
              </p>
            </>
          )}
          <div className="book-actions">
            <button className="ink-button" onClick={() => begin("guide")}>
              跟着做同款
            </button>
            <button onClick={() => begin("copy")}>在原款上修改</button>
            {mode === "model" && (
              <button onClick={() => begin("preview")}>到窗边拍照</button>
            )}
          </div>
        </div>
      </div>
      <div className="book-bottom">
        <button disabled={index === 0} onClick={() => select(index - 1)}>
          ← 上一款
        </button>
        <span>
          {index + 1} / {storyRecipes.length}
        </span>
        <button disabled={index === 9} onClick={() => select(index + 1)}>
          下一款 →
        </button>
      </div>
      <p className="book-motto">
        Every cake tells a little story.{" "}
        <span>每一个蛋糕，都藏着一个甜甜的故事。</span>
      </p>
    </div>
  );
}
