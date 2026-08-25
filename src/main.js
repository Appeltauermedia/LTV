import vocabularyData from "../data/vocabulary.js";
import teaIconUrl from "./assets/tea-icon.png";
import { db } from "./database/db.js";
import { emptyProgress, isDue, schedule } from "./learning/spaced-repetition.js";
import { DEFAULT_LEARN_SETTINGS, normalizeLearnSettings } from "./learning/settings.js";
import { evaluateAnswer, searchKey } from "./utils/text.js";
import { createExport, validateImport } from "./storage/backup.js";

const APP_VERSION = "1.1.1";
const vocab = vocabularyData.vocabulary.filter((v) => v.active);
const byId = new Map(vocab.map((v) => [v.id, v]));
const topics = vocabularyData.topics || [];
const state = {
  view: new URLSearchParams(location.search).get("view") || "landing", progress: new Map(), daily: [], meta: new Map(),
  selectedChapters: new Set([1]), selectedTopics: new Set(), learningSettings: {...DEFAULT_LEARN_SETTINGS}, statsSource: "all", searchSource: "all", searchTopic: "all",
  session: null, installPrompt: null, updateWorker: null, toastTimer: null
};
const $app = document.querySelector("#app");
const icons = { home:"⌂", learn:"▶", chapters:"▦", progress:"◔", settings:"⚙" };

function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
function today() { return new Date().toLocaleDateString("sv-SE"); }
function getProgress(id) { return state.progress.get(id) || emptyProgress(id); }
function theme() { return localStorage.getItem("theme") || "system"; }
function applyTheme(value = theme()) { document.documentElement.dataset.theme = value; document.querySelector('meta[name="theme-color"]').content = value === "dark" ? "#171b20" : "#b4232f"; }
function sourceLabel(v) { return v.sourceType === "topic" ? `Thema: ${v.topicTitle}` : `Kapitel ${v.chapter}`; }
function stat(source="all") {
  const list=vocab.filter(v=>source==="all"||v.sourceType===source), ps=list.map(v=>getProgress(v.id)), day = state.daily.find((d) => d.date === today()) || { answered:0, correct:0, wrong:0, ids:[] };
  return { total:list.length, newCount:ps.filter(p=>p.status==="new").length, started:ps.filter(p=>p.level>0&&p.level<5).length, learned:ps.filter(p=>p.level>=5).length, due:ps.filter(isDue).length, favorite:ps.filter(p=>p.favorite).length, difficult:ps.filter(p=>p.difficult).length, day };
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
  if (state.view === "landing") {
    $app.innerHTML = landingView();
    bindLanding();
    return;
  }
  const views = { home:homeView, learn:learnSetupView, chapters:chaptersView, progress:progressView, settings:settingsView, search:searchView };
  $app.innerHTML = shell((views[state.view] || homeView)());
  bindCommon();
}
function landingView() {
  return `<div class="landing-page">
    <header class="landing-header">
      <a class="landing-brand" href="?view=landing" aria-label="Lerne Türkisch – Startseite"><img src="${teaIconUrl}" alt="" width="44" height="44"><span><b>Lerne Türkisch</b><small>Mit System. Mit Freude.</small></span></a>
      <a class="landing-nav-link" href="?view=home" data-landing-view="home">Zum Vokabeltrainer <span aria-hidden="true">→</span></a>
    </header>
    <main class="landing-main" id="main">
      <section class="landing-hero" aria-labelledby="landing-title">
        <div class="landing-copy">
          <p class="landing-kicker">TÜRKISCH LERNEN · ISTANBUL ERLEBEN</p>
          <h1 id="landing-title">Türkisch lernen für Anfänger.</h1>
          <p class="landing-lead">Deine Sprachreise beginnt hier: Lerne Türkisch Schritt für Schritt – mit einem kostenlosen Türkisch-Vokabeltrainer und dem liebevoll gestalteten Lehrbuch <em>İstanbul'a Hoş Geldiniz</em>.</p>
          <div class="landing-actions">
            <a class="landing-button landing-button-primary" href="?view=home" data-landing-view="home">Vokabeltrainer öffnen <span aria-hidden="true">→</span></a>
            <a class="landing-button landing-button-quiet" href="#buch">Buch entdecken <span aria-hidden="true">↓</span></a>
          </div>
          <ul class="landing-benefits" aria-label="Vorteile des Vokabeltrainers">
            <li><span aria-hidden="true">✓</span> Kostenlos &amp; ohne Anmeldung</li>
            <li><span aria-hidden="true">✓</span> 45 Kapitel plus Themenwortschatz</li>
            <li><span aria-hidden="true">✓</span> Lernstand bleibt auf deinem Gerät</li>
          </ul>
        </div>
        <aside class="book-feature" id="buch" aria-label="Das begleitende Lehrbuch">
          <div class="book-glow"></div>
          <img src="./images/lt-cover-front.webp" alt="Cover des Lehrbuchs İstanbul'a Hoş Geldiniz – Türkisch für Anfänger" width="720" height="960">
          <div class="book-feature-copy">
            <p class="landing-kicker">DAS BUCH ZUM TRAINER</p>
            <h2>Mehr als Vokabeln.</h2>
            <p>Dialoge, Kultur und Alltagssituationen begleiten dich auf einer Sprachreise durch Istanbul und die Türkei.</p>
            <a class="landing-button landing-button-book" href="https://www.amazon.de/Istanbula-Hos-Geldiniz-Sprachreise-Istanbul/dp/369574619X" target="_blank" rel="noopener noreferrer">Bei Amazon ansehen <span aria-hidden="true">↗</span></a>
          </div>
        </aside>
      </section>
    </main>
    <footer class="landing-footer"><span>© Appeltauer Media</span><span>Türkisch lernen – selbstbestimmt und mit Freude.</span></footer>
  </div>`;
}
function bindLanding() {
  document.querySelectorAll("[data-landing-view]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();navigate(link.dataset.landingView);}));
}
function homeView() {
  const s=stat(), goal=Number(state.meta.get("dailyGoal")?.value || 20), last=state.meta.get("lastChapter")?.value;
  return `<section class="hero">
    <div class="cover-wrap"><img src="./images/lt-cover-front.webp" alt="Buchcover İstanbul'a Hoş Geldiniz – Türkisch für Anfänger" width="720" height="960"></div>
    <div class="hero-copy"><p class="eyebrow">DEIN PERSÖNLICHER</p><h2>Vokabeltrainer</h2><p>${s.day.answered ? `Heute schon <strong>${s.day.answered}</strong> Aufgaben bearbeitet.` : "Bereit für ein paar neue Wörter?"}</p>
    <div class="hero-actions"><button class="primary" data-action="quick-start">Lernen starten</button><button class="secondary" data-action="today">Heute lernen <span>${s.due} fällig</span></button></div></div>
  </section>
  <a class="primary book-order-button" href="https://www.amazon.de/Istanbula-Hos-Geldiniz-Sprachreise-Istanbul/dp/369574619X/ref=sr_1_1?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&amp;crid=3BSR0NCVAPC9R&amp;dib=eyJ2IjoiMSJ9.WJmXVHCuJ9iOwMfWGZCuCw.1lGVe3XtrgWZIWrEt3-fC8VcRQZSZK_mGQ8SoxGmmGM&amp;dib_tag=se&amp;keywords=978-3695746194&amp;qid=1787589989&amp;sprefix=978-3695746194%2Caps%2C132&amp;sr=8-1" target="_blank" rel="noopener noreferrer">Jetzt das Buch bestellen</a>
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
  const s=stat(), saved=state.learningSettings;
  return `<section class="content-head"><p class="eyebrow">LERNRUNDE PLANEN</p><h2>Was möchtest du üben?</h2><p>Stelle deine Runde passend zu deinem Tag zusammen.</p></section>
  <form id="learn-form" class="setup-grid">
   <fieldset class="panel"><legend>Wortschatz</legend><button type="button" class="chapter-summary" data-nav="chapters">${state.selectedChapters.size} Kapitel · ${state.selectedTopics.size} Themen ausgewählt <span>Ändern →</span></button>
    <label><input type="radio" name="scope" value="selected" ${saved.scope==="selected"?"checked":""}> Ausgewählte Kapitel und Themen</label><label><input type="radio" name="scope" value="chapters" ${saved.scope==="chapters"?"checked":""}> Nur ausgewählte Kapitel</label><label><input type="radio" name="scope" value="topics" ${saved.scope==="topics"?"checked":""}> Nur ausgewählte Themen</label><label><input type="radio" name="scope" value="all" ${saved.scope==="all"?"checked":""}> Gesamtes Vokabular</label></fieldset>
   <fieldset class="panel"><legend>Auswahl</legend><div class="option-grid">
    ${[["all","Alle passenden"],["new","Nur neue"],["due",`Fällige (${s.due})`],["wrong","Falsch beantwortete"],["difficult","Schwierige"],["favorite","Favoriten"]].map(([v,l])=>`<label><input type="radio" name="filter" value="${v}" ${saved.filter===v?"checked":""}> ${l}</label>`).join("")}</div></fieldset>
   <fieldset class="panel"><legend>Lernmodus</legend><div class="mode-grid">
    ${[["flashcards","Karteikarten","Umdrehen & bewerten"],["choice","Multiple Choice","Antwort auswählen"],["typing","Texteingabe","Aktiv erinnern"],["self","Selbstbewertung","Eigenständig prüfen"],["mistakes","Fehlerwiederholung","Gezielt festigen"],["due","Fällige Wiederholungen","Nach Lernplan"]].map(([v,t,d])=>`<label class="mode"><input type="radio" name="mode" value="${v}" ${saved.mode===v?"checked":""}><span><b>${t}</b><small>${d}</small></span></label>`).join("")}</div></fieldset>
   <fieldset class="panel"><legend>Richtung & Umfang</legend><div class="field-row"><label>Richtung<select name="direction"><option value="tr-de" ${saved.direction==="tr-de"?"selected":""}>Türkisch → Deutsch</option><option value="de-tr" ${saved.direction==="de-tr"?"selected":""}>Deutsch → Türkisch</option><option value="mixed" ${saved.direction==="mixed"?"selected":""}>Gemischt</option></select></label><label>Aufgaben<select name="count">${[["10","10"],["20","20"],["30","30"],["50","50"],["9999","Alle"]].map(([v,l])=>`<option value="${v}" ${saved.count===v?"selected":""}>${l}</option>`).join("")}</select></label><label>Reihenfolge<select name="order"><option value="random" ${saved.order==="random"?"selected":""}>Zufällig</option><option value="chapter" ${saved.order==="chapter"?"selected":""}>Nach Kapitel</option></select></label></div></fieldset>
   <button class="primary start-session" type="submit">Lernrunde starten</button>
  </form>`;
}
function chaptersView() {
  const query=state.chapterQuery||"", filter=state.chapterFilter||"all";
  const cards=Array.from({length:45},(_,i)=>chapterStats(i+1)).filter(c=>(!query||`${c.chapter} ${c.title}`.toLowerCase().includes(query.toLowerCase())) && (filter==="all"||c[filter]>0));
  return `<section class="content-head"><p class="eyebrow">KAPITEL & THEMEN</p><h2>Wortschatz auswählen</h2><p>${state.selectedChapters.size} Kapitel · ${state.selectedTopics.size} Themen ausgewählt</p></section>
  <section class="selection-tools panel"><div class="search-field"><span>⌕</span><input id="chapter-search" value="${esc(query)}" placeholder="Nummer oder Kapiteltitel" aria-label="Kapitel suchen"></div>
  <select id="chapter-filter" aria-label="Nach Lernstatus filtern"><option value="all">Alle Lernstände</option><option value="newCount" ${filter==="newCount"?"selected":""}>Neue vorhanden</option><option value="due" ${filter==="due"?"selected":""}>Wiederholung fällig</option><option value="learned" ${filter==="learned"?"selected":""}>Gelernte vorhanden</option></select>
  <div class="tool-buttons"><button data-select="all">Alle</button><button data-select="invert">Umkehren</button><button data-select="range">Bereich</button><button data-select="none">Zurücksetzen</button></div></section>
  <div class="vocabulary-selection"><section><h3 class="group-heading">Kapitelvokabular</h3><div class="chapter-grid">${cards.map(c=>selectionCard(c, "chapter")).join("")}</div></section>
  <section><div class="section-title topic-heading"><h3 class="group-heading">Themenwortschatz</h3><div class="tool-buttons"><button data-topic-select="all">Alle</button><button data-topic-select="invert">Umkehren</button><button data-topic-select="none">Zurücksetzen</button></div></div><div class="chapter-grid topic-grid">${topics.map(t=>selectionCard(topicStats(t.id), "topic")).join("")}</div></section></div>
  <button class="primary floating-start" data-action="selected-start" ${state.selectedChapters.size||state.selectedTopics.size?"":"disabled"}>Auswahl lernen (${state.selectedChapters.size+state.selectedTopics.size})</button>`;
}
function selectionCard(c,type) { const topic=type==="topic", key=topic?c.topicId:c.chapter, selected=topic?state.selectedTopics.has(key):state.selectedChapters.has(key); return `<article class="chapter-card panel ${selected?"selected":""}"><label class="chapter-check"><input type="checkbox" ${topic?`data-topic="${key}"`:`data-chapter="${key}"`} ${selected?"checked":""}><span>${topic?esc(c.title):`Kapitel ${key}`}</span></label>${topic?"":`<h3>${esc(c.title)}</h3>`}<div class="chapter-counts"><span>${c.total} Vokabeln</span><span>${c.newCount} neu</span><span>${c.started} in Arbeit</span><span>${c.learned} gelernt</span><span>${c.due} fällig</span></div><div class="section-title chapter-mastery"><small>Lernstand</small><b>${c.mastery}%</b></div>${progressBar(c.mastery,100)}<button ${topic?`data-start-topic="${key}"`:`data-start-chapter="${key}"`} class="secondary">Lernen</button></article>`; }
function chapterStats(chapter) {
  const list=vocab.filter(v=>v.chapter===chapter), ps=list.map(v=>getProgress(v.id));
  const mastery=Math.round(ps.reduce((sum,p)=>sum+Math.max(0,Math.min(5,p.level||0)),0)/(Math.max(1,list.length)*5)*100);
  return {chapter,title:vocabularyData.chapters.find(c=>c.number===chapter)?.title||`Kapitel ${chapter}`,total:list.length,newCount:ps.filter(p=>p.status==="new").length,started:ps.filter(p=>p.level>0&&p.level<5).length,due:ps.filter(isDue).length,learned:ps.filter(p=>p.level>=5).length,mastery};
}
function topicStats(topicId) { const def=topics.find(t=>t.id===topicId), list=vocab.filter(v=>v.topicId===topicId), ps=list.map(v=>getProgress(v.id)), mastery=Math.round(ps.reduce((n,p)=>n+Math.max(0,Math.min(5,p.level||0)),0)/(Math.max(1,list.length)*5)*100); return {topicId,title:def?.title||topicId,total:list.length,newCount:ps.filter(p=>p.status==="new").length,started:ps.filter(p=>p.level>0&&p.level<5).length,due:ps.filter(isDue).length,learned:ps.filter(p=>p.level>=5).length,mastery}; }
function progressView() {
  const s=stat(state.statsSource), scoped=vocab.filter(v=>state.statsSource==="all"||v.sourceType===state.statsSource), levels=Array.from({length:6},(_,l)=>[l,scoped.filter(v=>getProgress(v.id).level===l).length]);
  return `<section class="content-head"><p class="eyebrow">DEIN LERNWEG</p><h2>Fortschritt</h2><p>Alles bleibt ausschließlich auf diesem Gerät.</p></section>
  <div class="source-tabs panel" role="group" aria-label="Statistikquelle">${[["all","Gesamtes Vokabular"],["chapter","Kapitelvokabular"],["topic","Themenwortschatz"]].map(([v,l])=>`<button data-stats-source="${v}" class="${state.statsSource===v?"active":""}">${l}</button>`).join("")}</div>
  <section class="metric-grid">${[["Gesamt",s.total],["Neu",s.newCount],["Begonnen",s.started],["Gelernt",s.learned],["Heute",s.day.answered],["Heute richtig",s.day.correct],["Heute falsch",s.day.wrong],["Fällig",s.due],["Schwierig",s.difficult],["Favoriten",s.favorite],["Lernserie",`${currentStreak()} Tage`]].map(([l,v])=>`<article class="metric panel"><strong>${v}</strong><span>${l}</span></article>`).join("")}</section>
  <section class="progress-layout"><article class="panel"><h3>Lernstufen</h3><div class="level-chart">${levels.map(([l,n])=>`<div><span>Stufe ${l}</span><div>${progressBar(n,s.total)}</div><b>${n}</b></div>`).join("")}</div></article>
  <article class="panel"><h3>Fortschritt je Rubrik</h3><div class="chapter-progress-list">${state.statsSource!=="topic"?Array.from({length:45},(_,i)=>chapterStats(i+1)).map(c=>`<div><span>${c.chapter}</span>${progressBar(c.mastery,100)}<small>${c.mastery}%</small></div>`).join(""):""}${state.statsSource!=="chapter"?topics.map(t=>{const c=topicStats(t.id);return `<div class="topic-progress"><span>${esc(c.title)}</span>${progressBar(c.mastery,100)}<small>${c.mastery}%</small></div>`}).join(""):""}</div></article></section>`;
}
function settingsView() {
  const goal=state.meta.get("dailyGoal")?.value||20;
  return `<section class="content-head"><p class="eyebrow">PERSÖNLICH & LOKAL</p><h2>Einstellungen</h2><p>Deine Daten verlassen dieses Gerät nicht.</p></section>
  <div class="settings-grid">
   <section class="panel"><h3>Darstellung</h3><label>Farbmodus<select id="theme-select"><option value="system" ${theme()==="system"?"selected":""}>Systemeinstellung</option><option value="light" ${theme()==="light"?"selected":""}>Hell</option><option value="dark" ${theme()==="dark"?"selected":""}>Dunkel</option></select></label><label class="switch"><input id="large-text" type="checkbox" ${localStorage.getItem("largeText")==="true"?"checked":""}><span>Größere Schrift verwenden</span></label><label class="switch"><input id="tolerant" type="checkbox" ${localStorage.getItem("tolerant")!=="false"?"checked":""}><span>„Fast richtig“ erkennen</span></label></section>
   <section class="panel"><h3>Lernziel</h3><label>Tägliche Aufgaben<input id="daily-goal" type="number" min="1" max="500" value="${goal}"></label><p class="hint">Ein Lerntag zählt, sobald mindestens eine Aufgabe bewertet wurde. Unterbrechungen werden nicht bestraft.</p></section>
   <section class="panel"><h3>Lernstand sichern</h3><p>Exportiere eine lokale JSON-Sicherung oder stelle sie wieder her.</p><div class="button-stack"><button data-action="export" class="secondary">Lernstand exportieren</button><label class="file-button secondary">Lernstand importieren<input id="import-file" type="file" accept="application/json,.json"></label></div></section>
   <section class="panel danger"><h3>Zurücksetzen</h3><p>Entfernt den vollständigen Lernstand unwiderruflich von diesem Gerät.</p><button data-action="reset" class="danger-button">Lernstand vollständig zurücksetzen</button></section>
   <section class="panel"><h3>Installation & App</h3><p>Version ${APP_VERSION} · Daten ${vocabularyData.contentVersion}<br>${vocab.length} Vokabeln · 45 Kapitel · ${topics.length} Themen</p><div class="button-stack"><button data-action="install-help" class="secondary">Installationshilfe</button>${state.updateWorker?'<button data-action="apply-update" class="primary">Neue Version jetzt aktivieren</button>':""}</div></section>
  </div><footer class="settings-copyright">Copyright © Appeltauer Media</footer>`;
}
function searchView() {
  const q=state.searchQuery||"", results=q?searchVocabulary(q).slice(0,100):[];
  return `<section class="content-head"><p class="eyebrow">GESAMTER WORTSCHATZ</p><h2>Vokabelsuche</h2></section><div class="search-field global panel"><span>⌕</span><input id="global-search" value="${esc(q)}" autofocus placeholder="Türkisch, Deutsch, Kapitel oder Thema" aria-label="Vokabel suchen"></div>
  <div class="search-filters"><select id="search-source"><option value="all">Alle Quellen</option><option value="chapter" ${state.searchSource==="chapter"?"selected":""}>Kapitelvokabular</option><option value="topic" ${state.searchSource==="topic"?"selected":""}>Themenwortschatz</option></select><select id="search-topic"><option value="all">Alle Themen</option>${topics.map(t=>`<option value="${t.id}" ${state.searchTopic===t.id?"selected":""}>${esc(t.title)}</option>`).join("")}</select></div>
  <p class="result-count" aria-live="polite">${q?`${results.length}${results.length===100?"+":""} Treffer`:"Suchbegriff eingeben"}</p>
  <div class="result-list">${results.map(v=>{const p=getProgress(v.id);return `<article class="panel result"><div><h3 lang="tr">${esc(v.turkish)}</h3><p>${esc(v.german.join(" / "))}</p><small>${sourceLabel(v)} · ${p.status==="new"?"Neu":p.level>=5?"Gelernt":`Stufe ${p.level}`} ${p.favorite?"· ★ Favorit":""}</small></div><button data-learn-id="${v.id}" class="secondary">Lernen</button></article>`}).join("")}</div>`;
}
function searchVocabulary(q) { const n=searchKey(q); return vocab.filter(v=>(state.searchSource==="all"||v.sourceType===state.searchSource)&&(state.searchTopic==="all"||v.topicId===state.searchTopic)&&searchKey(`${v.turkish} ${v.german.join(" ")} ${v.chapter||""} ${v.chapterTitle||""} ${v.topicTitle||""} ${v.category}`).includes(n)).sort((a,b)=>a.german[0].localeCompare(b.german[0],"de")); }

function startSession(options={}) {
  const form=options.form, mode=options.mode||form?.get("mode")||"flashcards", direction=form?.get("direction")||"tr-de", count=Number(form?.get("count")||20), order=form?.get("order")||"random";
  const scope=form?.get("scope")||"selected", filter=options.filter||form?.get("filter")||"all";
  let pool=options.ids ? options.ids.map(id=>byId.get(id)).filter(Boolean) : vocab.filter(v=>scope==="all"||(v.sourceType==="chapter"&&scope!=="topics"&&state.selectedChapters.has(v.chapter))||(v.sourceType==="topic"&&scope!=="chapters"&&state.selectedTopics.has(v.topicId)));
  pool=pool.filter(v=>matchesFilter(getProgress(v.id),filter));
  if (mode==="mistakes") pool=pool.filter(v=>getProgress(v.id).wrong>0);
  if (mode==="due") pool=pool.filter(v=>isDue(getProgress(v.id)));
  if (!pool.length) return toast("Für diese Auswahl sind keine passenden Vokabeln vorhanden.",true);
  if (order==="random") pool.sort(()=>Math.random()-.5); else pool.sort((a,b)=>(a.chapter||99)-(b.chapter||99)||a.id.localeCompare(b.id));
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
  $app.innerHTML=`<div class="session-shell"><header class="session-head"><button data-session-close class="icon-button" aria-label="Lernrunde schließen">×</button><div><b>${modeTitle}</b><small>${sourceLabel(v)} · ${dir==="tr-de"?"Türkisch → Deutsch":"Deutsch → Türkisch"}</small></div><span>${s.index+1} / ${s.items.length}</span></header><div class="session-progress">${progressBar(s.index,s.items.length)}</div>
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
  const same=vocab.filter(x=>x.id!==v.id&&((v.topicId&&x.topicId===v.topicId)||(v.chapter&&x.chapter===v.chapter)||x.category&&x.category===v.category)).sort(()=>Math.random()-.5);
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
  document.querySelector("#learn-form")?.addEventListener("change",e=>saveLearningSettings(new FormData(e.currentTarget)));
  document.querySelector("#learn-form")?.addEventListener("submit",async(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);await saveLearningSettings(form);startSession({form});});
  bindChapterActions(); bindSettings(); bindSearch();
  document.querySelectorAll("[data-stats-source]").forEach(b=>b.addEventListener("click",()=>{state.statsSource=b.dataset.statsSource;render();}));
  document.querySelectorAll("[data-action='install-help']").forEach(b=>b.addEventListener("click",installHelp));
}
function bindChapterActions() {
  document.querySelectorAll("[data-chapter]").forEach(c=>c.addEventListener("change",()=>{const n=Number(c.dataset.chapter);c.checked?state.selectedChapters.add(n):state.selectedChapters.delete(n);saveVocabularySelection();render();}));
  document.querySelectorAll("[data-topic]").forEach(c=>c.addEventListener("change",()=>{c.checked?state.selectedTopics.add(c.dataset.topic):state.selectedTopics.delete(c.dataset.topic);saveVocabularySelection();render();}));
  document.querySelectorAll("[data-start-chapter]").forEach(b=>b.addEventListener("click",()=>{state.selectedChapters=new Set([Number(b.dataset.startChapter)]);saveVocabularySelection();navigate("learn");}));
  document.querySelectorAll("[data-start-topic]").forEach(b=>b.addEventListener("click",()=>{state.selectedTopics=new Set([b.dataset.startTopic]);saveVocabularySelection();navigate("learn");}));
  document.querySelector("[data-action='selected-start']")?.addEventListener("click",()=>navigate("learn"));
  document.querySelectorAll("[data-select]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.select;if(action==="all")state.selectedChapters=new Set(Array.from({length:45},(_,i)=>i+1));if(action==="none")state.selectedChapters.clear();if(action==="invert")state.selectedChapters=new Set(Array.from({length:45},(_,i)=>i+1).filter(n=>!state.selectedChapters.has(n)));if(action==="range"){const input=prompt("Kapitelbereich, z. B. 5-12:");const m=input?.match(/^\\s*(\\d+)\\s*-\\s*(\\d+)\\s*$/);if(!m||+m[1]<1||+m[2]>45||+m[1]>+m[2])return toast("Bitte einen gültigen Bereich von 1 bis 45 eingeben.",true);state.selectedChapters=new Set(Array.from({length:+m[2]-+m[1]+1},(_,i)=>+m[1]+i));}saveVocabularySelection();render();}));
  document.querySelectorAll("[data-topic-select]").forEach(b=>b.addEventListener("click",()=>{const ids=topics.map(t=>t.id), action=b.dataset.topicSelect;if(action==="all")state.selectedTopics=new Set(ids);if(action==="none")state.selectedTopics.clear();if(action==="invert")state.selectedTopics=new Set(ids.filter(id=>!state.selectedTopics.has(id)));saveVocabularySelection();render();}));
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
  document.querySelector("#search-source")?.addEventListener("change",e=>{state.searchSource=e.target.value;render();});
  document.querySelector("#search-topic")?.addEventListener("change",e=>{state.searchTopic=e.target.value;render();});
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
async function recordDaily(quality){let day=state.daily.find(d=>d.date===today());if(!day){day={date:today(),answered:0,correct:0,wrong:0,ids:[]};state.daily.push(day);}day.answered++;if(["correct","easy"].includes(quality))day.correct++;if(quality==="wrong")day.wrong++;const v=state.session.items[state.session.index];if(!day.ids.includes(v.id))day.ids.push(v.id);await db.put("daily",day);if(v.chapter)await saveMeta("lastChapter",v.chapter);if(v.topicId)await saveMeta("lastTopic",v.topicId);await saveMeta("lastMode",state.session.mode);await saveMeta("selectedChapters",[...state.selectedChapters]);await saveMeta("selectedTopics",[...state.selectedTopics]);}
function currentStreak(){const active=new Set(state.daily.filter(d=>d.answered>0).map(d=>d.date));let count=0,date=new Date();if(!active.has(date.toLocaleDateString("sv-SE"))){date.setDate(date.getDate()-1);}while(active.has(date.toLocaleDateString("sv-SE"))){count++;date.setDate(date.getDate()-1);}return count;}
async function saveMeta(key,value){const item={key,value};state.meta.set(key,item);await db.put("meta",item);}
async function saveLearningSettings(form){const value=normalizeLearnSettings(Object.fromEntries(form.entries()));state.learningSettings=value;await saveMeta("learningSettings",value);}
function saveVocabularySelection(){return Promise.all([saveMeta("selectedChapters",[...state.selectedChapters]),saveMeta("selectedTopics",[...state.selectedTopics])]);}
async function exportData(){const payload=createExport([...state.progress.values()],[...state.meta.values()],state.daily,APP_VERSION),blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tuerkisch-lernstand-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Lernstand wurde exportiert.");}
async function importData(e){try{const text=await e.target.files[0]?.text();if(!text)return;let parsed;try{parsed=JSON.parse(text);}catch{return toast("Die Datei enthält kein gültiges JSON.",true);}const check=validateImport(parsed,new Set(byId.keys()));if(!check.valid)return toast(check.errors.slice(0,3).join(" "),true);if(!confirm(`${check.data.progress.length} bekannte Fortschrittseinträge importieren?${check.warnings.length?` ${check.warnings.length} unbekannte IDs werden übersprungen.`:""} Vorhandene Einträge werden ersetzt.`))return;await Promise.all(["progress","meta","daily"].map(s=>db.clear(s)));await db.bulkPut("progress",check.data.progress);await db.bulkPut("meta",check.data.meta);await db.bulkPut("daily",check.data.daily);await loadState();render();toast(`Lernstand erfolgreich wiederhergestellt.${check.warnings.length?` ${check.warnings.length} unbekannte IDs übersprungen.`:""}`);}catch(err){toast(`Import fehlgeschlagen: ${err.message}`,true);}}
async function resetData(){if(!confirm("Wirklich den vollständigen Lernstand löschen? Diese Aktion kann nicht rückgängig gemacht werden."))return;if(prompt('Zur Bestätigung bitte "LÖSCHEN" eingeben:')!=="LÖSCHEN")return toast("Zurücksetzen abgebrochen.",true);await Promise.all(["progress","meta","daily"].map(s=>db.clear(s)));state.progress.clear();state.meta.clear();state.daily=[];state.selectedChapters=new Set([1]);state.selectedTopics.clear();state.learningSettings={...DEFAULT_LEARN_SETTINGS};render();toast("Der Lernstand wurde vollständig zurückgesetzt.");}
function navigate(view){state.view=view;history.pushState({view},"",`?view=${view}`);render();document.querySelector("#main")?.focus();}
function toast(message,error=false){const t=document.querySelector("#toast");if(!t){alert(message);return;}t.textContent=message;t.className=`toast show ${error?"error":""}`;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>t.classList.remove("show"),5000);}
function isStandalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}
async function installHelp(){if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;render();return;}const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);alert(ios?"So installierst du die App:\n\n1. In Safari öffnen.\n2. Auf das Teilen-Symbol tippen.\n3. „Zum Home-Bildschirm“ auswählen.\n4. Installation bestätigen.":"Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.");}
async function loadState(){try{const [progress,meta,daily]=await Promise.all([db.all("progress"),db.all("meta"),db.all("daily")]);state.progress=new Map(progress.filter(p=>byId.has(p.id)).map(p=>[p.id,p]));state.meta=new Map(meta.map(m=>[m.key,m]));state.daily=daily;const selected=state.meta.get("selectedChapters")?.value, selectedTopics=state.meta.get("selectedTopics")?.value;state.learningSettings=normalizeLearnSettings(state.meta.get("learningSettings")?.value);if(Array.isArray(selected))state.selectedChapters=new Set(selected.filter(n=>Number.isInteger(n)&&n>=1&&n<=45));if(Array.isArray(selectedTopics))state.selectedTopics=new Set(selectedTopics.filter(id=>topics.some(t=>t.id===id)));}catch(err){console.error(err);$app.innerHTML=`<main class="fatal"><h1>Lokaler Speicher nicht verfügbar</h1><p>${esc(err.message)}</p><p>Prüfe den privaten Modus oder freien Gerätespeicher und lade die Seite neu.</p></main>`;throw err;}}
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
window.addEventListener("popstate",e=>{state.view=e.state?.view||new URLSearchParams(location.search).get("view")||"landing";render();});
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
