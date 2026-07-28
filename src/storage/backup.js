export const EXPORT_VERSION = 1;
export function createExport(progress, meta, daily, appVersion = "1.0.0") {
  return { type: "tuerkisch-lernstand", version: EXPORT_VERSION, appVersion, exportedAt: new Date().toISOString(), progress, meta, daily };
}
export function validateImport(value, validIds) {
  const errors = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["Die Datei enthält kein gültiges Datenobjekt."] };
  if (value.type !== "tuerkisch-lernstand") errors.push("Die Datei ist kein Türkisch-Lernstand.");
  if (value.version !== EXPORT_VERSION) errors.push(`Nicht unterstützte Versionsnummer: ${value.version ?? "fehlt"}.`);
  if (!Array.isArray(value.progress) || !Array.isArray(value.meta) || !Array.isArray(value.daily)) errors.push("Die Datenstruktur ist unvollständig.");
  for (const p of value.progress || []) {
    if (!p || typeof p.id !== "string") errors.push("Ein Fortschrittseintrag besitzt keine gültige ID.");
    else if (!validIds.has(p.id)) errors.push(`Unbekannte Vokabel-ID: ${p.id}.`);
    if (!Number.isInteger(p.level) || p.level < 0 || p.level > 5) errors.push(`Ungültige Lernstufe bei ${p.id || "unbekannt"}.`);
  }
  return { valid: errors.length === 0, errors };
}
