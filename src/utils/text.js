const TURKISH_MAP = { ç:"c", ğ:"g", ı:"i", İ:"i", ö:"o", ş:"s", ü:"u" };
export function normalizeExact(value, locale = "tr") {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase(locale);
}
export function normalizeLoose(value) {
  return normalizeExact(value).replace(/[çğıİöşü]/g, (c) => TURKISH_MAP[c] || c).normalize("NFD").replace(/\p{M}/gu, "");
}
export function levenshtein(a, b) {
  const x = [...a], y = [...b], row = Array(y.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (x[i - 1] === y[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[y.length];
}
export function evaluateAnswer(input, accepted, language = "tr") {
  const values = (Array.isArray(accepted) ? accepted : [accepted]).filter(Boolean);
  const exact = normalizeExact(input, language);
  if (values.some((v) => normalizeExact(v, language) === exact)) return { result: "correct", message: "Richtig!" };
  const loose = normalizeLoose(input);
  const looseMatch = values.find((v) => normalizeLoose(v) === loose);
  if (looseMatch) return { result: "almost", message: `Fast richtig. Achte auf die Schreibweise: ${looseMatch}` };
  const close = values.find((v) => {
    const candidate = normalizeExact(v, language);
    return candidate.length >= 4 && levenshtein(exact, candidate) === 1;
  });
  if (close) return { result: "almost", message: `Fast richtig. Ein Zeichen weicht ab: ${close}` };
  return { result: "wrong", message: `Nicht ganz. Richtig ist: ${values.join(" / ")}` };
}
export function searchKey(value) { return normalizeLoose(value).replace(/[^\p{L}\p{N}\s]/gu, ""); }
