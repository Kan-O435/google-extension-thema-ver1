import { getState, faviconUrl } from "./lib/storage.js";
import { pickImage } from "./lib/pool.js";
import { currentWeekday, onWeekdayChange } from "./lib/weekday.js";

const bg = document.getElementById("bg");
const list = document.getElementById("shortcuts");
let currentObjectUrl = null;

async function renderBackground(day) {
  const picked = await pickImage(day);

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = picked?.isObjectUrl ? picked.src : null;

  if (picked) {
    bg.style.backgroundImage = `url("${picked.src}")`;
    bg.classList.add("show");
  } else {
    bg.style.backgroundImage = "";
    bg.classList.remove("show"); // 未設定: 単色背景にフォールバック
  }
}

async function renderShortcuts() {
  const { shortcuts } = await getState();
  list.replaceChildren();

  if (shortcuts.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "右下の ⚙ からショートカットを追加できます";
    list.append(li);
    return;
  }

  for (const s of shortcuts) {
    const li = document.createElement("li");
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
  }
}

renderBackground(currentWeekday());
renderShortcuts();
onWeekdayChange(renderBackground);
