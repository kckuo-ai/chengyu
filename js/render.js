// 把教育部原文欄位轉成 HTML。只處理「顯示格式」，不改動任何文字。
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 罕用字圖片：原文以 &檔名.jpg; 表示
function rare(html) {
  return html.replace(/&amp;([^;&\s]+?\.(?:jpg|gif|png))\s*;/gi,
    (_, f) => `<img class="rare" src="img/rare/${encodeURIComponent(f.trim())}" alt="（罕用字）">`);
}
export const txt = (s) => rare(esc(s));
export const lines = (s) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
export const senses = (s) => (s || "").split("＆").map((x) => x.trim());

// 注音：取第一個讀音（括號前），每字一個音節
const TONES = "ˊˇˋ";
export function syllables(zy) {
  const main = (zy || "").split("（")[0];
  return main.split(/[　\s]+/).filter(Boolean);
}
function zyHTML(syl) {
  let light = "";
  if (syl.startsWith("˙")) { light = "˙"; syl = syl.slice(1); }
  let tone = "";
  if (TONES.includes(syl.at(-1))) { tone = syl.at(-1); syl = syl.slice(0, -1); }
  const body = [...syl].map(esc).join("<br>");
  return `<span class="zy-syl"><span class="zy-body">${light ? `<span class="zy-light">${light}</span>` : ""}${body}</span><span class="zy-tone">${tone}</span></span>`;
}
const isHan = (c) => /\p{Script=Han}/u.test(c);

// 成語格子：一字一格（田字格）+ 右側直排注音
export function cells(word, zy, cls = "") {
  const syl = syllables(zy);
  let i = 0;
  const units = [...word].map((c) => {
    if (!isHan(c)) return `<span class="punct" aria-hidden="true">${esc(c)}</span>`;
    const s = syl[i++] || "";
    return `<span class="unit"><span class="ch">${esc(c)}</span><span class="zy">${s ? zyHTML(s) : ""}</span></span>`;
  }).join("");
  return `<div class="cells ${cls}" lang="zh-Hant-TW" role="img" aria-label="${esc(word)}">${units}</div>`;
}

// 簡編本釋義：保留 [例] 等標記，改以小標籤顯示
export function concisedDef(s) {
  return lines(s).map((l) =>
    `<p>${txt(l).replace(/\[(例|似|反)\]/g, '<span class="ex-tag">$1</span>')}</p>`).join("");
}

// 典源文獻內容：# 開頭為上下文段落；*n* 為注釋編號；其餘行接成一段
export function classic(s) {
  const out = [];
  let buf = "";
  const flush = () => { if (buf) { out.push(`<p>${buf}</p>`); buf = ""; } };
  for (const raw of (s || "").split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    const h = txt(l).replace(/\*(\d+)\*/g, "<sup>$1</sup>");
    if (l.startsWith("#")) { flush(); out.push(`<p class="ctx">${h.slice(1)}</p>`); }
    else buf += h;
  }
  flush();
  return `<div class="classic">${out.join("")}</div>`;
}

// 辨識例句表：第一行是兩個成語，之後每行「○/ㄨ\t○/ㄨ\t例句」
export function parseCmp(s) {
  const ls = (s || "").split("\n").map((x) => x.replace(/\r/g, "")).filter((x) => x.trim());
  if (ls.length < 2) return null;
  const head = ls[0].split("\t").map((x) => x.trim());
  const rows = ls.slice(1).map((l) => {
    const p = l.split("\t");
    const marks = p.slice(0, head.length).map((m) => /[○〇]/.test(m));
    return { marks, raw: p.slice(0, head.length).map((x) => x.trim()), sentence: p.slice(head.length).join("\t").trim() };
  });
  return { head, rows };
}
export function cmpTable(s) {
  const t = parseCmp(s);
  if (!t) return "";
  return `<table class="cmp"><thead><tr>${t.head.map((h) => `<th>${txt(h)}</th>`).join("")}<th>例句</th></tr></thead><tbody>${
    t.rows.map((r) => `<tr>${r.raw.map((m, i) => `<td class="${r.marks[i] ? "ok" : "no"}" aria-label="${r.marks[i] ? "適用" : "不適用"}">${txt(m)}</td>`).join("")}<td>${txt(r.sentence)}</td></tr>`).join("")
  }</tbody></table>`;
}
