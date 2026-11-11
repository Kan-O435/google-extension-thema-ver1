export const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// デバッグ用: URL に ?day=0〜6 を付けると曜日を上書きできる
export function currentWeekday() {
  const override = new URLSearchParams(location.search).get("day");
  if (override !== null && /^[0-6]$/.test(override)) return Number(override);
  return new Date().getDay();
}

// 曜日が変わったら callback を呼ぶ(0時のタイマー + タブ復帰時の再評価)
export function onWeekdayChange(callback) {
  let last = currentWeekday();
  const check = () => {
    const now = currentWeekday();
    if (now !== last) {
      last = now;
      callback(now);
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
  setInterval(check, 60 * 1000);
}
