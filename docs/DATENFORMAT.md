# Datenformat

## Wartungsentscheidung

Alle 718 Einträge liegen in einer Gesamtdatenbank `data/vocabulary.json`. Bei 45 Kapiteln und dieser Dateigröße erleichtert das Suche, Offline-Vorladung und atomare Validierung. Änderungen am Wortschatz benötigen keine Änderung am Programmcode: Markdown austauschen, `npm run data:build` und anschließend `npm run data:validate` ausführen.

## Wurzel

Pflichtfelder sind `schemaVersion`, `contentVersion`, `chapters` und `vocabulary`. UTF-8 ist verbindlich.

## Vokabeleintrag

Pflicht: `id`, `chapter`, `chapterTitle`, `turkish`, `german` als nicht leeres Array und `active`. Optional: `additionalMeanings`, `pronunciation`, `partOfSpeech`, `category`, `notes`, `examples`.

IDs folgen `kNN-vNNN`. Sie werden aus Kapitel und unveränderter Quellreihenfolge gebildet. Bestehende Zeilen dürfen deshalb nicht umsortiert werden; neue Zeilen werden am Kapitelende ergänzt oder erhalten redaktionell eine explizite freie ID. Deutsche Texte, die im Extrakt durch ` / ` getrennt sind, werden als mehrere gültige Übersetzungen gespeichert. Der vollständige deutsche Originalwert bleibt unter `source.originalGerman` erhalten.

Der Extrakt liefert keine Kapiteltitel. Die separat bereitgestellte redaktionelle Titelliste wird deshalb in `data/chapter-titles.json` gepflegt und beim Daten-Build in die Kapiteldefinitionen und Vokabeleinträge übernommen.

## Validierung

Das Skript prüft Schema, IDs, Dubletten, Kapitel 1–45, Begriffe, Übersetzungen, Datentypen, Kapitelzuordnung und UTF-8-Ersatzzeichen. Auffälligkeiten stehen in `docs/DATENPRUEFBERICHT.md`; Originalwerte werden nicht automatisch korrigiert.
# Themenwortschatz und Import

Die Markdown-Quelle nutzt Überschriften der Ebene 2 sowie Tabellen mit `Deutsch` und `Türkisch`. `scripts/import-topics.js` akzeptiert nur die elf festgelegten Titel, übernimmt jede Datenzeile unverändert und erzeugt feste IDs in Quellreihenfolge, beispielsweise `thema-tiere-001`. Sortierung in Ansichten verändert diese IDs nicht.

Themenmetadaten stehen in `topics`; jeder Eintrag trägt `sourceType: "topic"`, `topicId`, `topicTitle`, `german`, `turkish` und `active`. Kapitel tragen ergänzend explizit `sourceType: "chapter"`. Doppelte Paare bleiben eigenständige Datensätze und werden nur im Prüfbericht gemeldet.

Lernstandexporte verwenden Schema/Version 2. Version-1-Dateien werden akzeptiert; unbekannte IDs werden gemeldet und übersprungen, während bekannte Einträge importiert werden.
