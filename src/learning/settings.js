export const DEFAULT_LEARN_SETTINGS = Object.freeze({
  scope: "selected", filter: "all", mode: "flashcards",
  direction: "tr-de", count: "20", order: "random"
});

const allowed = {
  scope: new Set(["selected", "chapters", "topics", "all"]),
  filter: new Set(["all", "new", "due", "wrong", "difficult", "favorite"]),
  mode: new Set(["flashcards", "choice", "typing", "self", "mistakes", "due"]),
  direction: new Set(["tr-de", "de-tr", "mixed"]),
  count: new Set(["10", "20", "30", "50", "9999"]),
  order: new Set(["random", "chapter"])
};

export function normalizeLearnSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_LEARN_SETTINGS).map(([key, fallback]) => [key, allowed[key].has(String(source[key])) ? String(source[key]) : fallback]));
}
