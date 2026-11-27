const keys = ["draft", "letter.v1"];
let db;
function database() {
  if (!db)
    db = new Promise((resolve, reject) => {
      const r = indexedDB.open("SweetieLetters", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("progress");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error("存档正被其他窗口使用"));
    });
  return db;
}
export function backupProgress(key, value) {
  if (!keys.includes(key)) return;
  const snapshot = structuredClone(value);
  database()
    .then((d) =>
      d
        .transaction("progress", "readwrite")
        .objectStore("progress")
        .put(snapshot, key),
    )
    .catch(() => {});
}
export async function recoverProgress() {
  const d = await database();
  await Promise.all(
    keys.map(
      (key) =>
        new Promise((resolve) => {
          const r = d.transaction("progress").objectStore("progress").get(key);
          r.onsuccess = () => {
            try {
              if (r.result && !localStorage.getItem("sweetie.v1." + key))
                localStorage.setItem(
                  "sweetie.v1." + key,
                  JSON.stringify(r.result),
                );
            } catch {}
            resolve();
          };
          r.onerror = () => resolve();
        }),
    ),
  );
}
