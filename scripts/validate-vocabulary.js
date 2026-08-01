import fs from "node:fs";
import { TOPICS } from "./import-topics.js";

export function validateVocabulary(data) {
  const errors = [], warnings = [], ids = new Set(), exact = new Map();
  if (!data || typeof data !== "object") return { errors: ["Wurzel muss ein Objekt sein."], warnings };
  if (data.schemaVersion !== 2) errors.push("Nicht unterstützte schemaVersion.");
  if (!Array.isArray(data.vocabulary)) errors.push("vocabulary muss ein Array sein.");
  const chapterTitles = new Map((data.chapters || []).map((item) => [item.number, item.title]));
  if (!Array.isArray(data.chapters) || data.chapters.length !== 45) errors.push("Es müssen genau 45 Kapiteldefinitionen vorhanden sein.");
  if (new Set((data.chapters || []).map((item) => item.number)).size !== 45) errors.push("Kapitelnummern in chapters sind unvollständig oder doppelt.");
  if ((data.chapters || []).some((item) => typeof item.title !== "string" || !item.title.trim())) errors.push("Ein Kapiteltitel fehlt oder ist ungültig.");
  const topicTitles = new Map((data.topics || []).map((item) => [item.id, item.title]));
  if (!Array.isArray(data.topics) || data.topics.length !== TOPICS.length) errors.push("Es müssen genau elf Themenrubriken vorhanden sein.");
  for (const topic of TOPICS) if (topicTitles.get(topic.id) !== topic.title) errors.push(`Themenrubrik ${topic.id} fehlt oder besitzt einen falschen Titel.`);
  const german = new Map(), turkish = new Map();
  for (const [index, item] of (data.vocabulary || []).entries()) {
    const at = item?.source?.line ? `Quellzeile ${item.source.line}` : `Datensatz ${index + 1}`;
    if (!item?.id || typeof item.id !== "string") errors.push(`${at}: ID fehlt oder ist ungültig.`);
    else if (ids.has(item.id)) errors.push(`${at}: Doppelte ID ${item.id}.`);
    else ids.add(item.id);
    if (!["chapter","topic"].includes(item?.sourceType)) errors.push(`${at}: sourceType ungültig.`);
    if (!item?.turkish || typeof item.turkish !== "string") errors.push(`${at}: Türkischer Begriff fehlt.`);
    if (!Array.isArray(item?.german) || !item.german.length || item.german.some((x) => typeof x !== "string" || !x.trim())) errors.push(`${at}: Deutsche Übersetzung fehlt/ungültig.`);
    if (typeof item?.active !== "boolean") errors.push(`${at}: active muss boolesch sein.`);
    if (item?.sourceType === "chapter" && (!Number.isInteger(item.chapter) || item.chapter < 1 || item.chapter > 45 || item.chapterTitle !== chapterTitles.get(item.chapter))) errors.push(`${at}: Kapitelzuordnung inkonsistent.`);
    if (item?.sourceType === "topic" && (!topicTitles.has(item.topicId) || item.topicTitle !== topicTitles.get(item.topicId) || !item.id.startsWith(`thema-${item.topicId}-`))) errors.push(`${at}: Themenzuordnung oder stabile ID inkonsistent.`);
    const key = `${item?.turkish?.trim().toLocaleLowerCase("tr")}|${item?.german?.join("/").toLocaleLowerCase("de")}`;
    if (exact.has(key)) warnings.push(`${at}: Doppelter Eintrag; zuerst ${exact.get(key)}.`);
    else exact.set(key, at);
    const de=item?.german?.join("/")||"", tr=item?.turkish||"";
    if(german.has(de)&&german.get(de)!==tr) warnings.push(`${at}: Deutscher Begriff „${de}“ besitzt mehrere türkische Übersetzungen.`); else german.set(de,tr);
    if(turkish.has(tr)&&turkish.get(tr)!==de) warnings.push(`${at}: Türkischer Begriff „${tr}“ besitzt mehrere deutsche Bezeichnungen.`); else turkish.set(tr,de);
  }
  for (let c = 1; c <= 45; c++) if (!(data.vocabulary || []).some((v) => v.chapter === c)) errors.push(`Kapitel ${c} enthält keine Vokabeln.`);
  for (const topic of TOPICS) { const actual=(data.vocabulary||[]).filter(v=>v.topicId===topic.id).length, declared=(data.topics||[]).find(t=>t.id===topic.id)?.count; if(!actual||actual!==declared) errors.push(`Rubrik ${topic.title}: deklarierte und tatsächliche Zeilenzahl stimmen nicht überein.`); }
  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const file = process.argv[2] || "data/vocabulary.json";
  const bytes = fs.readFileSync(file);
  const text = bytes.toString("utf8");
  const encodingErrors = text.includes("\uFFFD") ? ["Datei enthält ungültige UTF-8-Zeichen."] : [];
  const result = validateVocabulary(JSON.parse(text));
  result.errors.unshift(...encodingErrors);
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/DATENPRUEFBERICHT.md", `# Datenprüfbericht\n\nStand: 2026-08-01\n\n- Datensätze: ${(JSON.parse(text).vocabulary||[]).length}\n- Fehler: ${result.errors.length}\n- Hinweise: ${result.warnings.length}\n\n## Fehler\n\n${result.errors.map(x=>`- ${x}`).join("\n") || "Keine."}\n\n## Hinweise\n\n${result.warnings.map(x=>`- ${x}`).join("\n") || "Keine."}\n\n## Datenquellen\n\nKapitelwerte stammen unverändert aus dem Vokabel-Extrakt. Themenwerte stammen unverändert aus \`data/source/THEMENWORTSCHATZ_TUERKISCH.md\` und werden mit \`scripts/import-topics.js\` erzeugt. Hinweise werden nicht automatisch bereinigt.\n`, "utf8");
  if (result.warnings.length) console.warn(result.warnings.join("\n"));
  if (result.errors.length) { console.error(result.errors.join("\n")); process.exit(1); }
  console.log(`${dataCount(file)} Vokabeln geprüft: keine Fehler, ${result.warnings.length} Hinweise.`);
}
function dataCount(file) { return JSON.parse(fs.readFileSync(file, "utf8")).vocabulary.length; }
