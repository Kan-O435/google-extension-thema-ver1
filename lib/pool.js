import { BUNDLED_IMAGES } from "../config.js";
import { getState, getImage, setLastImages } from "./storage.js";

// 画像 ID: エディタ側は "b:<ファイル名>"、アップロードは UUID

export function bundledEntries(day) {
  return (BUNDLED_IMAGES[day] || []).map((name) => ({
    id: `b:${name}`,
    src: chrome.runtime.getURL(`images/${encodeURIComponent(name)}`),
  }));
}

function canLoad(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// その曜日のプールから重複なしで count 枚をランダムに選ぶ。
// 前回表示した画像は、足りる限り選ばない(足りなければ前回分から補う)。
// 戻り値: [{ id, src, isObjectUrl }](画像なしなら空配列)
export async function pickImages(day, count = 3) {
  const { weekdayImages, lastImages } = await getState();
  const all = [
    ...bundledEntries(day),
    ...(weekdayImages[day] || []).map((id) => ({ id })),
  ];
  const fresh = shuffle(all.filter((c) => !lastImages.includes(c.id)));
  const stale = shuffle(all.filter((c) => lastImages.includes(c.id)));

  const results = [];
  for (const choice of [...fresh, ...stale]) {
    if (results.length >= count) break;
    if (choice.src) {
      if (await canLoad(choice.src)) {
        results.push({ id: choice.id, src: choice.src, isObjectUrl: false });
      }
    } else {
      const blob = await getImage(choice.id).catch(() => null);
      if (blob) results.push({ id: choice.id, src: URL.createObjectURL(blob), isObjectUrl: true });
    }
  }

  if (results.length) await setLastImages(results.map((r) => r.id));
  return shuffle(results);
}
