const TURKISH_MAP = { ç:"c", ğ:"g", ı:"i", İ:"i", ö:"o", ş:"s", ü:"u" };
export function normalizeExact(value, locale = "tr") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(locale);
}
export function normalizeComparable(value, locale = "tr") {
  return normalizeExact(value, locale)
    .replace(/[‘’‚‛´`]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function normalizeLoose(value) {
  return normalizeComparable(value).replace(/[çğıİöşü]/g, (c) => TURKISH_MAP[c] || c).normalize("NFD").replace(/\p{M}/gu, "");
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
  const comparable = normalizeComparable(input, language);
  if (values.some((v) => normalizeComparable(v, language) === comparable)) return { result: "correct", message: "Richtig!" };
  const loose = normalizeLoose(input);
  const looseMatch = values.find((v) => normalizeLoose(v) === loose);
  if (looseMatch) return { result: "almost", message: `Fast richtig. Achte auf die Schreibweise: ${looseMatch}` };
  const close = values.find((v) => {
    const candidate = normalizeComparable(v, language);
    if (candidate.length < 4 || comparable.length < 3) return false;
    const distance = levenshtein(comparable, candidate);
    const limit = candidate.length >= 6 ? Math.min(3, Math.ceil(candidate.length * .25)) : 1;
    const transposed = comparable.length === candidate.length && [...comparable].some((_, i, chars) =>
      i < chars.length - 1 &&
      chars[i] === candidate[i + 1] &&
      chars[i + 1] === candidate[i] &&
      chars.filter((char, index) => index !== i && index !== i + 1 && char !== candidate[index]).length === 0
    );
    return distance <= limit || transposed;
  });
  if (close) return { result: "almost", message: `Fast richtig. Prüfe die Schreibweise: ${close}` };
  return { result: "wrong", message: `Nicht ganz. Richtig ist: ${values.join(" / ")}` };
}
export function searchKey(value) { return normalizeLoose(value).replace(/[^\p{L}\p{N}\s]/gu, ""); }
