import { BUNDLED_IMAGES } from "../config.js";
import { getState, getImage, setLastImage } from "./storage.js";

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

// その曜日のプールからランダムに 1 枚選ぶ。直前と同じ画像は(2枚以上あれば)選ばない。
// 戻り値: { id, src, isObjectUrl } または null(画像なし)
export async function pickImage(day) {
  const { weekdayImages, lastImage } = await getState();
  let candidates = [
    ...bundledEntries(day),
    ...(weekdayImages[day] || []).map((id) => ({ id })),
  ];

  while (candidates.length) {
    const pool =
      candidates.length > 1 ? candidates.filter((c) => c.id !== lastImage) : candidates;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    let result = null;
    if (choice.src) {
      if (await canLoad(choice.src)) result = { id: choice.id, src: choice.src, isObjectUrl: false };
    } else {
      const blob = await getImage(choice.id).catch(() => null);
      if (blob) result = { id: choice.id, src: URL.createObjectURL(blob), isObjectUrl: true };
    }

    if (result) {
      await setLastImage(result.id);
      return result;
    }
    // 読み込めない画像はこの回だけ候補から外す
    candidates = candidates.filter((c) => c.id !== choice.id);
  }
  return null;
}
