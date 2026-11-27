import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { art, useGame, occasions } from "./state";
import { play } from "../src/sound.js";
export type Line = {
  id: string;
  text: string;
  face?: string;
  pose?: string;
  options?: { text: string; action: () => void }[];
};
export function Story({
  line,
  next,
  auto,
  setAuto,
  skip,
  history,
}: {
  line: Line;
  next: () => void;
  auto: boolean;
  setAuto: (v: boolean) => void;
  skip: () => void;
  history: () => void;
}) {
  const [count, setCount] = useState(0),
    [wasRead, setWasRead] = useState(false);
  const advance = useRef<() => void>(() => {});
  const note = useGame((s) => s.note);
  const typing = useRef<ReturnType<typeof setInterval> | null>(null);
  function reveal() {
    if (typing.current) clearInterval(typing.current);
    setCount(line.text.length);
  }
  useEffect(() => {
    const before = useGame.getState().read.includes(line.id);
    setWasRead(before);
    setCount(0);
    note(line.id, line.text);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setCount(i);
      if (i >= line.text.length) clearInterval(timer);
    }, 32);
    typing.current = timer;
    return () => clearInterval(timer);
  }, [line.id]);
  const full = count >= line.text.length;
  advance.current = () => {
    if (!full) reveal();
    else if (!line.options?.length) next();
  };
  useEffect(() => {
    const press = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !document.querySelector("dialog[open]") &&
        !["BUTTON", "INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        e.preventDefault();
        advance.current();
      }
    };
    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, []);
  useEffect(() => {
    if (!auto || !full || line.options?.length) return;
    const t = setTimeout(next, 1600);
    return () => clearTimeout(t);
  }, [auto, full, line.id]);
  const [arrival, arrive] = useState(line.id === "welcome");
  useEffect(() => {
    arrive(line.id === "welcome");
    const t = setTimeout(() => arrive(false), 500);
    return () => clearTimeout(t);
  }, [line.id]);
  const src = arrival
    ? "portraits/mia"
    : line.pose
      ? "poses/" + line.pose
      : "expressions/" + (line.face || "smile");
  return (
    <div className="story">
      <AnimatePresence mode="sync">
        <motion.img
          key={src}
          className={"story-mia " + (line.pose ? "full" : "bust")}
          src={art("characters/mia/" + src)}
          alt="Mia"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
        />
      </AnimatePresence>
      {line.id === "welcome" && (
        <div className="welcome-bubble">欢迎光临 Sweetie～！</div>
      )}
      <div className="dialogue">
        <button
          className="letter"
          onClick={() => advance.current()}
          aria-label={"Mia：" + line.text}
        >
          <b>Mia</b>
          <span>{line.text.slice(0, count)}</span>
        </button>
        <div className="story-tools">
          <button onClick={() => setAuto(!auto)} aria-pressed={auto}>
            {auto ? "停止自动" : "自动播放"}
          </button>
          <button
            disabled={!wasRead}
            onClick={() => {
              if (!full) reveal();
              else if (!line.options?.length) skip();
            }}
          >
            跳过已读
          </button>
          <button onClick={history}>对话记录</button>
        </div>
      </div>
      {full && line.options && (
        <div className="answers">
          {line.options.map((o) => (
            <button
              key={o.text}
              onClick={() => {
                play("paper");
                note("choice:" + o.text, o.text, "我");
                o.action();
              }}
            >
              {o.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function makeLine(
  id: string,
  choice: number,
  act: (a: string, n?: number) => void,
): Line {
  const choices = (pairs: string[][]) =>
    pairs.map(([text, a]) => ({ text, action: () => act(a) }));
  if (id === "welcome")
    return {
      id,
      text: "今天想为谁准备一份甜蜜呢？",
      pose: "wave",
      options: choices([
        ["我想亲手设计一个蛋糕。", "design"],
        ["我想看看店里的漂亮蛋糕。", "show"],
        ["我想学习怎么做蛋糕。", "teach"],
        ["我只是想进来逛逛。", "wander"],
      ]),
    };
  if (id === "design")
    return { id, text: "自己设计吗？那真是太棒啦！", face: "happy" };
  if (id === "ask")
    return {
      id,
      text: "不过，在开始之前，我想先听听你的故事。",
      face: "listen",
      options: occasions.map((o, i) => ({
        text: o.name,
        action: () => act("chosen", i),
      })),
    };
  const o = occasions[choice] || occasions[0];
  if (id === "chosen")
    return { id: "chosen" + choice, text: o.line, face: o.face };
  if (id === "suggest")
    return {
      id: "suggest" + choice,
      text:
        "我想到一款" +
        o.size +
        "寸的" +
        o.look +
        "蛋糕。用" +
        o.tint +
        "，配上" +
        o.decor +
        "，再写一句「" +
        o.wish +
        "」。你也可以按自己的心意改。",
      face: "think",
      options: choices([
        ["带上 Mia 的建议", "suggested"],
        ["我想从空白蛋糕开始", "blank"],
      ]),
    };
  if (id === "show")
    return {
      id,
      text: "来，这边的玻璃柜里有今天刚做好的蛋糕。点一款看看它的故事吧。",
      pose: "point",
    };
  if (id === "teach")
    return {
      id,
      text: "翻开这本食谱手札，我们从第一层蛋糕胚慢慢做起。",
      pose: "read",
    };
  return {
    id,
    text: "那就慢慢逛吧。窗边的桌子光线很好，做好的蛋糕都可以在那里拍照。想找我时，点点我就好。",
    face: "serene",
  };
}
