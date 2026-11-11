import {
  getState, setShortcuts, setWeekdayImages,
  saveImage, getImage, deleteImage, normalizeUrl, faviconUrl,
} from "./lib/storage.js";
import { DAY_NAMES } from "./lib/weekday.js";

const daysEl = document.getElementById("days");
const listEl = document.getElementById("list");
const form = document.getElementById("form");
const titleEl = document.getElementById("title");
const urlEl = document.getElementById("url");
const submitEl = document.getElementById("submit");
const cancelEl = document.getElementById("cancel");
const errorEl = document.getElementById("error");

let editingId = null;

/* ---------- 曜日ごとの画像 ---------- */
async function renderDays() {
  const { weekdayImages } = await getState();
  daysEl.replaceChildren();

  for (let day = 0; day < 7; day++) {
    const li = document.createElement("li");
    const name = Object.assign(document.createElement("span"), {
      className: "name", textContent: DAY_NAMES[day],
    });
    const thumb = Object.assign(document.createElement("div"), { className: "thumb" });
    const id = weekdayImages[day];
    if (id) {
      const blob = await getImage(id).catch(() => null);
      if (blob) thumb.style.backgroundImage = `url("${URL.createObjectURL(blob)}")`;
    }

    const file = Object.assign(document.createElement("input"), {
      type: "file", accept: "image/*",
    });
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      const newId = crypto.randomUUID();
      await saveImage(newId, f);
      const state = await getState();
      const old = state.weekdayImages[day];
      await setWeekdayImages({ ...state.weekdayImages, [day]: newId });
      if (old) await deleteImage(old);
      renderDays();
    });

    const clear = Object.assign(document.createElement("button"), {
      textContent: "削除", disabled: !id,
    });
    clear.addEventListener("click", async () => {
      const state = await getState();
      const old = state.weekdayImages[day];
      const next = { ...state.weekdayImages };
      delete next[day];
      await setWeekdayImages(next);
      if (old) await deleteImage(old);
      renderDays();
    });

    li.append(name, thumb, file, clear);
    daysEl.append(li);
  }
}

/* ---------- ショートカット ---------- */
async function renderList() {
  const { shortcuts } = await getState();
  listEl.replaceChildren();

  shortcuts.forEach((s, i) => {
    const li = document.createElement("li");
    const icon = Object.assign(document.createElement("img"), {
      className: "icon", src: faviconUrl(s.url), alt: "",
    });
    const text = document.createElement("div");
    text.className = "grow";
    text.append(s.title, " ");
    text.append(Object.assign(document.createElement("small"), { textContent: s.url }));

    const mk = (label, fn, disabled = false) => {
      const b = Object.assign(document.createElement("button"), { textContent: label, disabled });
      b.addEventListener("click", fn);
      return b;
    };
    const move = (d) => async () => {
      const arr = [...shortcuts];
      [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
      await setShortcuts(arr);
      renderList();
    };

    li.append(
      icon, text,
      mk("↑", move(-1), i === 0),
      mk("↓", move(1), i === shortcuts.length - 1),
      mk("編集", () => startEdit(s)),
      mk("削除", async () => {
        await setShortcuts(shortcuts.filter((x) => x.id !== s.id));
        if (editingId === s.id) resetForm();
        renderList();
      }),
    );
    listEl.append(li);
  });
}

function startEdit(s) {
  editingId = s.id;
  titleEl.value = s.title;
  urlEl.value = s.url;
  submitEl.textContent = "保存";
  cancelEl.hidden = false;
}

function resetForm() {
  editingId = null;
  form.reset();
  submitEl.textContent = "追加";
  cancelEl.hidden = true;
  errorEl.textContent = "";
}

cancelEl.addEventListener("click", resetForm);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = normalizeUrl(urlEl.value.trim());
  if (!url) {
    errorEl.textContent = "http(s):// から始まる正しい URL を入力してください";
    return;
  }
  const title = titleEl.value.trim();
  const { shortcuts } = await getState();

  const next = editingId
    ? shortcuts.map((s) => (s.id === editingId ? { ...s, title, url } : s))
    : [...shortcuts, { id: crypto.randomUUID(), title, url, iconType: "favicon" }];

  await setShortcuts(next);
  resetForm();
  renderList();
});

renderDays();
renderList();
