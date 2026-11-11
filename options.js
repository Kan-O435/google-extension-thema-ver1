import {
  getState, setShortcuts, setWeekdayImages,
  saveImage, getImage, deleteImage, normalizeUrl, faviconUrl,
} from "./lib/storage.js";
import { DAY_NAMES } from "./lib/weekday.js";
import { bundledEntries } from "./lib/pool.js";

const daysEl = document.getElementById("days");
const listEl = document.getElementById("list");
const form = document.getElementById("form");
const titleEl = document.getElementById("title");
const urlEl = document.getElementById("url");
const submitEl = document.getElementById("submit");
const cancelEl = document.getElementById("cancel");
const errorEl = document.getElementById("error");

let editingId = null;

/* ---------- 曜日ごとの画像(複数枚) ---------- */
async function renderDays() {
  const { weekdayImages } = await getState();
  daysEl.replaceChildren();

  for (let day = 0; day < 7; day++) {
    const li = document.createElement("li");
    li.className = "day";
    const name = Object.assign(document.createElement("span"), {
      className: "name", textContent: DAY_NAMES[day],
    });

    const thumbs = document.createElement("div");
    thumbs.className = "thumbs";

    // エディタ側 (config.js) の画像: 読み取り専用
    for (const b of bundledEntries(day)) {
      const t = Object.assign(document.createElement("div"), {
        className: "thumb", title: `config.js: ${b.id.slice(2)}`,
      });
      t.style.backgroundImage = `url("${b.src}")`;
      thumbs.append(t);
    }

    // アップロードした画像: 個別に削除できる
    for (const id of weekdayImages[day] || []) {
      const t = document.createElement("div");
      t.className = "thumb";
      const blob = await getImage(id).catch(() => null);
      if (blob) t.style.backgroundImage = `url("${URL.createObjectURL(blob)}")`;
      const del = Object.assign(document.createElement("button"), {
        className: "del", textContent: "×", title: "削除",
      });
      del.addEventListener("click", async () => {
        const state = await getState();
        const rest = (state.weekdayImages[day] || []).filter((x) => x !== id);
        const next = { ...state.weekdayImages, [day]: rest };
        if (!rest.length) delete next[day];
        await setWeekdayImages(next);
        await deleteImage(id);
        renderDays();
      });
      t.append(del);
      thumbs.append(t);
    }

    const file = Object.assign(document.createElement("input"), {
      type: "file", accept: "image/*", multiple: true,
    });
    file.addEventListener("change", async () => {
      const ids = [];
      for (const f of file.files) {
        const id = crypto.randomUUID();
        await saveImage(id, f);
        ids.push(id);
      }
      if (!ids.length) return;
      const state = await getState();
      await setWeekdayImages({
        ...state.weekdayImages,
        [day]: [...(state.weekdayImages[day] || []), ...ids],
      });
      renderDays();
    });

    li.append(name, thumbs, file);
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
