import React, { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import layers from "./layers.json";
import { art, scenes, type Room } from "./state";
import { play } from "../src/sound.js";
type Box = [number, number, number, number];
export type Spot = {
  id: string;
  name: string;
  box: Box;
  act: () => void;
  pin?: boolean;
};
export function rectStyle(box: number[]): React.CSSProperties {
  return {
    left: box[0] + "%",
    top: box[1] + "%",
    width: box[2] + "%",
    height: box[3] + "%",
  };
}
export function Scene({
  room,
  spots,
  children,
  over,
  showPins = false,
  enter,
  action,
  transition,
}: {
  room: Room;
  spots: Spot[];
  children?: React.ReactNode;
  over?: React.ReactNode;
  showPins?: boolean;
  enter?: () => void;
  action?: (id: string) => void;
  transition?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [hint, setHint] = useState(""),
    [busy, setBusy] = useState(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(
    () => () => {
      timeline.current?.kill();
    },
    [],
  );
  function effect(id: string) {
    if (busy) return;
    const el = ref.current;
    if (!el) return;
    if (id === "door") {
      setBusy(true);
      play("door");
      el.classList.add("opening");
      let t = gsap.timeline({ onComplete: () => enter?.() });
      timeline.current = t;
      t.to(
        ".door-layer",
        {
          rotateY: -79,
          duration: reduced ? 0.16 : 1.08,
          transformOrigin: "right center",
          ease: "power2.inOut",
        },
        0,
      )
        .to(
          ".chime-layer",
          {
            rotate: 9,
            yoyo: true,
            repeat: 3,
            duration: 0.19,
            transformOrigin: "50% 1%",
          },
          0,
        )
        .to(
          el.querySelector(".world"),
          {
            scale: reduced ? 1 : 3.9,
            transformOrigin: "80% 55%",
            duration: reduced ? 0.2 : 1.35,
            ease: "power2.in",
          },
          0.25,
        )
        .to(
          el.querySelector(".passage-light"),
          { opacity: 1, duration: 0.32 },
          reduced ? 0.15 : 1.32,
        );
      return;
    }
    if (id === "bell") {
      play("bell");
      gsap.fromTo(
        ".chime-layer",
        { rotation: -7 },
        {
          rotation: 0,
          ease: "elastic.out(1,.26)",
          duration: 1.8,
          transformOrigin: "50% 2%",
        },
      );
      setHint("叮铃——风铃响了。");
      return;
    }
    if (id === "cat") {
      play("cat");
      el.classList.remove("cat-purr");
      void el.offsetWidth;
      el.classList.add("cat-purr");
      setHint("小猫眯起眼睛，轻轻喵了一声。");
      return;
    }
    action?.(id);
  }
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(""), 2900);
    return () => clearTimeout(t);
  }, [hint]);
  return (
    <div className={"scene-shell " + room + " " + (transition || "")}>
      <div
        className="scene-frame"
        ref={ref}
        onPointerMove={(e) => {
          if (reduced || e.pointerType !== "mouse") return;
          const b = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--look",
            ((e.clientX - b.left) / b.width - 0.5) * 2 + "px",
          );
        }}
      >
        <div className="world">
          <img
            className="room-image"
            src={art("scenes/" + scenes[room])}
            alt={
              {
                street: "午后街角的 Sweetie 草莓甜品店",
                lobby: "Sweetie 店内的甜品柜和窗边餐桌",
                gallery: "摆放蛋糕和食谱手札的橱窗",
                album: "窗边作品展示区",
                workshop: "陶瓷转台制作室",
              }[room]
            }
            fetchPriority="high"
          />
          {room === "street" && (
            <>
              <div
                className="door-interior"
                style={rectStyle(layers.door)}
              ></div>
              {Object.entries(layers).map(([n, b]) => (
                <img
                  key={n}
                  alt=""
                  className={"object " + n + "-layer"}
                  style={rectStyle(b)}
                  src={art("scenes/objects/" + n)}
                />
              ))}
              <img
                className="object cat-blink"
                style={rectStyle(layers.cat)}
                alt=""
                src={art("scenes/objects/cat-blink")}
              />
              <div className="leaf-shade" />
              <div className="glass-light" />
              <div className="petals">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} style={{ "--i": i } as React.CSSProperties} />
                ))}
              </div>
            </>
          )}
          {room === "lobby" && (
            <>
              <img className="tablebook" alt="" src={art("ui/tablebook")} />
              <span className="wood-radio" aria-hidden="true">
                <i />
                <b />
              </span>
            </>
          )}
          {children}
          {spots.map((s) => (
            <button
              key={s.id}
              type="button"
              className={"hotspot " + (showPins || s.pin ? "marked" : "")}
              style={rectStyle(s.box)}
              data-spot={s.id}
              aria-label={s.name}
              title={s.name}
              disabled={busy}
              onClick={() => (room === "street" ? effect(s.id) : s.act())}
            >
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        {room === "street" && (
          <>
            <div className="street-invitation">
              <p>今天，要不要给生活加一点甜？</p>
              <button onClick={() => effect("door")} disabled={busy}>
                推门进店 <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="passage-light" />
          </>
        )}
        {hint && (
          <div className="scene-note" role="status">
            {hint}
          </div>
        )}
        {over}
      </div>
    </div>
  );
}
export function Panel({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"paper-panel " + (wide ? "wide-paper" : "")}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section>
        <button aria-label="合上" className="close-paper" onClick={close}>
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </dialog>
  );
}
