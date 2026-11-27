const prefix = "sweetie.v1.";
export function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
let database;
async function db() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const req = indexedDB.open("SweetieAtelier", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("cakes", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  return database;
}
async function action(mode, op) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("cakes", mode),
      req = op(tx.objectStore("cakes"));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("写入中断"));
  });
}
export async function loadWorks() {
  const records = new Map();
  try {
    for (const w of await action("readonly", (s) => s.getAll()))
      records.set(w.id, w);
  } catch {}
  for (const w of readLocal("works", [])) {
    if (!records.has(w.id) || records.get(w.id).date < w.date)
      records.set(w.id, w);
  }
  return [...records.values()];
}
export async function storeWork(work) {
  try {
    await action("readwrite", (s) => s.put(work));
    const old = readLocal("works", []);
    if (old.some((w) => w.id === work.id))
      writeLocal(
        "works",
        old.filter((w) => w.id !== work.id),
      );
  } catch {
    const works = readLocal("works", []).filter((v) => v.id !== work.id);
    if (!writeLocal("works", [work, ...works]))
      throw Error("当前浏览器存储空间不足，请先导出设计卡。");
  }
}
export async function removeWork(id) {
  let dbError;
  try {
    await action("readwrite", (s) => s.delete(id));
  } catch (e) {
    dbError = e;
  }
  const old = readLocal("works", []),
    hadLocal = old.some((w) => w.id === id);
  if (dbError && !hadLocal) throw Error("当前无法访问作品存储，请重试。");
  if (
    hadLocal &&
    !writeLocal(
      "works",
      old.filter((w) => w.id !== id),
    )
  )
    throw Error("删除未完成，请重试。");
}
export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    "sw-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
