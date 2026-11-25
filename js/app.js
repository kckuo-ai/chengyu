import { esc, txt, lines, senses, cells, concisedDef, classic, cmpTable, parseCmp } from "./render.js";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");

// ---------------- 資料 ----------------
let INDEX = [], BYNO = new Map(), BYWORD = new Map(), MINE = {}, ILLUSTRATIONS = {};
const chunks = new Map();

async function loadIndex() {
  const [idx, mine, art] = await Promise.all([
    fetch("data/moe-index.json").then((r) => r.json()),
    fetch("data/mine.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch("data/illustrations.json").then((r) => {
      if (!r.ok) throw new Error("插圖目錄載入失敗");
      return r.json();
    }).catch(() => ({ entries: {} })),
  ]);
  INDEX = idx;
  MINE = mine || {};
  ILLUSTRATIONS = art.entries;
  // 預覽草稿：網址加上 ?draft 才會載入 data/mine-draft.json（正式內容優先）
  if (new URLSearchParams(location.search).has("draft")) {
    const draft = await fetch("data/mine-draft.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    MINE = { ...draft, ...MINE };
  }
  for (const it of INDEX) { BYNO.set(it.no, it); BYWORD.set(it.w, it); }
}
async function getEntry(no) {
  const it = BYNO.get(no);
  if (!it) return null;
  if (!chunks.has(it.k)) {
    const k = String(it.k).padStart(2, "0");
    chunks.set(it.k, fetch(`data/detail/${k}.json`).then((r) => r.json()));
  }
  return (await chunks.get(it.k)).find((e) => e.no === no);
}

// ---------------- 學習紀錄（只存在這台裝置） ----------------
const KEY = "chengyu-v1";
const store = (() => {
  let s = { fav: [], learned: [], wrong: {}, played: 0, correct: 0, answered: 0 };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  return {
    get: () => s,
    toggle(list, no) { const a = s[list]; const i = a.indexOf(no); i < 0 ? a.push(no) : a.splice(i, 1); save(); return i < 0; },
    has: (list, no) => s[list].includes(no),
    wrong(no) { s.wrong[no] = (s.wrong[no] || 0) + 1; save(); },
    right(no) { if (s.wrong[no]) { delete s.wrong[no]; save(); } },
    tally(correct, total) { s.played++; s.correct += correct; s.answered += total; save(); },
    reset() { s = { fav: [], learned: [], wrong: {}, played: 0, correct: 0, answered: 0 }; save(); },
  };
})();

// ---------------- 主題（依成語中的字自動分類） ----------------
const THEMES = [
  { id: "animal", name: "動物", chars: "馬牛羊虎龍蛇兔鳥雞犬狗魚鼠豬猴狼狐熊鶴雀鳳蟲蛙象貓鹿燕鴉雁鵬鯨驢騾蝶蜂蟻龜鴨鵝豹獅蟬螳鷸蚌鴻鴿鷹狸貂鶯蠶蝦蟹駒驥" },
  { id: "number", name: "數字", chars: "一二三四五六七八九十百千萬兩雙半" },
  { id: "body", name: "身體", chars: "口手心眼目耳頭首足腳面臉眉鼻舌牙齒髮骨血肝膽腸腹胸背皮掌指唇" },
  { id: "nature", name: "天地自然", chars: "山水風雲雨雪霜露花草木樹林石天日月星海江河湖泉火土冰雷電" },
  { id: "color", name: "顏色", chars: "紅白黑青綠黃紫藍金銀朱碧" },
  { id: "pair", name: "AABB 疊字", test: (w) => w.length === 4 && w[0] === w[1] && w[2] === w[3] },
  { id: "long", name: "長一點的", test: (w) => [...w].length > 4 },
];
const inTheme = (t, w) => (t.test ? t.test(w) : [...w].some((c) => t.chars.includes(c)));

// ---------------- 瀏覽脈絡：從列表或搜尋點進成語頁時，可以直接看上一個／下一個 ----------------
let CTX = null;
const setCtx = (title, items) => { CTX = { title, nos: items.map((i) => i.no), back: location.hash }; };

// ---------------- 工具 ----------------
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s　ˊˇˋ˙]/g, "").toLowerCase();
const link = (w) => (BYWORD.has(w) ? `<a class="chip" href="#/w/${BYWORD.get(w).no}">${esc(w)}</a>` : `<span class="chip">${esc(w)}</span>`);
const split = (s) => (s || "").split(/[、，,]/).map((x) => x.trim()).filter(Boolean);

function illustration(no, quiz = false) {
  const art = ILLUSTRATIONS[no];
  if (!art) return "";
  // Quiz descriptions explain the scene without including the answer's idiom.
  return `<figure class="idiom-art${quiz ? " quiz-art" : ""}">
    <span class="art-box" ${quiz ? "" : `style="aspect-ratio:${art.width}/${art.height}"`}><img src="${esc(art.src)}" alt="${esc(art.alt)}" width="${art.width}" height="${art.height}"></span>
    ${quiz ? "" : '<figcaption>成語情境插圖<span class="src-tag">本站 AI 輔助製作</span></figcaption>'}
  </figure>`;
}

// 插圖：載入中顯示提示；失敗時顯示「點一下重試」，重試會略過快取重新下載
document.addEventListener("load", (ev) => {
  if (ev.target.matches?.(".art-box img")) ev.target.parentElement.classList.add("loaded");
}, true);
document.addEventListener("error", (ev) => {
  const img = ev.target;
  if (!img.matches?.(".art-box img")) return;
  const box = img.parentElement;
  const tries = +(img.dataset.tries || 0);
  if (tries < 1) { img.dataset.tries = tries + 1; img.src = `${img.getAttribute("src").split("?")[0]}?retry=${Date.now()}`; return; }
  box.classList.add("failed");
}, true);
document.addEventListener("click", (ev) => {
  const box = ev.target.closest(".art-box.failed");
  if (!box) return;
  ev.stopPropagation();
  const img = box.querySelector("img");
  box.classList.remove("failed");
  img.src = `${img.getAttribute("src").split("?")[0]}?retry=${Date.now()}`;
}, true);
// 先在背景下載下一個要看的插圖，按「下一個」時就不用等
function preloadArt(no) {
  const art = no && ILLUSTRATIONS[no];
  if (!art) return;
  const im = new Image(); im.decoding = "async"; im.src = art.src;
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.role = "status"; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 1800);
}

// 用裝置內建的語音唸出來。Safari 只開放部分語音，Siri 聲音不開放。
// 自動挑最好的台灣中文語音（高品質 > 增強版 > 一般 > 精簡版），也可以在「我的」手動選。
const VOICE_KEY = "chengyu-voice";
let VOICE = null;
const zhVoices = () => ("speechSynthesis" in window ? speechSynthesis.getVoices() : [])
  .filter((v) => /^zh/i.test(v.lang) || /美佳|mei-?jia/i.test(v.name));
function voiceScore(v) {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/zh[-_]tw/i.test(v.lang)) s += 100;
  else if (/zh[-_](hk|hant)/i.test(v.lang)) s += 20;
  if (/premium|高品質/.test(id)) s += 30;
  if (/enhanced|增強/.test(id)) s += 20;
  if (/compact|精簡/.test(id)) s -= 10;
  return s;
}
function pickVoice() {
  const vs = zhVoices();
  let saved = null;
  try { saved = localStorage.getItem(VOICE_KEY); } catch {}
  VOICE = vs.find((v) => v.voiceURI === saved) || vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate = 0.9) {
  if (!("speechSynthesis" in window)) return toast("這台裝置不支援朗讀");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE?.lang || "zh-TW"; u.rate = rate; if (VOICE) u.voice = VOICE;
  speechSynthesis.speak(u);
}
const voiceLabel = (v) => `${v.name}（${v.lang}${/compact|精簡/i.test(v.voiceURI + v.name) ? "，精簡" : /premium|enhanced|增強|高品質/i.test(v.voiceURI + v.name) ? "，增強" : ""}）`;

function todayIdiom() {
  const d = new Date();
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let h = key; for (let i = 0; i < 3; i++) h = (h * 2654435761) % 4294967296;
  return INDEX[h % INDEX.length];
}

// ---------------- 畫面 ----------------
async function home() {
  const t = todayIdiom();
  const e = await getEntry(t.no);
  const def = e.c?.[0]?.def || "";
  // 搜尋放最上面：一打開就能找，不用先滑過今天的成語
  view.innerHTML = `
    <form class="search search-top" action="#/find" onsubmit="return false">
      <input id="q" type="search" placeholder="找成語：國字、注音或拼音" aria-label="找成語：可以打國字、注音或拼音" autocomplete="off" enterkeyhint="search">
    </form>
    <section class="today">
      <h1>今天的成語</h1>
      ${cells(t.w, t.zy)}
      <p class="pinyin">${esc(t.py)}</p>
      <div class="meaning">${concisedDef(def)}</div>
      ${illustration(t.no)}
      <div class="actions">
        <a class="btn primary" href="#/w/${t.no}">看故事和用法</a>
        <button class="btn" data-say="${esc(t.w)}">🔊 聽一聽</button>
      </div>
    </section>
    ${Object.keys(ILLUSTRATIONS).length ? `<section class="sec"><h2>看圖猜成語</h2>
      <p>看一幅圖，猜一個成語。你能認出幾個故事？</p>
      <a class="btn primary" href="#/quiz?mode=picture">來猜猜看</a></section>` : ""}
    <h2>依主題找</h2>
    <nav class="shelf">${THEMES.map((th) => `<a class="tab-chip" href="#/list/${th.id}">${th.name}<small>${INDEX.filter((i) => inTheme(th, i.w)).length}</small></a>`).join("")}
      <a class="tab-chip" href="#/list/all">全部<small>${INDEX.length}</small></a>
    </nav>`;
  $("#q").addEventListener("keydown", (ev) => { if (ev.key === "Enter") location.hash = `#/find?q=${encodeURIComponent(ev.target.value)}`; });
  $("#q").addEventListener("input", debounce((ev) => { if (ev.target.value.trim()) location.hash = `#/find?q=${encodeURIComponent(ev.target.value)}`; }, 500));
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function listHTML(items, limit) {
  if (!items.length) return `<p class="empty">還沒有成語。</p>`;
  return `<ul class="list">${items.slice(0, limit).map((i) => `
    <li><a href="#/w/${i.no}">
      <span class="w">${esc(i.w)}</span>
      <span class="s">${esc(senses(i.sem)[0])}</span>
      <span class="mark">${store.has("learned", i.no) ? "學會了" : store.has("fav", i.no) ? "★" : ""}</span>
    </a></li>`).join("")}</ul>`;
}
function paged(items, title, extra = "") {
  let n = 40;
  const draw = () => {
    view.innerHTML = `<h2>${esc(title)}</h2>${extra}${listHTML(items, n)}${items.length > n ? `<button class="btn more" id="more">再看 ${Math.min(40, items.length - n)} 個</button>` : ""}`;
    $("#more")?.addEventListener("click", () => { n += 40; draw(); });
  };
  draw();
}

function list(id) {
  const th = THEMES.find((t) => t.id === id);
  const items = th ? INDEX.filter((i) => inTheme(th, i.w)) : INDEX;
  const title = th ? `${th.name}成語` : "全部成語";
  setCtx(title, items);
  paged(items, `${title}（${items.length}）`);
}

function find(q) {
  view.innerHTML = `<form class="search" onsubmit="return false"><label class="hint" for="q">找成語：可以打國字、注音或拼音</label>
    <input id="q" type="search" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></form><div id="res"></div>`;
  const input = $("#q");
  const run = () => {
    const v = input.value.trim();
    history.replaceState(null, "", `#/find?q=${encodeURIComponent(v)}`);
    if (!v) { $("#res").innerHTML = ""; return; }
    const p = plain(v);
    const hit = (i) => i.w.includes(v) || plain(i.zy).includes(p) || plain(i.py).includes(p);
    const a = INDEX.filter(hit);
    const b = INDEX.filter((i) => !hit(i) && i.sem.includes(v));
    setCtx(`搜尋「${v}」`, a.concat(b).slice(0, 120));
    $("#res").innerHTML = `<p class="hint">找到 ${a.length + b.length} 個</p>${listHTML(a.concat(b), 120)}`;
  };
  input.addEventListener("input", debounce(run, 150));
  input.focus(); input.setSelectionRange(q.length, q.length);
  run();
}

// 固定在下方的「上一個／下一個」，不用滑到頁尾或回列表
function ctxNav(no) {
  const pos = CTX ? CTX.nos.indexOf(no) : -1;
  if (pos < 0 || CTX.nos.length < 2) return "";
  const p = BYNO.get(CTX.nos[pos - 1]), n = BYNO.get(CTX.nos[pos + 1]);
  return `<nav class="dock dock-nav" aria-label="${esc(CTX.title)}">
    ${p ? `<a class="nav-step" href="#/w/${p.no}"><small>‹ 上一個</small><b>${esc(p.w)}</b></a>` : `<span class="nav-step" aria-hidden="true"></span>`}
    <a class="nav-mid" href="${esc(CTX.back)}">${pos + 1} / ${CTX.nos.length}<small>回列表</small></a>
    ${n ? `<a class="nav-step next" href="#/w/${n.no}"><small>下一個 ›</small><b>${esc(n.w)}</b></a>` : `<span class="nav-step" aria-hidden="true"></span>`}
  </nav>`;
}

async function entry(no) {
  const e = await getEntry(no);
  if (!e) { view.innerHTML = `<p class="empty">找不到這個成語。<a href="#/">回首頁</a></p>`; return; }
  const sem = senses(e.sem), usage = senses(e.usage), ex = senses(e.ex);
  const mine = MINE[e.w];
  const fav = store.has("fav", no), learned = store.has("learned", no);
  view.innerHTML = `
    <article data-entry-no="${no}">
      <header class="entry-head">
        ${cells(e.w, e.zy)}
        <p class="pinyin">${esc(e.py)}</p>
        <div class="actions">
          <button class="btn" data-say="${esc(e.w)}">🔊 聽一聽</button>
          <button class="btn" data-toggle="fav" aria-pressed="${fav}">${fav ? "★ 已收藏" : "☆ 收藏"}</button>
          <button class="btn" data-toggle="learned" aria-pressed="${learned}">${learned ? "✓ 學會了" : "我學會了"}</button>
        </div>
      </header>

      ${illustration(no)}

      ${e.c?.length ? `<section class="sec"><h2>意思<span class="src-tag">國語辭典簡編本</span></h2>
        <div class="lede">${e.c.map((c) => (e.c.length > 1 ? `<p class="lbl">${esc(c.zy)}</p>` : "") + concisedDef(c.def)).join("")}</div></section>` : ""}

      ${ex.some((x) => lines(x).length) ? `<section class="sec"><h2>例句<span class="src-tag">成語典</span></h2>
        ${ex.map((x, i) => {
          const two = lines(x).slice(0, 2);
          if (!two.length) return "";
          return `${sem.length > 1 ? `<p class="lbl">${i + 1}. ${txt(sem[i] || "")}</p>` : ""}<ul class="ex-short">${two.map((l) => `<li>${txt(l)}</li>`).join("")}</ul>`;
        }).join("")}</section>` : ""}

      ${mine?.story ? `<section class="sec"><h2>小故事<span class="src-tag">本站編寫</span></h2>
        <div class="mine story-short">${lines(mine.story).map((l) => `<p>${esc(l)}</p>`).join("")}</div>
        <button class="btn" data-say-mine>🔊 聽小故事</button></section>` : ""}

      ${e.story ? `<section class="sec"><h2>${mine?.story ? "完整的成語故事" : "成語故事"}<span class="src-tag">成語典</span></h2>
        <div class="actions"><button class="btn" data-say-story>🔊 唸故事給我聽</button></div>
        <div class="story clamp" id="story">${lines(e.story).map((l) => `<p>${txt(l)}</p>`).join("")}</div>
        <button class="linkish" id="story-more">看完整故事</button></section>` : ""}

      ${mine?.note || mine?.examples?.length ? `<section class="sec"><h2>我們的補充<span class="src-tag">本站編寫</span></h2><div class="mine">
        ${mine.note ? `<p>${esc(mine.note)}</p>` : ""}
        ${mine.examples?.length ? `<ul>${mine.examples.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></section>` : ""}

      ${e.sem ? `<section class="sec"><h2>怎麼用（詳細）<span class="src-tag">成語典</span></h2>
        ${sem.map((s, i) => {
          const exs = lines(ex[i]).slice(2);
          return `<div class="sense">
            <p>${sem.length > 1 ? `${i + 1}. ` : ""}${txt(s)}</p>
            ${usage[i] ? `<p class="usage">${txt(usage[i])}</p>` : ""}
            ${exs.length ? `<p class="lbl">更多例句</p><ul>${exs.slice(0, 3).map((x) => `<li>${txt(x)}</li>`).join("")}</ul>
              ${exs.length > 3 ? `<ul class="more-ex">${exs.slice(3).map((x) => `<li>${txt(x)}</li>`).join("")}</ul>
              <button class="linkish" data-more>再看 ${exs.length - 3} 個例句</button>` : ""}` : ""}
          </div>`;
        }).join("")}</section>` : ""}

      ${e.syn || e.ant ? `<section class="sec"><h2>相似和相反<span class="src-tag">成語典</span></h2>
        ${e.syn ? `<p class="lbl">意思相近</p><div class="chips">${split(e.syn).map(link).join("")}</div>` : ""}
        ${e.ant ? `<p class="lbl">意思相反</p><div class="chips">${split(e.ant).map(link).join("")}</div>` : ""}</section>` : ""}

      ${e.same || e.diff || e.cmp ? `<section class="sec"><h2>比一比<span class="src-tag">成語典</span></h2>
        ${e.same ? `<p>${txt(e.same)}</p>` : ""}${e.diff ? `<p>${txt(e.diff)}</p>` : ""}
        ${cmpTable(e.cmp)}</section>` : ""}

      ${e.confuse ? `<section class="sec"><h2>容易寫錯、唸錯<span class="src-tag">成語典</span></h2>${lines(e.confuse).map((l) => `<p>${txt(l)}</p>`).join("")}</section>` : ""}

      <details class="orig">
        <summary>看《成語典》原文（給大人和高年級）</summary>
        <h3>釋義</h3>${lines(e.def).map((l) => `<p>${txt(l)}</p>`).join("")}
        ${e.src ? `<h3>典源：${txt(e.srcName || "")}</h3>${classic(e.src)}` : ""}
        ${e.srcNote ? `<h3>注解</h3><ol class="notes">${lines(e.srcNote).map((l) => `<li>${txt(l)}</li>`).join("")}</ol>` : ""}
        ${e.srcRef ? `<h3>典源參考資料</h3>${lines(e.srcRef).map((l) => `<p>${txt(l)}</p>`).join("")}` : ""}
        ${e.cite ? `<h3>書證</h3><ol class="cites">${lines(e.cite).map((l) => `<li>${txt(l)}</li>`).join("")}</ol>` : ""}
        ${e.ref ? `<h3>參考詞語</h3><p>${txt(e.ref)}</p>` : ""}
      </details>

      <p class="credit">資料來源：中華民國教育部《成語典》、《國語辭典簡編本》，依 CC BY-ND 3.0 臺灣授權使用，內容未經修改。<a href="#/about">授權說明</a></p>
    </article>${ctxNav(no)}`;
  if (CTX) { const pos = CTX.nos.indexOf(no); if (pos >= 0) { preloadArt(CTX.nos[pos + 1]); preloadArt(CTX.nos[pos - 1]); } }

  view.querySelector("[data-say-story]")?.addEventListener("click", () => speak(lines(e.story).join(""), 1));
  view.querySelector("[data-say-mine]")?.addEventListener("click", () => speak(lines(mine.story).join(""), 0.95));
  const st = $("#story"), sm = $("#story-more");
  if (st && sm) {
    if (st.scrollHeight <= st.clientHeight + 4) sm.remove();
    sm.addEventListener("click", () => { st.classList.remove("clamp"); sm.remove(); });
  }
  view.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", () => { b.closest(".sense").classList.add("open"); b.remove(); }));
  view.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const list = b.dataset.toggle; const on = store.toggle(list, no);
    b.setAttribute("aria-pressed", on);
    b.textContent = list === "fav" ? (on ? "★ 已收藏" : "☆ 收藏") : (on ? "✓ 學會了" : "我學會了");
  }));
}

// ---------------- 測驗 ----------------
const MODES = [
  { id: "picture", name: "看圖猜成語", desc: "觀察圖畫，猜猜它描繪哪個成語" },
  { id: "meaning", name: "看意思，選成語", desc: "讀一段解釋，選出對的成語" },
  { id: "word", name: "看成語，選意思", desc: "看到成語，選出它的意思" },
  { id: "near", name: "相似或相反", desc: "找出意思相近或相反的成語" },
  { id: "fit", name: "填填看", desc: "哪個成語放進句子才對？" },
];
let quizCfg = { mode: "meaning", pool: "all" };

function poolItems(pool) {
  const s = store.get();
  if (pool === "fav") return INDEX.filter((i) => s.fav.includes(i.no));
  if (pool === "wrong") return INDEX.filter((i) => s.wrong[i.no]);
  if (pool === "learned") return INDEX.filter((i) => s.learned.includes(i.no));
  return INDEX;
}

function makeQ(mode, t) {
  const others = (n, bad) => shuffle(INDEX.filter((i) => !bad.has(i.w))).slice(0, n);
  if (mode === "picture") {
    if (!ILLUSTRATIONS[t.no]) return null;
    const similar = new Set([t.w, ...split(t.syn)]);
    const candidates = INDEX.filter((i) => !similar.has(i.w) && !split(i.syn).includes(t.w));
    const opts = shuffle([t, ...shuffle(candidates).slice(0, 3)]);
    return { target: t, prompt: `${illustration(t.no, true)}<p class="hint">這幅圖描繪哪一個成語？</p>`, opts: opts.map((o) => ({ label: esc(o.w), ok: o === t, big: true })) };
  }
  if (mode === "meaning") {
    const opts = shuffle([t, ...others(3, new Set([t.w]))]);
    return { target: t, prompt: `<p>${senses(t.sem).map(txt).join("<br>")}</p><p class="hint">這是哪一個成語？</p>`, opts: opts.map((o) => ({ label: esc(o.w), ok: o === t, big: true })) };
  }
  if (mode === "word") {
    const opts = shuffle([t, ...others(3, new Set([t.w]))]);
    return { target: t, prompt: `${cells(t.w, t.zy, "small")}<p class="hint">它的意思是？</p>`, opts: opts.map((o) => ({ label: senses(o.sem).map(txt).join("<br>"), ok: o === t })) };
  }
  if (mode === "near") {
    const syn = split(t.syn), ant = split(t.ant);
    const useAnt = ant.length && (!syn.length || Math.random() < 0.4);
    const pool = useAnt ? ant : syn;
    if (!pool.length) return null;
    const ans = pick(pool);
    const bad = new Set([t.w, ...syn, ...ant]);
    const opts = shuffle([{ w: ans }, ...others(3, bad)]);
    return { target: t, prompt: `${cells(t.w, t.zy, "small")}<p>哪一個和它的意思<strong>${useAnt ? "相反" : "相近"}</strong>？</p>`, opts: opts.map((o) => ({ label: esc(o.w), ok: o.w === ans, big: true })) };
  }
  if (mode === "fit") {
    const c = parseCmp(t.cmp);
    if (!c) return null;
    const rows = c.rows.filter((r) => r.marks.filter(Boolean).length === 1);
    if (!rows.length) return null;
    const r = pick(rows);
    const sentence = txt(r.sentence).replace(/[∼～~]/g, '<span class="blank" aria-label="空格"></span>');
    return { target: t, prompt: `<p>${sentence}</p><p class="hint">空格裡要填哪一個？</p>`, opts: c.head.map((h, i) => ({ label: esc(h), ok: r.marks[i], big: true })) };
  }
}

function quizHome() {
  const s = store.get();
  const eligible = (pool) => poolItems(pool).filter((i) => quizCfg.mode !== "picture" || ILLUSTRATIONS[i.no]);
  const counts = Object.fromEntries(["all", "fav", "learned", "wrong"].map((pool) => [pool, eligible(pool).length]));
  const count = Math.min(10, counts[quizCfg.pool]);
  view.innerHTML = `
    <h2 class="q-h">選一種玩法</h2>
    <div class="modes">${MODES.map((m) => `<button class="mode" data-mode="${m.id}" aria-pressed="${quizCfg.mode === m.id}"><b>${m.name}</b><span>${m.desc}</span></button>`).join("")}</div>
    <div class="dock dock-start">
      <div class="seg" role="group" aria-label="出題範圍">${[["all", "全部"], ["fav", "收藏"], ["learned", "學會"], ["wrong", "答錯"]].map(([id, n]) =>
      `<button class="btn" data-pool="${id}" aria-pressed="${quizCfg.pool === id}" ${counts[id] < 1 ? "disabled" : ""}>${n} ${counts[id]}</button>`).join("")}</div>
      <button class="btn primary big-btn" id="go" ${count ? "" : "disabled"}>${count ? `開始 ${count} 題：${MODES.find((m) => m.id === quizCfg.mode).name}` : "這個範圍還沒有可練習的成語"}</button>
    </div>`;
  view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { quizCfg.mode = b.dataset.mode; quizHome(); }));
  view.querySelectorAll("[data-pool]").forEach((b) => b.addEventListener("click", () => { quizCfg.pool = b.dataset.pool; quizHome(); }));
  $("#go").addEventListener("click", startQuiz);
}

function startQuiz() {
  const { mode, pool } = quizCfg;
  let items = poolItems(pool);
  if (mode === "picture") items = items.filter((i) => ILLUSTRATIONS[i.no]);
  if (mode === "near") items = items.filter((i) => i.syn || i.ant);
  if (mode === "fit") items = items.filter((i) => i.cmp);
  const qs = [];
  for (const t of shuffle(items)) { const q = makeQ(mode, t); if (q) qs.push(q); if (qs.length === 10) break; }
  if (!qs.length) { toast("這個範圍沒有適合這種玩法的題目，換一個範圍試試"); return; }
  ACTIVE = { qs, i: 0, score: 0, picked: null };
  if (location.hash === "#/quiz/play") runQuiz(); else location.hash = "#/quiz/play";
}
// 進行中的測驗：記住目前題號與作答，按「看成語」再返回時接著做，不會重來
let ACTIVE = null;
function runQuiz() {
  const st = ACTIVE;
  if (!st) return quizHome();
  const { qs } = st;
  document.body.classList.add("playing");
  const next = () => {
    st.i++; st.picked = null;
    st.i < qs.length ? draw() : done();
    window.scrollTo(0, 0);
  };
  const mark = () => {
    const q = qs[st.i];
    const k = st.picked, ok = q.opts[k].ok;
    view.querySelectorAll(".opt").forEach((x, j) => { x.disabled = true; if (q.opts[j].ok) x.classList.add("right"); });
    if (!ok) view.querySelector(`.opt[data-k="${k}"]`).classList.add("wrong");
    const answer = q.opts.find((o) => o.ok);
    const last = st.i + 1 >= qs.length;
    // 答完後，結果和「下一題」固定在畫面最下方，大拇指就按得到
    $("#dock").innerHTML = `
      <div class="q-result ${ok ? "ok" : "ng"}">${ok ? "答對了！" : `正確答案：${answer.big ? answer.label : `「${esc(q.target.w)}」`}`}</div>
      <div class="q-dock-btns">
        <a class="btn" href="#/w/${q.target.no}">看「${esc(q.target.w)}」</a>
        <button class="btn primary big-btn" id="next">${last ? "看成績" : "下一題"}</button>
      </div>`;
    $("#dock").hidden = false;
    $("#next").addEventListener("click", next);
    $("#next").focus({ preventScroll: true });
  };
  const draw = () => {
    const q = qs[st.i];
    const twoCol = q.opts.every((o) => o.big);
    view.innerHTML = `
      <div class="q-top">
        <a class="q-quit" href="#/quiz">✕ 結束</a>
        <div class="q-bar" aria-hidden="true"><i style="width:${(st.i / qs.length) * 100}%"></i></div>
        <span class="q-count">${st.i + 1} / ${qs.length}</span>
      </div>
      <div class="q-prompt">${q.prompt}</div>
      <div class="opts ${twoCol ? "two" : ""}">${q.opts.map((o, k) => `<button class="opt ${o.big ? "big" : ""}" data-k="${k}">${o.label}</button>`).join("")}</div>
      <div class="dock dock-quiz" id="dock" hidden></div>`;
    // 已經作答過時，「結束」要按兩次，避免手滑把進度弄丟
    const quit = view.querySelector(".q-quit");
    quit.addEventListener("click", (ev) => {
      if ((st.i === 0 && st.picked === null) || quit.classList.contains("confirm")) return;
      ev.preventDefault();
      quit.classList.add("confirm"); quit.textContent = "確定結束？";
      setTimeout(() => { quit.classList.remove("confirm"); quit.textContent = "✕ 結束"; }, 3000);
    });
    if (q.prompt.includes("quiz-art")) preloadArt(qs[st.i + 1]?.target.no);
    view.querySelector(".quiz-art img")?.addEventListener("click", (ev) => ev.currentTarget.closest(".quiz-art").classList.toggle("zoom"));
    view.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      if (st.picked !== null) return;
      st.picked = +b.dataset.k;
      q.opts[st.picked].ok ? (st.score++, store.right(q.target.no)) : store.wrong(q.target.no);
      mark();
    }));
    if (st.picked !== null) mark();
  };
  const done = () => {
    document.body.classList.remove("playing");
    store.tally(st.score, qs.length);
    const score = st.score;
    ACTIVE = null;
    view.innerHTML = `<div class="score">${Math.round(score / qs.length * 100)} 分</div>
      <p>答對 ${score} 題，共 ${qs.length} 題。${score === qs.length ? "全對！" : "答錯的成語已經放進「答錯過的」，可以再練一次。"}</p>
      <div class="actions"><button class="btn primary" id="again">再玩一次</button><a class="btn" href="#/quiz">換玩法</a></div>`;
    $("#again").addEventListener("click", startQuiz);
  };
  draw();
}

// ---------------- 我的 ----------------
function me() {
  const s = store.get();
  const by = (nos) => nos.map((n) => BYNO.get(+n)).filter(Boolean);
  view.innerHTML = `
    <h2>我的學習</h2>
    <div class="stats">
      <div><b>${s.learned.length}</b>學會了</div>
      <div><b>${s.fav.length}</b>收藏</div>
      <div><b>${s.played}</b>測驗次數</div>
      <div><b>${s.answered ? Math.round((s.correct / s.answered) * 100) : 0}%</b>答對率</div>
    </div>
    <h2>收藏的成語</h2>${listHTML(by(s.fav), 999)}
    <h2>答錯過的</h2>${listHTML(by(Object.keys(s.wrong)), 999)}
    <h2>學會了</h2>${listHTML(by(s.learned), 999)}
    <h2>朗讀聲音</h2>
    <p class="hint">這裡列出 Safari 讓網頁使用的中文語音。iPad 設定裡下載的增強版或 Siri 聲音，不一定會出現在這裡。</p>
    <div class="actions">
      <select id="voice" class="btn" aria-label="選擇朗讀聲音"></select>
      <button class="btn" id="try">🔊 試聽</button>
    </div>
    <h2>離線使用</h2>
    <p class="hint">下載全部成語文字與目前的 ${Object.keys(ILLUSTRATIONS).length} 張插圖，之後沒有網路也能看。插圖較大，建議使用 Wi-Fi。</p>
    <div class="actions"><button class="btn" id="dl">下載全部內容</button></div>
    <h2>重新開始</h2>
    <p class="hint">學習紀錄只存在這台裝置上。</p>
    <div class="actions"><button class="btn" id="reset">清除學習紀錄</button></div>
    <h2>版本</h2>
    <p class="hint" id="ver">目前版本：讀取中…</p>
    <div class="actions"><button class="btn" id="check-update">檢查更新</button></div>
    <p class="hint"><a href="#/about">資料來源與授權</a></p>`;
  currentVersion().then((v) => { const el = $("#ver"); if (el) el.textContent = `目前版本：${v || "（離線快取尚未啟用）"}`; });
  $("#check-update").addEventListener("click", async (ev) => {
    const b = ev.currentTarget;
    if (!SW_REG) { toast("這個瀏覽器沒有啟用自動更新，請直接重新整理。"); return; }
    b.disabled = true; b.textContent = "檢查中…";
    try { await SW_REG.update(); } catch {}
    // 新版下載需要一點時間；下載好會自動出現「有新版本了」
    setTimeout(() => {
      b.disabled = false; b.textContent = "檢查更新";
      if (SW_REG.waiting || SW_REG.installing) { if (SW_REG.waiting) showUpdateBanner(SW_REG); else toast("正在下載新版本，好了會通知你"); }
      else toast("已經是最新版本");
    }, 1500);
  });
  const fillVoices = () => {
    const sel = $("#voice");
    if (!sel) return;
    const vs = zhVoices().sort((a, b) => voiceScore(b) - voiceScore(a));
    sel.innerHTML = vs.length
      ? vs.map((v) => `<option value="${esc(v.voiceURI)}" ${VOICE && v.voiceURI === VOICE.voiceURI ? "selected" : ""}>${esc(voiceLabel(v))}</option>`).join("")
      : `<option>找不到中文語音</option>`;
    sel.disabled = !vs.length;
  };
  fillVoices();
  if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", fillVoices);
  $("#voice").addEventListener("change", (ev) => {
    try { localStorage.setItem(VOICE_KEY, ev.target.value); } catch {}
    pickVoice(); speak("守株待兔");
  });
  $("#try").addEventListener("click", () => speak("守株待兔。宋國有個農夫，看見一隻兔子撞上樹，就天天守在樹旁等兔子。"));
  $("#dl").addEventListener("click", async (ev) => {
    const b = ev.currentTarget; b.disabled = true;
    if (!navigator.serviceWorker?.controller) {
      b.disabled = false;
      toast("離線下載需要 HTTPS 與已啟用的離線快取，請先重新整理再試。");
      return;
    }
    const urls = [...new Set(INDEX.map((i) => `data/detail/${String(i.k).padStart(2, "0")}.json`)), ...Object.values(ILLUSTRATIONS).map((a) => a.src)];
    let n = 0;
    try {
      // Explicitly await cache writes before reporting readiness or quota errors.
      const cache = await caches.open("chengyu-offline-v1");
      for (const url of urls) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`下載失敗：${url}`);
        await cache.put(url, response);
        b.textContent = `下載中 ${++n}/${urls.length}`;
      }
      b.textContent = "已下載，可離線使用";
    } catch {
      b.disabled = false;
      b.textContent = "下載未完成，按此重試";
      toast("部分內容未能下載，請確認網路與裝置儲存空間後重試。");
    }
  });
  $("#reset").addEventListener("click", (ev) => {
    const b = ev.currentTarget;
    if (b.dataset.confirm) { store.reset(); me(); toast("已清除學習紀錄"); }
    else { b.dataset.confirm = 1; b.textContent = "再按一次確定清除"; }
  });
}

async function about() {
  const meta = await fetch("data/meta.json").then((r) => r.json()).catch(() => ({}));
  const ver = (f, re) => (f || "").match(re)?.[1] || "（見 data/meta.json）";
  view.innerHTML = `<div class="about">
    <h2>資料來源與授權</h2>
    <p>本網站收錄的成語，是教育部《成語典》中的主條成語，同時也收錄在《國語辭典簡編本》（適用對象為國中小學生）的 ${INDEX.length} 條。</p>
    <p>中華民國教育部（Ministry of Education, R.O.C.）。《成語典》（版本編號：${esc(ver(meta.idiomsFile, /(\d{4}_\d{8})/))}）網址：<a href="https://dict.idioms.moe.edu.tw/" rel="noopener">http://dict.idioms.moe.edu.tw/</a></p>
    <p>中華民國教育部（Ministry of Education, R.O.C.）。《國語辭典簡編本》（版本編號：${esc(ver(meta.concisedFile, /(\d{4}_\d{8})/))}）網址：<a href="https://dict.concised.moe.edu.tw/" rel="noopener">https://dict.concised.moe.edu.tw/</a></p>
    <p>以上資料採用<a href="https://creativecommons.org/licenses/by-nd/3.0/tw/" rel="noopener">創用 CC－姓名標示－禁止改作 臺灣 3.0 版授權條款</a>釋出。本網站只轉換顯示格式，未修改任何條目的詞目、音讀、釋義、典源、書證及用法說明。授權使用說明全文：<a href="licenses/">licenses 資料夾</a>。</p>
    <p>主題分類、測驗題目的組合方式，以及「我們的補充」內容，由本網站自行編寫。朗讀使用裝置內建語音。</p>
    <p>成語情境插圖由本站以 AI 輔助製作，依詞義另行設計，非教育部提供或背書。採用鉛筆、水彩與彩色鉛筆的通用技法，不指定模仿特定創作者，也不使用品牌角色或商標。</p>
    <p>本網站不是教育部官方網站。學習紀錄只存在你的裝置上，不會上傳。</p>
    <p><a href="https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html" rel="noopener">教育部國語辭典公眾授權網</a></p>
  </div>`;
}

// ---------------- 路由 ----------------
async function route() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  document.body.classList.remove("playing");
  const h = location.hash.slice(1) || "/";
  const [path, qs] = h.split("?");
  const parts = path.split("/").filter(Boolean);
  const tab = { "": "home", list: "home", w: "home", find: "find", quiz: "quiz", me: "me", about: "me" }[parts[0] || ""];
  document.querySelectorAll(".tabbar a").forEach((a) => (a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  try {
    if (!parts.length) await home();
    else if (parts[0] === "w") await entry(+parts[1]);
    else if (parts[0] === "list") list(parts[1]);
    else if (parts[0] === "find") find(new URLSearchParams(qs).get("q") || "");
    else if (parts[0] === "quiz") {
      const mode = new URLSearchParams(qs).get("mode");
      if (parts[1] !== "play" && MODES.some((m) => m.id === mode)) quizCfg.mode = mode;
      parts[1] === "play" ? runQuiz() : quizHome();
    }
    else if (parts[0] === "me") me();
    else if (parts[0] === "about") await about();
    else await home();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<p class="empty">內容載入失敗。請檢查網路後重新整理。</p>`;
  }
  if (!(parts[0] === "find")) window.scrollTo(0, 0);
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-say]");
  if (b) speak(b.dataset.say, 0.85);
});

await loadIndex();
window.addEventListener("hashchange", route);
route();

// ---------------- 新版通知 ----------------
// 有新版本時在畫面上方顯示通知，按「更新」就切換到新版並重新開啟。
// 回到網站（從背景切回來）或每 30 分鐘會自動檢查一次。
function showUpdateBanner(reg) {
  if (document.getElementById("update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "update-bar"; bar.className = "update-bar"; bar.setAttribute("role", "status");
  bar.innerHTML = `<span>有新版本了</span>
    <button class="btn" id="update-later">稍後</button>
    <button class="btn primary" id="update-now">更新</button>`;
  document.body.append(bar);
  bar.querySelector("#update-later").addEventListener("click", () => bar.remove());
  bar.querySelector("#update-now").addEventListener("click", (ev) => {
    ev.currentTarget.disabled = true; ev.currentTarget.textContent = "更新中…";
    WANT_RELOAD = true;
    if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    else location.reload();
  });
}
let WANT_RELOAD = false;
let SW_REG = null;
// 問目前在運作的版本號（顯示在「我的」）
function currentVersion() {
  const ctl = navigator.serviceWorker?.controller;
  if (!ctl) return Promise.resolve("");
  return new Promise((resolve) => {
    const on = (ev) => { if (ev.data?.type === "VERSION") { navigator.serviceWorker.removeEventListener("message", on); resolve(ev.data.version); } };
    navigator.serviceWorker.addEventListener("message", on);
    ctl.postMessage("VERSION");
    setTimeout(() => resolve(""), 1500);
  });
}
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (WANT_RELOAD) { WANT_RELOAD = false; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    SW_REG = reg;
    const hasOld = () => !!navigator.serviceWorker.controller;
    if (reg.waiting && hasOld()) showUpdateBanner(reg);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed" && hasOld()) showUpdateBanner(reg);
      });
    });
    const check = () => reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
}
