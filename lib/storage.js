// chrome.storage.local(設定・ショートカット)と IndexedDB(画像 Blob)のラッパー

const DB_NAME = "weekday-newtab";
const STORE = "images";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

export const saveImage = (id, blob) => tx("readwrite", (s) => s.put(blob, id));
export const getImage = (id) => tx("readonly", (s) => s.get(id));
export const deleteImage = (id) => tx("readwrite", (s) => s.delete(id));

export async function getState() {
  const { shortcuts = [], weekdayImages = {}, lastImage = null } =
    await chrome.storage.local.get(["shortcuts", "weekdayImages", "lastImage"]);

  // 旧形式(曜日 → 画像ID 1つ)を配列形式へ移行
  const normalized = {};
  for (const [day, v] of Object.entries(weekdayImages)) {
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    if (arr.length) normalized[day] = arr;
  }
  return { shortcuts, weekdayImages: normalized, lastImage };
}

export const setLastImage = (lastImage) => chrome.storage.local.set({ lastImage });

export const setShortcuts = (shortcuts) => chrome.storage.local.set({ shortcuts });
export const setWeekdayImages = (weekdayImages) =>
  chrome.storage.local.set({ weekdayImages });

// http(s) のみ許可(javascript: 等を拒否)
export function normalizeUrl(input) {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function faviconUrl(pageUrl) {
  const u = new URL(chrome.runtime.getURL("/_favicon/"));
  u.searchParams.set("pageUrl", pageUrl);
  u.searchParams.set("size", "64");
  return u.toString();
}
