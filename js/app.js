import { esc, txt, lines, senses, cells, concisedDef, classic, cmpTable, parseCmp } from "./render.js";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");

// ---------------- 資料 ----------------
let INDEX = [], BYNO = new Map(), BYWORD = new Map(), MINE = {};
const chunks = new Map();

async function loadIndex() {
  const [idx, mine] = await Promise.all([
    fetch("data/moe-index.json").then((r) => r.json()),
    fetch("data/mine.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  INDEX = idx;
  MINE = mine || {};
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

// ---------------- 工具 ----------------
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s　ˊˇˋ˙]/g, "").toLowerCase();
const link = (w) => (BYWORD.has(w) ? `<a class="chip" href="#/w/${BYWORD.get(w).no}">${esc(w)}</a>` : `<span class="chip">${esc(w)}</span>`);
const split = (s) => (s || "").split(/[、，,]/).map((x) => x.trim()).filter(Boolean);

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
  view.innerHTML = `
    <section class="today">
      <h1>今天的成語</h1>
      ${cells(t.w, t.zy)}
      <p class="pinyin">${esc(t.py)}</p>
      <div class="meaning">${concisedDef(def)}</div>
      <div class="actions">
        <a class="btn primary" href="#/w/${t.no}">看故事和用法</a>
        <button class="btn" data-say="${esc(t.w)}">🔊 聽一聽</button>
      </div>
    </section>
    <form class="search" action="#/find" onsubmit="return false">
      <label class="hint" for="q">找成語：可以打國字、注音或拼音</label>
      <input id="q" type="search" placeholder="例如：兔、ㄕㄡˇ、shou" autocomplete="off" enterkeyhint="search">
    </form>
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
  paged(items, th ? `${th.name}成語（${items.length}）` : `全部成語（${items.length}）`);
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
    $("#res").innerHTML = `<p class="hint">找到 ${a.length + b.length} 個</p>${listHTML(a.concat(b), 120)}`;
  };
  input.addEventListener("input", debounce(run, 150));
  input.focus(); input.setSelectionRange(q.length, q.length);
  run();
}

async function entry(no) {
  const e = await getEntry(no);
  if (!e) { view.innerHTML = `<p class="empty">找不到這個成語。<a href="#/">回首頁</a></p>`; return; }
  const sem = senses(e.sem), usage = senses(e.usage), ex = senses(e.ex);
  const mine = MINE[e.w];
  const fav = store.has("fav", no), learned = store.has("learned", no);
  view.innerHTML = `
    <article>
      <header class="entry-head">
        ${cells(e.w, e.zy)}
        <p class="pinyin">${esc(e.py)}</p>
        <div class="actions">
          <button class="btn" data-say="${esc(e.w)}">🔊 聽一聽</button>
          <button class="btn" data-toggle="fav" aria-pressed="${fav}">${fav ? "★ 已收藏" : "☆ 收藏"}</button>
          <button class="btn" data-toggle="learned" aria-pressed="${learned}">${learned ? "✓ 學會了" : "我學會了"}</button>
        </div>
      </header>

      ${e.c?.length ? `<section class="sec"><h2>意思<span class="src-tag">國語辭典簡編本</span></h2>
        <div class="lede">${e.c.map((c) => (e.c.length > 1 ? `<p class="lbl">${esc(c.zy)}</p>` : "") + concisedDef(c.def)).join("")}</div></section>` : ""}

      ${e.story ? `<section class="sec"><h2>成語故事<span class="src-tag">成語典</span></h2>
        <div class="story">${lines(e.story).map((l) => `<p>${txt(l)}</p>`).join("")}</div>
        <button class="btn" data-say-story>🔊 唸故事給我聽</button></section>` : ""}

      ${mine ? `<section class="sec"><h2>我們的補充</h2><div class="mine">
        ${mine.note ? `<p>${esc(mine.note)}</p>` : ""}
        ${mine.examples?.length ? `<ul>${mine.examples.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></section>` : ""}

      ${e.sem ? `<section class="sec"><h2>怎麼用<span class="src-tag">成語典</span></h2>
        ${sem.map((s, i) => {
          const exs = lines(ex[i]);
          return `<div class="sense">
            <p>${sem.length > 1 ? `${i + 1}. ` : ""}${txt(s)}</p>
            ${usage[i] ? `<p class="usage">${txt(usage[i])}</p>` : ""}
            ${exs.length ? `<ul>${exs.slice(0, 3).map((x) => `<li>${txt(x)}</li>`).join("")}</ul>
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
    </article>`;

  view.querySelector("[data-say-story]")?.addEventListener("click", () => speak(lines(e.story).join(""), 1));
  view.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", () => { b.closest(".sense").classList.add("open"); b.remove(); }));
  view.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const list = b.dataset.toggle; const on = store.toggle(list, no);
    b.setAttribute("aria-pressed", on);
    b.textContent = list === "fav" ? (on ? "★ 已收藏" : "☆ 收藏") : (on ? "✓ 學會了" : "我學會了");
  }));
}

// ---------------- 測驗 ----------------
const MODES = [
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
  const counts = { all: INDEX.length, fav: s.fav.length, learned: s.learned.length, wrong: Object.keys(s.wrong).length };
  view.innerHTML = `
    <h2>選一種玩法</h2>
    <div class="modes">${MODES.map((m) => `<button class="mode" data-mode="${m.id}" aria-pressed="${quizCfg.mode === m.id}"><b>${m.name}</b><span>${m.desc}</span></button>`).join("")}</div>
    <h2>出題範圍</h2>
    <div class="seg">${[["all", "全部"], ["fav", "我的收藏"], ["learned", "學會的"], ["wrong", "答錯過的"]].map(([id, n]) =>
      `<button class="btn" data-pool="${id}" aria-pressed="${quizCfg.pool === id}" ${counts[id] < 1 ? "disabled" : ""}>${n}（${counts[id]}）</button>`).join("")}</div>
    <button class="btn primary" id="go">開始 10 題</button>`;
  view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { quizCfg.mode = b.dataset.mode; quizHome(); }));
  view.querySelectorAll("[data-pool]").forEach((b) => b.addEventListener("click", () => { quizCfg.pool = b.dataset.pool; quizHome(); }));
  $("#go").addEventListener("click", startQuiz);
}

function startQuiz() {
  const { mode, pool } = quizCfg;
  let items = poolItems(pool);
  if (mode === "near") items = items.filter((i) => i.syn || i.ant);
  if (mode === "fit") items = items.filter((i) => i.cmp);
  const qs = [];
  for (const t of shuffle(items)) { const q = makeQ(mode, t); if (q) qs.push(q); if (qs.length === 10) break; }
  if (!qs.length) { toast("這個範圍沒有適合這種玩法的題目，換一個範圍試試"); return; }
  ACTIVE = qs;
  if (location.hash === "#/quiz/play") runQuiz(); else location.hash = "#/quiz/play";
}
let ACTIVE = null;
function runQuiz() {
  const qs = ACTIVE;
  if (!qs) return quizHome();
  let i = 0, score = 0;
  const draw = () => {
    const q = qs[i];
    view.innerHTML = `
      <p class="q-progress">第 ${i + 1} 題，共 ${qs.length} 題</p>
      <div class="q-bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
      <div class="q-prompt">${q.prompt}</div>
      <div class="opts">${q.opts.map((o, k) => `<button class="opt ${o.big ? "big" : ""}" data-k="${k}">${o.label}</button>`).join("")}</div>
      <div class="q-after" id="after"></div>`;
    view.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      const k = +b.dataset.k, ok = q.opts[k].ok;
      view.querySelectorAll(".opt").forEach((x, j) => { x.disabled = true; if (q.opts[j].ok) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong");
      ok ? (score++, store.right(q.target.no)) : store.wrong(q.target.no);
      $("#after").innerHTML = `<div class="actions">
        <button class="btn primary" id="next">${i + 1 < qs.length ? "下一題" : "看成績"}</button>
        <a class="btn" href="#/w/${q.target.no}" target="_self">看「${esc(q.target.w)}」</a></div>`;
      $("#next").addEventListener("click", () => { i++; i < qs.length ? draw() : done(); });
      $("#next").focus();
    }));
  };
  const done = () => {
    store.tally(score, qs.length);
    view.innerHTML = `<div class="score">${score * 10} 分</div>
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
    <p class="hint">下載全部成語內容（約 6 MB），之後沒有網路也能看。</p>
    <div class="actions"><button class="btn" id="dl">下載全部內容</button></div>
    <h2>重新開始</h2>
    <p class="hint">學習紀錄只存在這台裝置上。</p>
    <div class="actions"><button class="btn" id="reset">清除學習紀錄</button></div>
    <p class="hint"><a href="#/about">資料來源與授權</a></p>`;
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
    const ks = [...new Set(INDEX.map((i) => i.k))];
    let n = 0;
    for (const k of ks) {
      await fetch(`data/detail/${String(k).padStart(2, "0")}.json`).catch(() => {});
      b.textContent = `下載中 ${++n}/${ks.length}`;
    }
    b.textContent = "已下載，可離線使用";
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
    <p>本網站不是教育部官方網站。學習紀錄只存在你的裝置上，不會上傳。</p>
    <p><a href="https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html" rel="noopener">教育部國語辭典公眾授權網</a></p>
  </div>`;
}

// ---------------- 路由 ----------------
async function route() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
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
    else if (parts[0] === "quiz") (parts[1] === "play" ? runQuiz() : quizHome());
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

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
