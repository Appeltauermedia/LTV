# Testplan

## Automatisiert

`npm test` prüft Datenvalidierung, 45 Kapitel, 718 Datensätze, IDs, Sonderzeichen, exakte und tolerante Auswertung, Tippfehler, mehrere Übersetzungen, Wiederholungsstufen, Klickschutz, Fälligkeit, Export, Import, Migrationstauglichkeit, Kapitelwahl, Filtergrundlage, Suche und Fortschrittsberechnung. `npm run check` ergänzt Datenprüfung und Produktions-Build.

## Manuelle Abnahme

- iPhone Safari: Hoch-/Querformat, Teilen → Zum Home-Bildschirm, Standalone-Start, Flugmodus-Start
- iPad Safari: beide Orientierungen und Zweispaltenlayout
- Android Chrome: Installationsdialog, Standalone- und Offline-Start, Bildschirmtastatur
- Windows: Chrome, Edge und Firefox; Maus und ausschließlich Tastatur
- macOS: Safari und Chrome
- alle: Dunkelmodus, Systemmodus, große Schrift, sichtbarer Fokus, Screenreader-Namen
- Lernmodi: jede Richtung, Sonderzeichentasten an Cursorposition, mehrere Übersetzungen, fast richtig
- Speicherung: Browser schließen/öffnen, Export/Import, ungültige Datei, Reset-Abbruch
- Update: vorhandener Lernstand und laufende Runde bleiben bis zur Nutzeraktion unberührt

## Abnahmekriterien

`npm run check` ist grün, Build startet über HTTPS/localhost, Manifest ist installierbar, nach einmaligem Laden funktioniert eine vollständige Runde im Offline-Modus, und IndexedDB bleibt nach Service-Worker-Aktualisierung unverändert.
# Abnahme Themenwortschatz

Automatisiert werden Markdown-Parsing, elf Rubriken, 250 Zeilen, feste IDs, ID-Eindeutigkeit, Originalzeichen, Themen-/Kapitel-Filter, kombinierte Auswahl, Suche, Wiederholungsmodell sowie Backup-Version 1 und 2 geprüft. `npm run check` führt Datenvalidierung, Tests und Produktions-Build aus.

Manuell auf Smartphone und Desktop prüfen: Themenkarten und Mehrfachauswahl; Tiere Türkisch→Deutsch; Kleidung+Farben als Multiple Choice; Kapitel 1+Lebensmittel kombiniert; gespeicherten Themenfortschritt nach Neustart; Export, Reset in Testumgebung und Import; Quellensuche; installierte App offline starten. Kleine Displays dürfen keine horizontale Tabelle benötigen.
