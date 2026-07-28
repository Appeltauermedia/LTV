export const LEVEL_INTERVALS = [0, 0, 1, 3, 7, 21];
const MIN_ADVANCE_MS = 45_000;
export function emptyProgress(id) {
  return { id, level: 0, correct: 0, wrong: 0, streak: 0, lastLearnedAt: null, nextReviewAt: null, favorite: false, difficult: false, status: "new" };
}
export function schedule(progress, quality, now = Date.now()) {
  const p = { ...emptyProgress(progress.id), ...progress };
  const positive = quality === "correct" || quality === "easy";
  const tooFast = positive && p.lastLearnedAt && now - new Date(p.lastLearnedAt).getTime() < MIN_ADVANCE_MS;
  if (quality === "wrong") p.level = Math.max(1, p.level - 2);
  else if (quality === "partial" || quality === "unsure" || tooFast) p.level = Math.max(1, Math.min(5, p.level || 1));
  else if (positive) p.level = Math.min(5, Math.max(1, p.level + 1));
  p.correct += positive ? 1 : 0;
  p.wrong += quality === "wrong" ? 1 : 0;
  p.streak = positive ? p.streak + 1 : quality === "wrong" ? 0 : p.streak;
  p.lastLearnedAt = new Date(now).toISOString();
  const dayMs = 86_400_000;
  p.nextReviewAt = new Date(now + LEVEL_INTERVALS[p.level] * dayMs).toISOString();
  p.status = p.level >= 5 ? "learned" : "learning";
  return p;
}
export function isDue(progress, now = Date.now()) {
  return progress?.nextReviewAt && new Date(progress.nextReviewAt).getTime() <= now;
}
