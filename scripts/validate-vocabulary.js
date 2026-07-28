import fs from "node:fs";

export function validateVocabulary(data) {
  const errors = [], warnings = [], ids = new Set(), exact = new Map();
  if (!data || typeof data !== "object") return { errors: ["Wurzel muss ein Objekt sein."], warnings };
  if (data.schemaVersion !== 1) errors.push("Nicht unterstützte schemaVersion.");
  if (!Array.isArray(data.vocabulary)) errors.push("vocabulary muss ein Array sein.");
  for (const [index, item] of (data.vocabulary || []).entries()) {
    const at = item?.source?.line ? `Quellzeile ${item.source.line}` : `Datensatz ${index + 1}`;
    if (!item?.id || typeof item.id !== "string") errors.push(`${at}: ID fehlt oder ist ungültig.`);
    else if (ids.has(item.id)) errors.push(`${at}: Doppelte ID ${item.id}.`);
    else ids.add(item.id);
    if (!Number.isInteger(item?.chapter) || item.chapter < 1 || item.chapter > 45) errors.push(`${at}: Kapitelnummer ungültig.`);
    if (!item?.turkish || typeof item.turkish !== "string") errors.push(`${at}: Türkischer Begriff fehlt.`);
    if (!Array.isArray(item?.german) || !item.german.length || item.german.some((x) => typeof x !== "string" || !x.trim())) errors.push(`${at}: Deutsche Übersetzung fehlt/ungültig.`);
    if (typeof item?.active !== "boolean") errors.push(`${at}: active muss boolesch sein.`);
    if (item?.chapterTitle !== `Kapitel ${item?.chapter}`) errors.push(`${at}: Kapitelzuordnung inkonsistent.`);
    const key = `${item?.chapter}|${item?.turkish?.trim().toLocaleLowerCase("tr")}|${item?.german?.join("/").toLocaleLowerCase("de")}`;
    if (exact.has(key)) warnings.push(`${at}: Doppelter Eintrag; zuerst ${exact.get(key)}.`);
    else exact.set(key, at);
  }
  for (let c = 1; c <= 45; c++) if (!(data.vocabulary || []).some((v) => v.chapter === c)) errors.push(`Kapitel ${c} enthält keine Vokabeln.`);
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
  fs.writeFileSync("docs/DATENPRUEFBERICHT.md", `# Datenprüfbericht\n\nStand: 2026-07-28\n\n- Fehler: ${result.errors.length}\n- Hinweise: ${result.warnings.length}\n\n## Fehler\n\n${result.errors.map(x=>`- ${x}`).join("\n") || "Keine."}\n\n## Hinweise\n\n${result.warnings.map(x=>`- ${x}`).join("\n") || "Keine."}\n\n## Nicht erfundene Angaben\n\nDer Extrakt enthält keine Kapiteltitel. Daher wird neutral „Kapitel N“ verwendet. Originalwerte stehen zusätzlich in den source-Feldern.\n`, "utf8");
  if (result.warnings.length) console.warn(result.warnings.join("\n"));
  if (result.errors.length) { console.error(result.errors.join("\n")); process.exit(1); }
  console.log(`${dataCount(file)} Vokabeln geprüft: keine Fehler, ${result.warnings.length} Hinweise.`);
}
function dataCount(file) { return JSON.parse(fs.readFileSync(file, "utf8")).vocabulary.length; }
