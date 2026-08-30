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
