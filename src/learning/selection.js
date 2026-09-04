export function isMastered(progress) {
  return (progress?.level || 0) >= 5;
}

export function matchesProgressFilter(progress, filter, due = () => false) {
  return filter === "all"
    || (filter === "new" && progress?.status === "new")
    || (filter === "learned" && isMastered(progress))
    || (filter === "due" && due(progress))
    || (filter === "wrong" && (progress?.wrong || 0) > 0)
    || (filter === "difficult" && Boolean(progress?.difficult))
    || (filter === "favorite" && Boolean(progress?.favorite));
}

export function selectedIncompleteChapters(selected, masteredChapters) {
  return new Set([...selected].filter((chapter) => !masteredChapters.has(chapter)));
}

export function usesGlobalLearnedPool(filter) {
  return filter === "learned";
}

export function uniqueDistractorValues(items, valueFor, correct, count = 3) {
  const values = [];
  const keyFor = (value) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("de");
  const seen = new Set([keyFor(correct)]);
  for (const item of items) {
    const value = valueFor(item);
    const key = keyFor(value);
    if (!seen.has(key)) {
      seen.add(key);
      values.push(value);
    }
    if (values.length === count) break;
  }
  return values;
}
