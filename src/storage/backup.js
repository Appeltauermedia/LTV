export const EXPORT_VERSION = 2;
export function createExport(progress, meta, daily, appVersion = "1.0.0") {
  return { type: "tuerkisch-lernstand", version: EXPORT_VERSION, schemaVersion: 2, appVersion, exportedAt: new Date().toISOString(), progress, meta, daily };
}
export function validateImport(value, validIds) {
  const errors = [], warnings = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["Die Datei enthält kein gültiges Datenobjekt."] };
  if (value.type !== "tuerkisch-lernstand") errors.push("Die Datei ist kein Türkisch-Lernstand.");
  if (![1, EXPORT_VERSION].includes(value.version)) errors.push(`Nicht unterstützte Versionsnummer: ${value.version ?? "fehlt"}.`);
  if (!Array.isArray(value.progress) || !Array.isArray(value.meta) || !Array.isArray(value.daily)) errors.push("Die Datenstruktur ist unvollständig.");
  const progress=[];
  for (const p of value.progress || []) {
    if (!p || typeof p.id !== "string") errors.push("Ein Fortschrittseintrag besitzt keine gültige ID.");
    else if (!validIds.has(p.id)) { warnings.push(`Unbekannte Vokabel-ID übersprungen: ${p.id}.`); continue; }
    if (!Number.isInteger(p.level) || p.level < 0 || p.level > 5) errors.push(`Ungültige Lernstufe bei ${p.id || "unbekannt"}.`);
    else progress.push(p);
  }
  return { valid: errors.length === 0, errors, warnings, data:{ progress, meta:Array.isArray(value.meta)?value.meta:[], daily:Array.isArray(value.daily)?value.daily:[] } };
}
