import fs from "node:fs";
import path from "node:path";

export const FREQUENCY_COLLECTION = Object.freeze({
  id: "haeufigste-2000",
  title: "2.000 gebräuchlichste Vokabeln",
  description: "Alphabetischer Grundwortschatz mit ursprünglichem Häufigkeitsrang"
});

export function parseFrequencyVocabulary(markdown, sourceFile = "2000_GEBRAEUCHLICHE_TUERKISCHE_VOKABELN_ALPHABETISCH.md") {
  if (markdown.includes("\uFFFD")) throw new Error("Quelldatei enthält ungültige UTF-8-Ersatzzeichen.");
  const rows = [];
  for (const [lineIndex, line] of markdown.split(/\r?\n/).entries()) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.trim().slice(1, -1).split("|").map(cell => cell.trim());
    if (cells.length !== 4) throw new Error(`Zeile ${lineIndex + 1}: Beschädigte Tabellenzeile.`);
    const alphabeticalIndex = Number(cells[0]);
    const frequencyRank = Number(cells[3]);
    if (!Number.isInteger(alphabeticalIndex) || !Number.isInteger(frequencyRank)) throw new Error(`Zeile ${lineIndex + 1}: Nummer oder Häufigkeitsrang ist ungültig.`);
    if (!cells[1] || !cells[2]) throw new Error(`Zeile ${lineIndex + 1}: Türkischer oder deutscher Begriff fehlt.`);
    rows.push({ alphabeticalIndex, turkish: cells[1], originalGerman: cells[2], frequencyRank, line: lineIndex + 1 });
  }
  if (rows.length !== 2000) throw new Error(`Erwartet wurden 2.000 Vokabeln, gefunden wurden ${rows.length}.`);
  const alphabeticalIndexes = new Set(rows.map(row => row.alphabeticalIndex));
  const ranks = new Set(rows.map(row => row.frequencyRank));
  const turkish = new Set(rows.map(row => row.turkish.toLocaleLowerCase("tr")));
  if (alphabeticalIndexes.size !== 2000 || Math.min(...alphabeticalIndexes) !== 1 || Math.max(...alphabeticalIndexes) !== 2000) throw new Error("Alphabetische Nummern sind unvollständig oder doppelt.");
  if (ranks.size !== 2000 || Math.min(...ranks) !== 1 || Math.max(...ranks) !== 2000) throw new Error("Häufigkeitsränge sind unvollständig oder doppelt.");
  if (turkish.size !== 2000) throw new Error("Türkische Begriffe sind nicht eindeutig.");
  return rows.map(row => ({
    id: `freq-${String(row.frequencyRank).padStart(4, "0")}`,
    sourceType: "frequency",
    collectionId: FREQUENCY_COLLECTION.id,
    collectionTitle: FREQUENCY_COLLECTION.title,
    alphabeticalIndex: row.alphabeticalIndex,
    frequencyRank: row.frequencyRank,
    german: row.originalGerman.split(";").map(value => value.trim()).filter(Boolean),
    turkish: row.turkish,
    active: true,
    pronunciation: "", additionalMeanings: [], partOfSpeech: "", category: FREQUENCY_COLLECTION.title,
    notes: "", examples: [],
    source: { file: sourceFile, line: row.line, originalGerman: row.originalGerman }
  }));
}

export function mergeFrequencyVocabulary(baseData, vocabulary) {
  const existing = baseData.vocabulary.filter(item => item.sourceType !== "frequency");
  const collections = (baseData.collections || []).filter(item => item.id !== FREQUENCY_COLLECTION.id);
  return {
    ...baseData,
    contentVersion: "2026.08.29",
    collections: [...collections, { ...FREQUENCY_COLLECTION, count: vocabulary.length }],
    vocabulary: [...existing, ...vocabulary]
  };
}

function run() {
  const source = process.argv[2] || "C:/Users/apple/Downloads/2000_GEBRAEUCHLICHE_TUERKISCHE_VOKABELN_ALPHABETISCH.md";
  const destination = process.argv[3] || "data/vocabulary.json";
  const markdown = fs.readFileSync(source, "utf8");
  const vocabulary = parseFrequencyVocabulary(markdown, path.basename(source));
  const base = JSON.parse(fs.readFileSync(destination, "utf8"));
  const output = mergeFrequencyVocabulary(base, vocabulary);
  fs.mkdirSync("data/source", { recursive: true });
  fs.writeFileSync(`data/source/${path.basename(source)}`, markdown, "utf8");
  fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(destination.replace(/\.json$/i, ".js"), `// Automatisch erzeugter Offline-Wortschatz.\nexport default ${JSON.stringify(output, null, 2)};\n`, "utf8");
  console.log(`${vocabulary.length} Vokabeln als Rubrik „${FREQUENCY_COLLECTION.title}“ importiert; gemeinsamer Bestand: ${output.vocabulary.length}.`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)));
if (invoked) run();
