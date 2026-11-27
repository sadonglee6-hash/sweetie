import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { art, go, useGame, workPayload } from "./state";
import { readLocal } from "../src/storage.js";
import { blankDesign } from "../src/recipes.js";
import { play } from "../src/sound.js";
import { Panel } from "./Room";
const Mixing = lazy(() => import("./Mixing"));
export default function Studio() {
  const root = useRef<HTMLDivElement>(null),
    sheet = useRef<HTMLDialogElement>(null),
    contents = useRef<HTMLDivElement>(null);
  const [mix, setMix] = useState("");
  const [toast, message] = useState(""),
    [mia, setMia] = useState(""),
    [done, setDone] = useState(false);
  const companion = useGame((s) => s.companion);
  useEffect(() => {
    let live = true,
      instance: any,
      timer: number;
    const rootEl = root.current!;
    const payload = workPayload.value ||
      readLocal("draft", null) || { design: blankDesign(), workflowVersion: 3 };
    workPayload.value = null;
    function notify(text: string) {
      message(text);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => message(""), 2700);
    }
    const say = (ev: Event) => {
      const { text, finish } = (ev as CustomEvent).detail;
      setMia(text);
      setDone(!!finish);
    };
    const mixing = (e: Event) => setMix((e as CustomEvent).detail);
    rootEl.addEventListener("sweetie:mix", mixing);
    rootEl.addEventListener("sweetie:companion", say);
    import("../src/editor.js")
      .then(async ({ createEditor }) => {
        if (!live) return;
        instance = await createEditor(rootEl, payload, {
          play,
          notify,
          openSheet(html: string) {
            if (!contents.current) return;
            contents.current.innerHTML = html;
            sheet.current?.showModal();
          },
          closeSheet() {
            sheet.current?.close();
          },
        });
        if (!live) instance?.dispose();
      })
      .catch(() => {
        if (live)
          message("工作台未能启动。请使用支持 WebGL 2 的浏览器重新打开。");
      });
    return () => {
      live = false;
      window.clearTimeout(timer);
      rootEl.removeEventListener("sweetie:mix", mixing);
      rootEl.removeEventListener("sweetie:companion", say);
      instance?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!mia) return;
    const t = setTimeout(() => setMia(""), done ? 6500 : 4300);
    return () => clearTimeout(t);
  }, [mia, done]);
  return (
    <main className={"studio " + (done ? "photo-room" : "")}>
      <div ref={root} className="editor-mount"></div>
      <dialog
        ref={sheet}
        className="studio-dialog"
        onClick={(e) => {
          if (e.target === sheet.current) sheet.current.close();
        }}
      >
        <button
          className="close-paper"
          aria-label="合上"
          onClick={() => sheet.current?.close()}
        >
          ×
        </button>
        <div ref={contents} />
      </dialog>
      {mix && (
        <Panel title="调一碗奶油" close={() => setMix("")}>
          <Suspense fallback={<p>正在拿出奶油碗…</p>}>
            <Mixing
              base={mix}
              onUse={(color) => {
                root.current?.dispatchEvent(
                  new CustomEvent("sweetie:mixed", { detail: color }),
                );
                setMix("");
              }}
            />
          </Suspense>
        </Panel>
      )}
      {companion && mia && (
        <div className="companion" role="status">
          <img
            src={art(
              "characters/mia/" + (done ? "poses/clap" : "expressions/happy"),
            )}
            alt="Mia"
          />
          <span>{mia}</span>
        </div>
      )}
      {toast && (
        <div className="scene-note" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
