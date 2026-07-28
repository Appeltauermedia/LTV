# Lerne Türkisch – Vokabeltrainer

Produktionsfähige, mobile-first Progressive Web App mit 45 Kapiteln und 718 Vokabeleinträgen aus dem bereitgestellten Extrakt. Das bereitgestellte Istanbul-Aquarell wird lokal als vorläufiges Hintergrundmotiv ausgeliefert. Alle Lern- und Nutzungsdaten bleiben lokal in IndexedDB. Es gibt keine Konten, Cloud, Werbung, Analyse oder extern geladene Ressourcen.

## Voraussetzungen und Start

- Node.js 20 oder neuer
- Unter Windows für den lokalen Ein-Klick-Start: `STARTEN.cmd`
- `npm install`
- `npm run dev` für Entwicklung
- `npm test` für automatisierte Tests
- `npm run build` für den Produktions-Build
- `npm run preview` für die lokale Build-Vorschau
- `npm run check` für die vollständige Abnahme

Die Vorschau unter der angezeigten `http://localhost`-Adresse öffnen. Service Worker funktionieren lokal auf `localhost`, in Produktion ausschließlich über HTTPS.

`index.html` darf nicht per Doppelklick als `file://` geöffnet werden. Browser blockieren dort Manifest, JavaScript-Module, IndexedDB-Kontexte und Service Worker. `STARTEN.cmd` startet stattdessen einen lokalen Webserver und öffnet die korrekte Adresse automatisch.

## Vokabeldaten aktualisieren

Der Programmcode und die Daten sind getrennt. Die Quelldatei wird mit `node scripts/build-vocabulary.js "PFAD/ZUR/DATEI.md"` neu eingelesen. Anschließend `npm run data:validate` ausführen und `docs/DATENPRUEFBERICHT.md` kontrollieren. Das Skript verändert keine Originaldatei.

## Veröffentlichung

`npm run check` ausführen und anschließend den Inhalt von `dist/` auf einen HTTPS-Webspace hochladen. Details für normalen Webspace, GitHub Pages, Updates und Rollback stehen in [docs/VERÖFFENTLICHUNG.md](docs/VERÖFFENTLICHUNG.md).

Weitere Dokumente: [Anforderungen](docs/ANFORDERUNGEN.md), [Architektur](docs/ARCHITEKTUR.md), [Datenformat](docs/DATENFORMAT.md), [PWA](docs/PWA.md) und [Testplan](docs/TESTPLAN.md).
