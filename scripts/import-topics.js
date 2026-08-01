import fs from "node:fs";
import path from "node:path";

export const TOPICS = [
  ["tiere", "Tiere"], ["kleidung", "Kleidung"], ["farben", "Farben"],
  ["anatomie-koerperteile", "Anatomie und Körperteile"], ["verkehrsmittel", "Verkehrsmittel"],
  ["obst-gemuese", "Obst und Gemüse"], ["geschaefte", "Geschäfte"],
  ["lebensmittel", "Lebensmittel"], ["pflanzen", "Pflanzen"], ["moebel", "Möbel"],
  ["personen", "Personen"]
].map(([id, title]) => ({ id, title }));

export function parseTopics(markdown, sourceFile = "THEMENWORTSCHATZ_TUERKISCH.md") {
  if (markdown.includes("\uFFFD")) throw new Error("Quelldatei enthält ungültige UTF-8-Ersatzzeichen.");
  const expected = new Map(TOPICS.map((topic) => [topic.title, topic]));
  const found = new Map();
  let current = null;
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const definition = expected.get(heading[1]);
      if (!definition) throw new Error(`Zeile ${index + 1}: Unbekannte Themenrubrik „${heading[1]}“.`);
      if (found.has(definition.id)) throw new Error(`Zeile ${index + 1}: Rubrik „${heading[1]}“ ist doppelt.`);
      current = { ...definition, rows: [], headingLine: index + 1 };
      found.set(definition.id, current);
      continue;
    }
    if (!current || !line.trim().startsWith("|")) continue;
    const cells = line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length !== 2) throw new Error(`Zeile ${index + 1}: Beschädigte oder zusammengeführte Tabellenzeile.`);
    if (cells[0] === "Deutsch" && cells[1] === "Türkisch") continue;
    if (/^-+$/.test(cells[0]) && /^-+$/.test(cells[1])) continue;
    if (!cells[0] || !cells[1]) throw new Error(`Zeile ${index + 1}: Leerer deutscher oder türkischer Begriff.`);
    current.rows.push({ german: cells[0], turkish: cells[1], line: index + 1 });
  }
  for (const topic of TOPICS) {
    if (!found.has(topic.id)) throw new Error(`Themenrubrik „${topic.title}“ fehlt.`);
    if (!found.get(topic.id).rows.length) throw new Error(`Themenrubrik „${topic.title}“ enthält keine Einträge.`);
  }
  return TOPICS.map((definition) => {
    const parsed = found.get(definition.id);
    return {
      ...definition,
      vocabulary: parsed.rows.map((row, index) => ({
        id: `thema-${definition.id}-${String(index + 1).padStart(3, "0")}`,
        sourceType: "topic", topicId: definition.id, topicTitle: definition.title,
        german: [row.german], turkish: row.turkish, active: true,
        pronunciation: "", additionalMeanings: [], partOfSpeech: "", category: definition.title,
        notes: "", examples: [], source: { file: sourceFile, line: row.line, originalGerman: row.german }
      }))
    };
  });
}

export function mergeTopics(baseData, topics) {
  const chapters = baseData.vocabulary.filter((item) => (item.sourceType || "chapter") === "chapter")
    .map((item) => ({ ...item, sourceType: "chapter" }));
  return {
    ...baseData, schemaVersion: 2, contentVersion: "2026.08.01",
    topics: topics.map(({ id, title, vocabulary }) => ({ id, title, count: vocabulary.length })),
    vocabulary: [...chapters, ...topics.flatMap((topic) => topic.vocabulary)]
  };
}

function run() {
  const source = process.argv[2] || "C:/Users/apple/Downloads/THEMENWORTSCHATZ_TUERKISCH.md";
  const baseFile = process.argv[3] || "data/vocabulary.json";
  const markdown = fs.readFileSync(source, "utf8");
  const topics = parseTopics(markdown, path.basename(source));
  const base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
  const output = mergeTopics(base, topics);
  fs.mkdirSync("data/topics", { recursive: true });
  fs.mkdirSync("data/source", { recursive: true });
  fs.writeFileSync("data/source/THEMENWORTSCHATZ_TUERKISCH.md", markdown, "utf8");
  for (const topic of topics) fs.writeFileSync(`data/topics/${topic.id}.json`, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
  fs.writeFileSync(baseFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(baseFile.replace(/\.json$/i, ".js"), `// Automatisch erzeugter Offline-Wortschatz.\nexport default ${JSON.stringify(output, null, 2)};\n`, "utf8");
  const total = topics.reduce((sum, topic) => sum + topic.vocabulary.length, 0);
  console.log(topics.map((topic) => `${topic.title}: ${topic.vocabulary.length}`).join("\n"));
  console.log(`Gesamt: ${total} Themenvokabeln; gemeinsamer Bestand: ${output.vocabulary.length}.`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1)));
if (invoked) run();
