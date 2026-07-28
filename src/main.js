import vocabularyData from "../data/vocabulary.js";
import teaIconUrl from "./assets/tea-icon.png";
import { db } from "./database/db.js";
import { emptyProgress, isDue, schedule } from "./learning/spaced-repetition.js";
import { evaluateAnswer, searchKey } from "./utils/text.js";
import { createExport, validateImport } from "./storage/backup.js";

const APP_VERSION = "1.0.23";
const vocab = vocabularyData.vocabulary.filter((v) => v.active);
const byId = new Map(vocab.map((v) => [v.id, v]));
const state = {
  view: new URLSearchParams(location.search).get("view") || "home", progress: new Map(), daily: [], meta: new Map(),
  selectedChapters: new Set([1]), session: null, installPrompt: null, updateWorker: null, toastTimer: null
};
const $app = document.querySelector("#app");
const icons = { home:"⌂", learn:"▶", chapters:"▦", progress:"◔", settings:"⚙" };

function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
function today() { return new Date().toLocaleDateString("sv-SE"); }
function getProgress(id) { return state.progress.get(id) || emptyProgress(id); }
function theme() { return localStorage.getItem("theme") || "system"; }
function applyTheme(value = theme()) { document.documentElement.dataset.theme = value; document.querySelector('meta[name="theme-color"]').content = value === "dark" ? "#171b20" : "#b4232f"; }
function stat() {
  const all = [...state.progress.values()], day = state.daily.find((d) => d.date === today()) || { answered:0, correct:0, wrong:0, ids:[] };
  return { total:vocab.length, newCount:vocab.length-all.filter(p=>p.status!=="new").length, started:all.filter(p=>p.level>0&&p.level<5).length, learned:all.filter(p=>p.level>=5).length, due:all.filter(isDue).length, favorite:all.filter(p=>p.favorite).length, difficult:all.filter(p=>p.difficult).length, day };
}
function shell(content) {
  const labels = { home:"Start", learn:"Lernen", chapters:"Kapitel", progress:"Fortschritt", settings:"Einstellungen", search:"Vokabelsuche" };
  return `<div class="shell">
    <aside class="sidebar" aria-label="Hauptnavigation"><div class="brand"><img class="brand-mark" src="${teaIconUrl}" alt="" width="44" height="44"><div><b>Lerne Türkisch</b><small>Vokabeltrainer</small></div></div>${nav()}</aside>
    <div class="page"><header class="topbar"><div class="mobile-brand"><img src="${teaIconUrl}" alt="" width="38" height="38"><b>Lerne Türkisch</b></div><h1>${labels[state.view] || "Vokabeltrainer"}</h1><button class="icon-button search-open" aria-label="Vokabelsuche öffnen"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.75" cy="10.75" r="6.75"></circle><path d="m15.8 15.8 4.2 4.2"></path></svg></button><span class="version">v${APP_VERSION}</span></header>
    <main id="main" tabindex="-1">${content}</main></div>${nav("bottom")}</div><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
}
function nav(extra="") {
  return `<nav class="nav ${extra}">${["home","learn","chapters","progress","settings"].map(v=>`<button data-nav="${v}" ${state.view===v?'aria-current="page"':""}><span aria-hidden="true">${icons[v]}</span><small>${{home:"Start",learn:"Lernen",chapters:"Kapitel",progress:"Fortschritt",settings:"Einstellungen"}[v]}</small></button>`).join("")}</nav>`;
}
function render() {
  const views = { home:homeView, learn:learnSetupView, chapters:chaptersView, progress:progressView, settings:settingsView, search:searchView };
  $app.innerHTML = shell((views[state.view] || homeView)());
  bindCommon();
}
function homeView() {
  const s=stat(), goal=Number(state.meta.get("dailyGoal")?.value || 20), last=state.meta.get("lastChapter")?.value;
  return `<section class="hero">
    <div class="cover-wrap"><img src="./images/book-cover-placeholder.svg" alt="Platzhalter für das Buchcover Lerne Türkisch"></div>
    <div class="hero-copy"><p class="eyebrow">DEIN PERSÖNLICHER</p><h2>Vokabeltrainer</h2><p>${s.day.answered ? `Heute schon <strong>${s.day.answered}</strong> Aufgaben bearbeitet.` : "Bereit für ein paar neue Wörter?"}</p>
    <div class="hero-actions"><button class="primary" data-action="quick-start">Lernen starten</button><button class="secondary" data-action="today">Heute lernen <span>${s.due} fällig</span></button></div></div>
  </section>
  <section class="dashboard-grid">
    <article class="panel goal-card"><div class="section-title"><h3>Tagesziel</h3><b>${Math.min(s.day.answered,goal)} / ${goal}</b></div>${progressBar(s.day.answered,goal)}<p>${s.day.answered>=goal?"Tagesziel erreicht – stark und sachlich weiter!":`${Math.max(0,goal-s.day.answered)} Aufgaben fehlen noch.`}</p></article>
    <article class="panel"><div class="section-title"><h3>Gesamtfortschritt</h3><b>${Math.round(s.learned/s.total*100)} %</b></div>${progressBar(s.learned,s.total)}<p>${s.learned} von ${s.total} Vokabeln sicher gelernt</p></article>
    <article class="panel last-card"><h3>Weiterlernen</h3><p>${last ? `Zuletzt: Kapitel ${last}` : "Du hast noch keine Runde begonnen."}</p><button class="text-button" data-action="resume">${last?"Kapitel fortsetzen":"Kapitel auswählen"} →</button></article>
    <article class="panel compact-stats"><div><strong>${s.due}</strong><span>fällig</span></div><div><strong>${s.started}</strong><span>begonnen</span></div><div><strong>${currentStreak()}</strong><span>Tage Serie</span></div></article>
  </section>${!isStandalone()?installCard():""}`;
}
function installCard() { return `<aside class="install-card panel"><div><h3>Auch offline lernen</h3><p>Installiere die App auf deinem Startbildschirm.</p></div><button class="secondary" data-action="install-help">${state.installPrompt?"App installieren":"Anleitung"}</button></aside>`; }
function progressBar(value,max) { const pct=Math.min(100,Math.round((value/(max||1))*100)); return `<div class="progressbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`; }
function learnSetupView() {
  const s=stat();
  return `<section class="content-head"><p class="eyebrow">LERNRUNDE PLANEN</p><h2>Was möchtest du üben?</h2><p>Stelle deine Runde passend zu deinem Tag zusammen.</p></section>
  <form id="learn-form" class="setup-grid">
   <fieldset class="panel"><legend>Kapitel</legend><button type="button" class="chapter-summary" data-nav="chapters">${state.selectedChapters.size} Kapitel ausgewählt <span>Ändern →</span></button>
    <label><input type="radio" name="scope" value="selected" checked> Ausgewählte Kapitel</label><label><input type="radio" name="scope" value="all"> Gesamtes Vokabular</label></fieldset>
   <fieldset class="panel"><legend>Auswahl</legend><div class="option-grid">
    ${[["all","Alle passenden"],["new","Nur neue"],["due",`Fällige (${s.due})`],["wrong","Falsch beantwortete"],["difficult","Schwierige"],["favorite","Favoriten"]].map(([v,l])=>`<label><input type="radio" name="filter" value="${v}" ${v==="all"?"checked":""}> ${l}</label>`).join("")}</div></fieldset>
   <fieldset class="panel"><legend>Lernmodus</legend><div class="mode-grid">
    ${[["flashcards","Karteikarten","Umdrehen & bewerten"],["choice","Multiple Choice","Antwort auswählen"],["typing","Texteingabe","Aktiv erinnern"],["self","Selbstbewertung","Eigenständig prüfen"],["mistakes","Fehlerwiederholung","Gezielt festigen"],["due","Fällige Wiederholungen","Nach Lernplan"]].map(([v,t,d])=>`<label class="mode"><input type="radio" name="mode" value="${v}" ${v==="flashcards"?"checked":""}><span><b>${t}</b><small>${d}</small></span></label>`).join("")}</div></fieldset>
   <fieldset class="panel"><legend>Richtung & Umfang</legend><div class="field-row"><label>Richtung<select name="direction"><option value="tr-de">Türkisch → Deutsch</option><option value="de-tr">Deutsch → Türkisch</option><option value="mixed">Gemischt</option></select></label><label>Aufgaben<select name="count"><option>10</option><option selected>20</option><option>30</option><option>50</option><option value="9999">Alle</option></select></label><label>Reihenfolge<select name="order"><option value="random">Zufällig</option><option value="chapter">Nach Kapitel</option></select></label></div></fieldset>
   <button class="primary start-session" type="submit">Lernrunde starten</button>
  </form>`;
}
function chaptersView() {
  const query=state.chapterQuery||"", filter=state.chapterFilter||"all";
  const cards=Array.from({length:45},(_,i)=>chapterStats(i+1)).filter(c=>(!query||`${c.chapter} ${c.title}`.toLowerCase().includes(query.toLowerCase())) && (filter==="all"||c[filter]>0));
  return `<section class="content-head"><p class="eyebrow">45 KAPITEL</p><h2>Kapitel auswählen</h2><p>${state.selectedChapters.size} Kapitel ausgewählt</p></section>
  <section class="selection-tools panel"><div class="search-field"><span>⌕</span><input id="chapter-search" value="${esc(query)}" placeholder="Nummer oder Kapiteltitel" aria-label="Kapitel suchen"></div>
  <select id="chapter-filter" aria-label="Nach Lernstatus filtern"><option value="all">Alle Lernstände</option><option value="newCount" ${filter==="newCount"?"selected":""}>Neue vorhanden</option><option value="due" ${filter==="due"?"selected":""}>Wiederholung fällig</option><option value="learned" ${filter==="learned"?"selected":""}>Gelernte vorhanden</option></select>
  <div class="tool-buttons"><button data-select="all">Alle</button><button data-select="invert">Umkehren</button><button data-select="range">Bereich</button><button data-select="none">Zurücksetzen</button></div></section>
  <div class="chapter-grid">${cards.map(c=>`<article class="chapter-card panel ${state.selectedChapters.has(c.chapter)?"selected":""}"><label class="chapter-check"><input type="checkbox" data-chapter="${c.chapter}" ${state.selectedChapters.has(c.chapter)?"checked":""}><span>Kapitel ${c.chapter}</span></label><h3>${esc(c.title)}</h3><div class="chapter-counts"><span>${c.total} Wörter</span><span>${c.newCount} neu</span><span>${c.due} fällig</span><span>${c.learned} gelernt</span></div><div class="section-title chapter-mastery"><small>Lernstand</small><b>${c.mastery}%</b></div>${progressBar(c.mastery,100)}<button data-start-chapter="${c.chapter}" class="secondary">Kapitel starten</button></article>`).join("")}</div>
  <button class="primary floating-start" data-action="selected-start" ${state.selectedChapters.size?"":"disabled"}>Auswahl lernen (${state.selectedChapters.size})</button>`;
}
function chapterStats(chapter) {
  const list=vocab.filter(v=>v.chapter===chapter), ps=list.map(v=>getProgress(v.id));
  const mastery=Math.round(ps.reduce((sum,p)=>sum+Math.max(0,Math.min(5,p.level||0)),0)/(Math.max(1,list.length)*5)*100);
  return {chapter,title:vocabularyData.chapters.find(c=>c.number===chapter)?.title||`Kapitel ${chapter}`,total:list.length,newCount:ps.filter(p=>p.status==="new").length,due:ps.filter(isDue).length,learned:ps.filter(p=>p.level>=5).length,mastery};
}
function progressView() {
  const s=stat(), levels=Array.from({length:6},(_,l)=>[l,[...state.progress.values()].filter(p=>p.level===l).length]);
  return `<section class="content-head"><p class="eyebrow">DEIN LERNWEG</p><h2>Fortschritt</h2><p>Alles bleibt ausschließlich auf diesem Gerät.</p></section>
  <section class="metric-grid">${[["Gesamt",s.total],["Neu",s.newCount],["Begonnen",s.started],["Gelernt",s.learned],["Heute",s.day.answered],["Heute richtig",s.day.correct],["Heute falsch",s.day.wrong],["Fällig",s.due],["Schwierig",s.difficult],["Favoriten",s.favorite],["Lernserie",`${currentStreak()} Tage`]].map(([l,v])=>`<article class="metric panel"><strong>${v}</strong><span>${l}</span></article>`).join("")}</section>
  <section class="progress-layout"><article class="panel"><h3>Lernstufen</h3><div class="level-chart">${levels.map(([l,n])=>`<div><span>Stufe ${l}</span><div>${progressBar(n,s.total)}</div><b>${n}</b></div>`).join("")}</div></article>
  <article class="panel"><h3>Kapitelstand</h3><div class="chapter-progress-list">${Array.from({length:45},(_,i)=>chapterStats(i+1)).map(c=>`<div><span>${c.chapter}</span>${progressBar(c.mastery,100)}<small>${c.mastery}%</small></div>`).join("")}</div></article></section>`;
}
function settingsView() {
  const goal=state.meta.get("dailyGoal")?.value||20;
  return `<section class="content-head"><p class="eyebrow">PERSÖNLICH & LOKAL</p><h2>Einstellungen</h2><p>Deine Daten verlassen dieses Gerät nicht.</p></section>
  <div class="settings-grid">
   <section class="panel"><h3>Darstellung</h3><label>Farbmodus<select id="theme-select"><option value="system" ${theme()==="system"?"selected":""}>Systemeinstellung</option><option value="light" ${theme()==="light"?"selected":""}>Hell</option><option value="dark" ${theme()==="dark"?"selected":""}>Dunkel</option></select></label><label class="switch"><input id="large-text" type="checkbox" ${localStorage.getItem("largeText")==="true"?"checked":""}><span>Größere Schrift verwenden</span></label><label class="switch"><input id="tolerant" type="checkbox" ${localStorage.getItem("tolerant")!=="false"?"checked":""}><span>„Fast richtig“ erkennen</span></label></section>
   <section class="panel"><h3>Lernziel</h3><label>Tägliche Aufgaben<input id="daily-goal" type="number" min="1" max="500" value="${goal}"></label><p class="hint">Ein Lerntag zählt, sobald mindestens eine Aufgabe bewertet wurde. Unterbrechungen werden nicht bestraft.</p></section>
   <section class="panel"><h3>Lernstand sichern</h3><p>Exportiere eine lokale JSON-Sicherung oder stelle sie wieder her.</p><div class="button-stack"><button data-action="export" class="secondary">Lernstand exportieren</button><label class="file-button secondary">Lernstand importieren<input id="import-file" type="file" accept="application/json,.json"></label></div></section>
   <section class="panel danger"><h3>Zurücksetzen</h3><p>Entfernt den vollständigen Lernstand unwiderruflich von diesem Gerät.</p><button data-action="reset" class="danger-button">Lernstand vollständig zurücksetzen</button></section>
   <section class="panel"><h3>Installation & App</h3><p>Version ${APP_VERSION} · Daten ${vocabularyData.contentVersion}<br>${vocab.length} Vokabeln · 45 Kapitel</p><div class="button-stack"><button data-action="install-help" class="secondary">Installationshilfe</button>${state.updateWorker?'<button data-action="apply-update" class="primary">Neue Version jetzt aktivieren</button>':""}</div></section>
  </div><footer class="settings-copyright">Copyright © Appeltauer Media</footer>`;
}
function searchView() {
  const q=state.searchQuery||"", results=q?searchVocabulary(q).slice(0,100):[];
  return `<section class="content-head"><p class="eyebrow">GESAMTER WORTSCHATZ</p><h2>Vokabelsuche</h2></section><div class="search-field global panel"><span>⌕</span><input id="global-search" value="${esc(q)}" autofocus placeholder="Türkisch, Deutsch, Kapitel oder Kategorie" aria-label="Vokabel suchen"></div>
  <p class="result-count" aria-live="polite">${q?`${results.length}${results.length===100?"+":""} Treffer`:"Suchbegriff eingeben"}</p>
  <div class="result-list">${results.map(v=>{const p=getProgress(v.id);return `<article class="panel result"><div><h3 lang="tr">${esc(v.turkish)}</h3><p>${esc(v.german.join(" / "))}</p><small>Kapitel ${v.chapter} · ${p.status==="new"?"Neu":p.level>=5?"Gelernt":`Stufe ${p.level}`} ${p.favorite?"· ★ Favorit":""}</small></div><button data-learn-id="${v.id}" class="secondary">Lernen</button></article>`}).join("")}</div>`;
}
function searchVocabulary(q) { const n=searchKey(q); return vocab.filter(v=>searchKey(`${v.turkish} ${v.german.join(" ")} ${v.chapter} ${v.chapterTitle} ${v.category}`).includes(n)); }

function startSession(options={}) {
  const form=options.form, mode=options.mode||form?.get("mode")||"flashcards", direction=form?.get("direction")||"tr-de", count=Number(form?.get("count")||20), order=form?.get("order")||"random";
  const scope=form?.get("scope")||"selected", filter=options.filter||form?.get("filter")||"all";
  let pool=options.ids ? options.ids.map(id=>byId.get(id)).filter(Boolean) : vocab.filter(v=>scope==="all"||state.selectedChapters.has(v.chapter));
  pool=pool.filter(v=>matchesFilter(getProgress(v.id),filter));
  if (mode==="mistakes") pool=pool.filter(v=>getProgress(v.id).wrong>0);
  if (mode==="due") pool=pool.filter(v=>isDue(getProgress(v.id)));
  if (!pool.length) return toast("Für diese Auswahl sind keine passenden Vokabeln vorhanden.",true);
  if (order==="random") pool.sort(()=>Math.random()-.5); else pool.sort((a,b)=>a.chapter-b.chapter||a.id.localeCompare(b.id));
  state.session={items:pool.slice(0,count),index:0,mode,direction,results:[],revealed:false,answered:false};
  showSession();
}
function matchesFilter(p,f){return f==="all"||(f==="new"&&p.status==="new")||(f==="due"&&isDue(p))||(f==="wrong"&&p.wrong>0)||(f==="difficult"&&p.difficult)||(f==="favorite"&&p.favorite);}
function currentDirection(v) { const s=state.session; return s.direction==="mixed" ? (s.index%2?"de-tr":"tr-de") : s.direction; }
function showSession() {
  const s=state.session;
  if (!s || s.index>=s.items.length) return finishSession();
  const v=s.items[s.index], dir=currentDirection(v), question=dir==="tr-de"?v.turkish:v.german.join(" / "), answer=dir==="tr-de"?v.german:v.turkish, p=getProgress(v.id);
  const modeTitle={flashcards:"Karteikarten",choice:"Multiple Choice",typing:"Texteingabe",self:"Selbstbewertung",mistakes:"Fehlerwiederholung",due:"Fällige Wiederholungen"}[s.mode];
  $app.innerHTML=`<div class="session-shell"><header class="session-head"><button data-session-close class="icon-button" aria-label="Lernrunde schließen">×</button><div><b>${modeTitle}</b><small>Kapitel ${v.chapter} · ${dir==="tr-de"?"Türkisch → Deutsch":"Deutsch → Türkisch"}</small></div><span>${s.index+1} / ${s.items.length}</span></header><div class="session-progress">${progressBar(s.index,s.items.length)}</div>
  <main id="main" class="learning-main"><div class="card-tools"><button data-toggle="favorite" aria-pressed="${p.favorite}" aria-label="Favorit">${p.favorite?"★":"☆"}</button><button data-toggle="difficult" aria-pressed="${p.difficult}" aria-label="Als schwierig markieren">${p.difficult?"◆":"◇"}</button></div>${taskMarkup(v,question,answer,dir)}</main></div><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  bindSession();
}
function taskMarkup(v,q,a,dir) {
  const s=state.session, prompt=`${dir==="tr-de"?"Was bedeutet":"Wie heißt das auf Türkisch"}?`;
  if (s.mode==="choice") {
    const correct=Array.isArray(a)?a[0]:a, candidates=[correct,...distractors(v,dir)].sort(()=>Math.random()-.5);
    return `<section class="learn-card"><p class="eyebrow">${prompt}</p><h2 lang="${dir==="tr-de"?"tr":"de"}">${esc(q)}</h2>${v.pronunciation&&dir==="tr-de"?`<small>Aussprache: ${esc(v.pronunciation)}</small>`:""}</section><div class="choice-list">${candidates.map(x=>`<button data-choice="${esc(x)}" data-correct="${esc(correct)}">${esc(x)}</button>`).join("")}</div><div id="feedback" class="feedback" aria-live="polite"></div>`;
  }
  if (s.mode==="typing") return `<section class="learn-card"><p class="eyebrow">${prompt}</p><h2 lang="${dir==="tr-de"?"tr":"de"}">${esc(q)}</h2></section><form id="answer-form" class="answer-box"><label for="answer">Deine Antwort</label><input id="answer" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="turkish-keys">${["ç","ğ","ı","İ","ö","ş","ü"].map(c=>`<button type="button" data-char="${c}">${c}</button>`).join("")}</div><button class="primary">Antwort prüfen</button></form><div id="feedback" class="feedback" aria-live="polite"></div>`;
  const revealed=s.revealed;
  return `<button class="learn-card flip ${revealed?"revealed":""}" data-reveal aria-expanded="${revealed}"><p class="eyebrow">${revealed?"LÖSUNG":prompt}</p><h2 lang="${revealed?(dir==="tr-de"?"de":"tr"):(dir==="tr-de"?"tr":"de")}">${esc(revealed?(Array.isArray(a)?a.join(" / "):a):q)}</h2>${revealed&&v.pronunciation?`<small>Aussprache: ${esc(v.pronunciation)}</small>`:""}<span>${revealed?"Wie gut wusstest du es?":"Antippen, um die Lösung zu sehen"}</span></button>${revealed?ratingButtons(s.mode==="self"):''}`;
}
function distractors(v,dir) {
  const same=vocab.filter(x=>x.id!==v.id&&(x.chapter===v.chapter||x.category&&x.category===v.category)).sort(()=>Math.random()-.5);
  const rest=vocab.filter(x=>x.id!==v.id).sort(()=>Math.random()-.5);
  const values=[], seen=new Set();
  for(const x of [...same,...rest]){const val=dir==="tr-de"?x.german[0]:x.turkish;if(!seen.has(val)){seen.add(val);values.push(val);}if(values.length===3)break;} return values;
}
function ratingButtons(self=false){ const opts=self?[["wrong","Falsch"],["partial","Teilweise richtig"],["correct","Richtig"]]:[["wrong","Nicht gewusst"],["unsure","Unsicher"],["correct","Gewusst"],["easy","Sehr sicher"]];return `<div class="rating">${opts.map(([q,l])=>`<button data-rate="${q}">${l}</button>`).join("")}</div>`;}
function bindCommon() {
  document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.nav)));
  document.querySelector(".search-open")?.addEventListener("click",()=>navigate("search"));
  document.querySelector("[data-action='quick-start']")?.addEventListener("click",()=>navigate("learn"));
  document.querySelector("[data-action='today']")?.addEventListener("click",()=>startSession({filter:"due",mode:"due"}));
  document.querySelector("[data-action='resume']")?.addEventListener("click",()=>navigate(state.meta.get("lastChapter")?"learn":"chapters"));
  document.querySelector("#learn-form")?.addEventListener("submit",(e)=>{e.preventDefault();startSession({form:new FormData(e.currentTarget)});});
  bindChapterActions(); bindSettings(); bindSearch();
  document.querySelectorAll("[data-action='install-help']").forEach(b=>b.addEventListener("click",installHelp));
}
function bindChapterActions() {
  document.querySelectorAll("[data-chapter]").forEach(c=>c.addEventListener("change",()=>{const n=Number(c.dataset.chapter);c.checked?state.selectedChapters.add(n):state.selectedChapters.delete(n);render();}));
  document.querySelectorAll("[data-start-chapter]").forEach(b=>b.addEventListener("click",()=>{state.selectedChapters=new Set([Number(b.dataset.startChapter)]);navigate("learn");}));
  document.querySelector("[data-action='selected-start']")?.addEventListener("click",()=>navigate("learn"));
  document.querySelectorAll("[data-select]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.select;if(action==="all")state.selectedChapters=new Set(Array.from({length:45},(_,i)=>i+1));if(action==="none")state.selectedChapters.clear();if(action==="invert")state.selectedChapters=new Set(Array.from({length:45},(_,i)=>i+1).filter(n=>!state.selectedChapters.has(n)));if(action==="range"){const input=prompt("Kapitelbereich, z. B. 5-12:");const m=input?.match(/^\\s*(\\d+)\\s*-\\s*(\\d+)\\s*$/);if(!m||+m[1]<1||+m[2]>45||+m[1]>+m[2])return toast("Bitte einen gültigen Bereich von 1 bis 45 eingeben.",true);state.selectedChapters=new Set(Array.from({length:+m[2]-+m[1]+1},(_,i)=>+m[1]+i));}render();}));
  document.querySelector("#chapter-search")?.addEventListener("input",(e)=>{state.chapterQuery=e.target.value;render();document.querySelector("#chapter-search")?.focus();});
  document.querySelector("#chapter-filter")?.addEventListener("change",(e)=>{state.chapterFilter=e.target.value;render();});
}
function bindSettings() {
  document.querySelector("#theme-select")?.addEventListener("change",(e)=>{localStorage.setItem("theme",e.target.value);applyTheme();});
  document.querySelector("#large-text")?.addEventListener("change",(e)=>{localStorage.setItem("largeText",e.target.checked);document.documentElement.classList.toggle("large-text",e.target.checked);});
  document.querySelector("#tolerant")?.addEventListener("change",(e)=>localStorage.setItem("tolerant",e.target.checked));
  document.querySelector("#daily-goal")?.addEventListener("change",async(e)=>{const value=Math.max(1,Math.min(500,Number(e.target.value)||20));await saveMeta("dailyGoal",value);toast("Tagesziel gespeichert.");});
  document.querySelector("[data-action='export']")?.addEventListener("click",exportData);
  document.querySelector("#import-file")?.addEventListener("change",importData);
  document.querySelector("[data-action='reset']")?.addEventListener("click",resetData);
  document.querySelector("[data-action='apply-update']")?.addEventListener("click",()=>state.updateWorker?.postMessage({type:"SKIP_WAITING"}));
}
function bindSearch() {
  document.querySelector("#global-search")?.addEventListener("input",(e)=>{state.searchQuery=e.target.value;render();const input=document.querySelector("#global-search");input?.focus();input?.setSelectionRange(input.value.length,input.value.length);});
  document.querySelectorAll("[data-learn-id]").forEach(b=>b.addEventListener("click",()=>startSession({ids:[b.dataset.learnId],mode:"flashcards"})));
}
function bindSession() {
  document.querySelector("[data-session-close]")?.addEventListener("click",()=>{if(confirm("Lernrunde wirklich beenden? Dein bisheriger Fortschritt ist gespeichert.")){state.session=null;render();}});
  document.querySelector("[data-reveal]")?.addEventListener("click",()=>{state.session.revealed=true;showSession();});
  document.querySelectorAll("[data-rate]").forEach(b=>b.addEventListener("click",()=>recordRating(b.dataset.rate)));
  document.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>toggleFlag(b.dataset.toggle)));
  document.querySelectorAll("[data-choice]").forEach(b=>b.addEventListener("click",()=>answerChoice(b)));
  document.querySelector("#answer-form")?.addEventListener("submit",answerTyping);
  document.querySelectorAll("[data-char]").forEach(b=>b.addEventListener("click",()=>insertChar(b.dataset.char)));
  document.addEventListener("keydown",sessionKeys,{once:true});
}
function sessionKeys(e){if(!state.session)return;if(e.key==="Escape")document.querySelector("[data-session-close]")?.click();if(e.key===" "&&document.activeElement?.tagName!=="INPUT"){e.preventDefault();document.querySelector("[data-reveal]")?.click();}}
async function toggleFlag(flag){const v=state.session.items[state.session.index],p=getProgress(v.id);p[flag]=!p[flag];state.progress.set(v.id,p);await db.put("progress",p);showSession();}
async function recordRating(quality){const v=state.session.items[state.session.index],p=schedule(getProgress(v.id),quality);state.progress.set(v.id,p);await db.put("progress",p);await recordDaily(quality);state.session.results.push({id:v.id,quality});nextTask();}
function answerChoice(button){if(state.session.answered)return;state.session.answered=true;const correct=button.dataset.choice===button.dataset.correct;document.querySelectorAll("[data-choice]").forEach(b=>{b.disabled=true;if(b.dataset.choice===b.dataset.correct)b.classList.add("correct");else if(b===button)b.classList.add("wrong");});const f=document.querySelector("#feedback");f.innerHTML=`<p>${correct?"Richtig!":"Nicht ganz – die richtige Antwort ist markiert."}</p><button class="primary" id="choice-next">Weiter</button>`;document.querySelector("#choice-next").onclick=()=>recordRating(correct?"correct":"wrong");}
function answerTyping(e){e.preventDefault();if(state.session.answered)return;const v=state.session.items[state.session.index],dir=currentDirection(v),accepted=dir==="tr-de"?v.german:v.turkish,result=evaluateAnswer(document.querySelector("#answer").value,accepted,dir==="tr-de"?"de":"tr");state.session.answered=true;const quality=result.result==="correct"?"correct":result.result==="almost"?"unsure":"wrong";const f=document.querySelector("#feedback");f.className=`feedback ${result.result}`;f.innerHTML=`<p>${esc(result.message)}</p><p><strong>Korrekte Schreibweise:</strong> ${esc(Array.isArray(accepted)?accepted.join(" / "):accepted)}</p><button class="primary" id="typing-next">Weiter</button>`;document.querySelector("#typing-next").onclick=()=>recordRating(quality);}
function insertChar(char){const input=document.querySelector("#answer"),start=input.selectionStart,end=input.selectionEnd;input.setRangeText(char,start,end,"end");input.focus();}
function nextTask(){state.session.index++;state.session.revealed=false;state.session.answered=false;showSession();}
async function finishSession(){const s=state.session, results=s?.results||[], correct=results.filter(r=>["correct","easy"].includes(r.quality)).length;$app.innerHTML=shell(`<section class="finish panel"><div class="finish-icon">✓</div><p class="eyebrow">RUNDE ABGESCHLOSSEN</p><h2>${results.length} Aufgaben geschafft</h2><p>${correct} sicher beantwortet. Jeder Durchgang zählt.</p><div class="finish-stats"><div><b>${correct}</b><span>richtig</span></div><div><b>${results.filter(r=>r.quality==="wrong").length}</b><span>noch üben</span></div></div><button class="primary" data-nav="home">Zur Startseite</button><button class="secondary" data-nav="learn">Neue Runde</button></section>`);state.session=null;bindCommon();}
async function recordDaily(quality){let day=state.daily.find(d=>d.date===today());if(!day){day={date:today(),answered:0,correct:0,wrong:0,ids:[]};state.daily.push(day);}day.answered++;if(["correct","easy"].includes(quality))day.correct++;if(quality==="wrong")day.wrong++;const v=state.session.items[state.session.index];if(!day.ids.includes(v.id))day.ids.push(v.id);await db.put("daily",day);await saveMeta("lastChapter",v.chapter);await saveMeta("lastMode",state.session.mode);await saveMeta("selectedChapters",[...state.selectedChapters]);}
function currentStreak(){const active=new Set(state.daily.filter(d=>d.answered>0).map(d=>d.date));let count=0,date=new Date();if(!active.has(date.toLocaleDateString("sv-SE"))){date.setDate(date.getDate()-1);}while(active.has(date.toLocaleDateString("sv-SE"))){count++;date.setDate(date.getDate()-1);}return count;}
async function saveMeta(key,value){const item={key,value};state.meta.set(key,item);await db.put("meta",item);}
async function exportData(){const payload=createExport([...state.progress.values()],[...state.meta.values()],state.daily,APP_VERSION),blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tuerkisch-lernstand-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Lernstand wurde exportiert.");}
async function importData(e){try{const text=await e.target.files[0]?.text();if(!text)return;let parsed;try{parsed=JSON.parse(text);}catch{return toast("Die Datei enthält kein gültiges JSON.",true);}const check=validateImport(parsed,new Set(byId.keys()));if(!check.valid)return toast(check.errors.slice(0,3).join(" "),true);if(!confirm(`${parsed.progress.length} Fortschrittseinträge importieren? Vorhandene Einträge werden ersetzt.`))return;await Promise.all(["progress","meta","daily"].map(s=>db.clear(s)));await db.bulkPut("progress",parsed.progress);await db.bulkPut("meta",parsed.meta);await db.bulkPut("daily",parsed.daily);await loadState();render();toast("Lernstand erfolgreich wiederhergestellt.");}catch(err){toast(`Import fehlgeschlagen: ${err.message}`,true);}}
async function resetData(){if(!confirm("Wirklich den vollständigen Lernstand löschen? Diese Aktion kann nicht rückgängig gemacht werden."))return;if(prompt('Zur Bestätigung bitte "LÖSCHEN" eingeben:')!=="LÖSCHEN")return toast("Zurücksetzen abgebrochen.",true);await Promise.all(["progress","meta","daily"].map(s=>db.clear(s)));state.progress.clear();state.meta.clear();state.daily=[];render();toast("Der Lernstand wurde vollständig zurückgesetzt.");}
function navigate(view){state.view=view;history.pushState({view},"",`?view=${view}`);render();document.querySelector("#main")?.focus();}
function toast(message,error=false){const t=document.querySelector("#toast");if(!t){alert(message);return;}t.textContent=message;t.className=`toast show ${error?"error":""}`;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>t.classList.remove("show"),5000);}
function isStandalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}
async function installHelp(){if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;render();return;}const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);alert(ios?"So installierst du die App:\n\n1. In Safari öffnen.\n2. Auf das Teilen-Symbol tippen.\n3. „Zum Home-Bildschirm“ auswählen.\n4. Installation bestätigen.":"Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.");}
async function loadState(){try{const [progress,meta,daily]=await Promise.all([db.all("progress"),db.all("meta"),db.all("daily")]);state.progress=new Map(progress.filter(p=>byId.has(p.id)).map(p=>[p.id,p]));state.meta=new Map(meta.map(m=>[m.key,m]));state.daily=daily;const selected=state.meta.get("selectedChapters")?.value;if(Array.isArray(selected)&&selected.length)state.selectedChapters=new Set(selected);}catch(err){console.error(err);$app.innerHTML=`<main class="fatal"><h1>Lokaler Speicher nicht verfügbar</h1><p>${esc(err.message)}</p><p>Prüfe den privaten Modus oder freien Gerätespeicher und lade die Seite neu.</p></main>`;throw err;}}
function setupPWA(){
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.installPrompt=e;render();});
  const localHost=["localhost","127.0.0.1","[::1]"].includes(location.hostname);
  const secureForPWA=location.protocol==="https:"||localHost;
  if(!secureForPWA){
    console.info("Service Worker übersprungen: Für Installation und Offline-Start ist HTTPS erforderlich. Der Lernstand wird weiterhin lokal in IndexedDB gespeichert.");
    toast("Testbetrieb ohne HTTPS: Der Lernstand wird lokal gespeichert. Installation und Offline-Start sind erst über HTTPS verfügbar.");
    return;
  }
  if(!("serviceWorker"in navigator)){
    toast("Dieser Browser unterstützt keinen Offline-Service-Worker. Der Lernstand wird trotzdem lokal gespeichert.",true);
    return;
  }
  navigator.serviceWorker.register("./service-worker.js").then(reg=>{
    reg.addEventListener("updatefound",()=>{
      const worker=reg.installing;
      worker.addEventListener("statechange",()=>{
        if(worker.state==="installed"&&navigator.serviceWorker.controller){
          state.updateWorker=worker;
          toast("Eine neue App-Version ist bereit. Öffne Einstellungen zum Aktualisieren.");
        }
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
  }).catch(err=>toast(`Offline-Funktion konnte nicht aktiviert werden. Der Lernstand wird weiterhin lokal gespeichert: ${err.message}`,true));
}
function setupIOSKeyboardViewport(){
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(!isIOS)return;
  const viewport=document.querySelector('meta[name="viewport"]');
  if(!viewport)return;
  const defaultContent=viewport.getAttribute("content");
  const lockedContent=`${defaultContent.replace(/,\s*(maximum-scale|user-scalable)=[^,]+/gi,"")}, maximum-scale=1`;
  const stabilizedFields=new Set(["answer","global-search","chapter-search"]);
  document.addEventListener("focusin",(event)=>{
    if(!stabilizedFields.has(event.target?.id))return;
    viewport.setAttribute("content",lockedContent);
    requestAnimationFrame(()=>event.target.scrollIntoView({block:"center",inline:"nearest"}));
  });
  document.addEventListener("focusout",(event)=>{
    if(!stabilizedFields.has(event.target?.id))return;
    setTimeout(()=>viewport.setAttribute("content",defaultContent),300);
  });
}
window.addEventListener("popstate",e=>{state.view=e.state?.view||new URLSearchParams(location.search).get("view")||"home";render();});
window.addEventListener("online",()=>toast("Du bist wieder online."));
window.addEventListener("offline",()=>toast("Offline-Modus: Alle Lernfunktionen bleiben verfügbar."));
applyTheme();document.documentElement.classList.toggle("large-text",localStorage.getItem("largeText")==="true");setupIOSKeyboardViewport();
loadState()
  .then(()=>{render();setupPWA();})
  .catch((error)=>{
    console.error("App-Start fehlgeschlagen:", error);
    $app.innerHTML=`<main class="fatal"><h1>Die App konnte nicht gestartet werden</h1><p>${esc(error?.message || error)}</p><button class="primary" id="reload-app">Erneut versuchen</button><details><summary>Technischer Hinweis</summary><p>Version ${APP_VERSION}. Bitte die vollständige aktuelle App veröffentlichen und nicht einzelne Dateien mischen.</p></details></main>`;
    document.querySelector("#reload-app")?.addEventListener("click",()=>location.reload());
  });
