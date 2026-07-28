import fs from "node:fs";
import path from "node:path";

const source = process.argv[2] || "C:/Users/apple/Downloads/Vokabel-Extrakt_Kapitel_1-45.md";
const destination = process.argv[3] || "data/vocabulary.json";
const raw = fs.readFileSync(source, "utf8");
if (raw.includes("\uFFFD")) throw new Error("Quelldatei enthält ungültige UTF-8-Ersatzzeichen.");

const vocabulary = [];
let chapter = 0;
const sequence = new Map();
for (const [lineIndex, line] of raw.split(/\r?\n/).entries()) {
  const heading = line.match(/^## Kapitel (\d+)\s*$/);
  if (heading) {
    chapter = Number(heading[1]);
    sequence.set(chapter, 0);
    continue;
  }
  if (!chapter || !line.startsWith("|") || /^\|(?:\s*-+\s*\|)+$/.test(line)) continue;
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  if (cells[0] === "Deutsch" || cells.length !== 3) continue;
  const n = (sequence.get(chapter) || 0) + 1;
  sequence.set(chapter, n);
  vocabulary.push({
    id: `k${String(chapter).padStart(2, "0")}-v${String(n).padStart(3, "0")}`,
    chapter,
    chapterTitle: `Kapitel ${chapter}`,
    turkish: cells[1],
    german: cells[0].split(/\s+\/\s+/).filter(Boolean),
    pronunciation: cells[2],
    additionalMeanings: [],
    partOfSpeech: "",
    category: "",
    notes: "",
    examples: [],
    active: true,
    source: { file: path.basename(source), line: lineIndex + 1, originalGerman: cells[0] }
  });
}
const output = {
  schemaVersion: 1,
  contentVersion: "2026.07.28",
  language: { source: "tr", target: "de" },
  source: { file: path.basename(source), unchanged: true },
  chapters: Array.from({ length: 45 }, (_, i) => ({ number: i + 1, title: `Kapitel ${i + 1}` })),
  vocabulary
};
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`, "utf8");
const moduleDestination = destination.replace(/\.json$/i, ".js");
fs.writeFileSync(moduleDestination, `// Automatisch erzeugt aus ${path.basename(source)} – nicht manuell bearbeiten.\nexport default ${JSON.stringify(output, null, 2)};\n`, "utf8");
console.log(`${vocabulary.length} Vokabeln aus 45 Kapiteln nach ${destination} und ${moduleDestination} geschrieben.`);
