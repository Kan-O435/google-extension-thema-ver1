import { getState, faviconUrl } from "./lib/storage.js";
import { pickImages } from "./lib/pool.js";
import { currentWeekday, onWeekdayChange } from "./lib/weekday.js";
import { startParticles } from "./lib/particles.js";

const bg = document.getElementById("bg");
const list = document.getElementById("shortcuts");
let objectUrls = [];

async function renderBackground(day) {
  const picked = await pickImages(day, 3);

  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = picked.filter((p) => p.isObjectUrl).map((p) => p.src);

  bg.replaceChildren(
    ...picked.map((p, i) => {
      const d = document.createElement("div");
      d.style.setProperty("--i", i);
      d.style.backgroundImage = `url("${p.src}")`;
      return d;
    })
  );
  bg.classList.toggle("show", picked.length > 0); // 未設定: 単色背景にフォールバック
}

async function renderShortcuts() {
  const { shortcuts } = await getState();
  list.replaceChildren();

  shortcuts.forEach((s, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", Math.min(i, 12)); // 登場の遅延が長くなりすぎないよう上限
    const a = document.createElement("a");
    a.href = s.url;
    const img = document.createElement("img");
    img.src = faviconUrl(s.url);
    img.alt = "";
    const label = document.createElement("span");
    label.textContent = s.title;
    a.append(img, label);
    li.append(a);
    list.append(li);
  });
}

renderBackground(currentWeekday());
renderShortcuts();
onWeekdayChange(renderBackground);
startParticles(document.getElementById("fx"));
