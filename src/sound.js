import { readLocal, writeLocal } from "./storage.js";
let enabled = readLocal("sound", false),
  ctx,
  timer,
  beat = 0;
export const soundEnabled = () => enabled;
function context() {
  if (!enabled) return null;
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function tone(c, hz, delay, duration, volume, timbre = "sine") {
  const t = c.currentTime + delay,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = timbre;
  o.frequency.value = hz;
  g.gain.setValueAtTime(0.00001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.00001, t + duration);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + duration + 0.01);
}
function rustle(c, kind) {
  const length = kind === "paper" ? 0.3 : 0.16,
    buf = c.createBuffer(1, c.sampleRate * length, c.sampleRate),
    a = buf.getChannelData(0);
  for (let i = 0; i < a.length; i++)
    a[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / a.length) ** 2;
  const s = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  s.buffer = buf;
  f.type = "bandpass";
  f.frequency.value = kind === "scrape" ? 950 : 1800;
  g.gain.value = 0.06;
  s.connect(f).connect(g).connect(c.destination);
  s.start();
}
export function play(kind = "tap") {
  if (!enabled || document.hidden) return;
  try {
    const c = context();
    if (["scrape", "paper", "pipe", "sugar"].includes(kind)) {
      rustle(c, kind);
      return;
    }
    if (kind === "door" || kind === "save") {
      [784, 1046.5, 1318.5].forEach((hz, i) =>
        tone(c, hz, i * 0.09, 1.2 - i * 0.1, 0.033),
      );
    } else {
      tone(c, kind === "place" ? 780 : 1040, 0, 0.2, 0.024);
      tone(c, 1534, 0.005, 0.1, 0.005);
    }
  } catch {}
}
function piano() {
  if (!enabled || document.hidden) return;
  try {
    const c = context(),
      notes = [
        [261.6, 329.6, 392],
        [220, 261.6, 329.6],
        [174.6, 220, 261.6],
        [196, 246.9, 293.7],
      ][beat++ % 4];
    notes.forEach((v, i) => {
      tone(c, v, i * 0.22, 3, 0.012, "sine");
      tone(c, v * 2, i * 0.22, 1.8, 0.003, "triangle");
    });
  } catch {}
}
export function startAudio() {
  if (!enabled) return;
  context();
  if (!timer) {
    piano();
    timer = setInterval(piano, 3500);
  }
}
export function toggleSound() {
  enabled = !enabled;
  writeLocal("sound", enabled);
  if (enabled) {
    startAudio();
    play("door");
  } else {
    clearInterval(timer);
    timer = null;
    ctx?.suspend();
  }
  return enabled;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) ctx?.suspend();
  else if (enabled && ctx) ctx.resume().catch(() => {});
});

let scrape = null;
export function scrapeMotion(speed, smoothing) {
  if (!enabled || document.hidden) return;
  try {
    const c = context();
    if (!scrape) {
      const buffer = c.createBuffer(1, c.sampleRate * 0.75, c.sampleRate),
        samples = buffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < samples.length; i++) {
        previous = 0.73 * previous + 0.27 * (2 * Math.random() - 1);
        samples[i] = previous;
      }
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "bandpass";
      filter.Q.value = 0.7;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(c.destination);
      source.start();
      scrape = { source, filter, gain };
    }
    const t = c.currentTime,
      v = Math.min(2.6, Math.max(0.05, speed || 0));
    scrape.filter.frequency.setTargetAtTime(
      (smoothing ? 520 : 680) + v * 290,
      t,
      0.035,
    );
    scrape.source.playbackRate.setTargetAtTime(0.82 + v * 0.12, t, 0.04);
    const g = scrape.gain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.035 + v * 0.019, t, 0.018);
    g.setTargetAtTime(0, t + 0.12, 0.05);
  } catch {}
}
export function releaseScrape() {
  if (!scrape || !ctx) return;
  const t = ctx.currentTime,
    g = scrape.gain.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(0, t, 0.025);
}
