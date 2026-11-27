import { readLocal, writeLocal } from "./storage.js";
const settings = {
  music: true,
  sound: true,
  musicVolume: 0.45,
  soundVolume: 0.66,
  ...readLocal("letter.audio", {}),
};
let ctx,
  buses = {},
  timer,
  scene = "street",
  beat = 0,
  scrape,
  unlocked = false;
export const audioSettings = () => ({ ...settings });
export const soundEnabled = () => settings.sound;
function gains() {
  if (!ctx) return;
  for (const key of ["music", "sound"])
    buses[key].gain.setTargetAtTime(
      settings[key] && (key !== "music" || scene !== "street")
        ? settings[key + "Volume"]
        : 0,
      ctx.currentTime,
      0.1,
    );
}
export function setAudio(key, value) {
  if (!(key in settings)) return;
  settings[key] = key.endsWith("Volume")
    ? Math.min(1, Math.max(0, Number(value)))
    : !!value;
  writeLocal("letter.audio", settings);
  gains();
}
export function toggleSound() {
  setAudio("sound", !settings.sound);
  return settings.sound;
}
export function setSoundScene(next) {
  scene = next;
  beat = 0;
  gains();
}
function tone(
  hz,
  start,
  duration,
  volume,
  bus = "sound",
  type = "sine",
  bend = 0,
) {
  const t = ctx.currentTime + start,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz, t);
  if (bend)
    o.frequency.exponentialRampToValueAtTime(hz * bend, t + duration * 0.66);
  g.gain.setValueAtTime(0.00001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.00001, t + duration);
  o.connect(g).connect(buses[bus]);
  o.start(t);
  o.stop(t + duration + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}
function friction(length, center, volume, bus = "sound", loop = false) {
  const buf = ctx.createBuffer(
      1,
      Math.round(ctx.sampleRate * length),
      ctx.sampleRate,
    ),
    a = buf.getChannelData(0);
  let old = 0;
  for (let i = 0; i < a.length; i++) {
    old = 0.61 * old + 0.39 * (2 * Math.random() - 1);
    a[i] = old * (loop ? 1 : Math.sin((Math.PI * i) / a.length) ** 1.6);
  }
  const s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = buf;
  s.loop = loop;
  f.type = "bandpass";
  f.frequency.value = center;
  f.Q.value = 0.82;
  g.gain.value = volume;
  s.connect(f).connect(g).connect(buses[bus]);
  s.start();
  s.onended = () => {
    s.disconnect();
    f.disconnect();
    g.disconnect();
  };
  return { s, f, g };
}
function phrase() {
  if (!ctx || document.hidden || !unlocked) return;
  if (scene === "street") {
    if (settings.sound) {
      friction(2.8, 410, 0.07);
      if (beat++ % 3 === 0) {
        tone(2400, 0.45, 0.16, 0.026, "sound", "sine", 1.3);
        tone(3000, 0.7, 0.19, 0.019, "sound", "sine", 0.79);
      }
    }
    return;
  }
  if (!settings.music) return;
  const chords = [
      [261.63, 329.63, 392, 493.88],
      [220, 261.63, 329.63, 392],
      [174.61, 220, 261.63, 329.63],
      [196, 246.94, 293.66, 392],
    ],
    c = chords[beat++ % 4];
  c.forEach((n, i) => {
    tone(n, i * 0.21, 2.9, 0.05, "music");
    tone(n * 2, i * 0.21, 1.25, 0.009, "music", "triangle");
  });
  tone(c[(beat + 1) % 4] * 2, 1.65, 1.42, 0.023, "music");
}
export function startAudio() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ctx = new C();
    for (const key of ["music", "sound"]) {
      buses[key] = ctx.createGain();
      buses[key].gain.value = 0;
      buses[key].connect(ctx.destination);
    }
    gains();
  }
  unlocked = true;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  if (!timer) {
    phrase();
    timer = setInterval(phrase, 3340);
  }
}
export function play(kind = "tap") {
  if (!unlocked || !settings.sound || document.hidden) return;
  if (kind === "bell" || kind === "door") {
    if (kind === "door") friction(0.45, 240, 0.23);
    [938, 1399, 1732, 2077].forEach((n, i) => {
      tone(n, 0.04 + i * 0.072, 1.86 - i * 0.18, 0.082 / (i + 1));
      tone(n * 2.37, 0.05 + i * 0.072, 0.62, 0.016 / (i + 1));
    });
    return;
  }
  if (kind === "save") {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
      tone(n, i * 0.12, 1.25, 0.062),
    );
    return;
  }
  if (kind === "cat") {
    tone(590, 0, 0.3, 0.045, "sound", "triangle", 1.3);
    tone(755, 0.16, 0.25, 0.026, "sound", "sine", 0.67);
    return;
  }
  if (["paper", "box", "pipe", "sugar", "scrape"].includes(kind)) {
    friction(
      kind === "box" ? 0.45 : 0.24,
      { paper: 2300, box: 1300, pipe: 350, sugar: 3900, scrape: 860 }[kind],
      0.18,
    );
    return;
  }
  tone(kind === "place" ? 640 : 885, 0, 0.12, 0.035);
}
export function scrapeMotion(speed, smoothing) {
  if (!unlocked || !settings.sound || document.hidden) return;
  if (!scrape) scrape = friction(0.6, 840, 0, "sound", true);
  const now = ctx.currentTime;
  scrape.f.frequency.setTargetAtTime(
    (smoothing ? 500 : 810) + Math.min(3, speed) * 170,
    now,
    0.025,
  );
  scrape.g.gain.cancelScheduledValues(now);
  scrape.g.gain.setTargetAtTime(0.19, now, 0.015);
  scrape.g.gain.setTargetAtTime(0, now + 0.13, 0.04);
}
export function releaseScrape() {
  if (scrape) scrape.g.gain.setTargetAtTime(0, ctx.currentTime, 0.035);
}
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (unlocked) ctx.resume().catch(() => {});
});
