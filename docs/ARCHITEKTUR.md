# Architektur

## Entscheidung

Die App nutzt modernes, modulares Vanilla JavaScript und Vite ausschließlich als Build-Werkzeug. Ein UI-Framework wäre bei dieser lokal arbeitenden Anwendung zusätzliche Laufzeitlast ohne funktionalen Nutzen. Der Build besteht aus statischen Dateien und funktioniert auf HTTPS-Webspace und GitHub Pages.

## Komponenten und Datenfluss

`data/vocabulary.json` enthält den erzeugten Wortschatz; `data/chapter-titles.json` enthält die unabhängig pflegbaren redaktionellen Kapitelbezeichnungen. `src/main.js` rendert Ansichten und Sitzungen; `src/learning` enthält den unabhängig getesteten Algorithmus; `src/database` kapselt IndexedDB; `src/storage` validiert Sicherungen; `src/utils` normalisiert Eingaben und Suche.

Vokabeldaten werden nur gelesen. Personenbezogene Lernereignisse verbleiben in drei IndexedDB-Stores:

- `progress`: stabil per Vokabel-ID adressierter Einzelstand
- `daily`: aggregierte Lerntage
- `meta`: Einstellungen, letzte Auswahl und letzter Modus

Unbekannte IDs werden beim Laden ignoriert, beim Import jedoch als Fehler gemeldet. Dadurch sind Datenupdates robust, ohne beschädigte Sicherungen still zu übernehmen.

## Wiederholungsalgorithmus

Es gibt die Stufen 1 bis 5 mit 0, 1, 3, 7 und 21 Tagen Intervall. Falsch setzt zwei Stufen zurück, mindestens auf Stufe 1. Unsicher/teilweise hält die Stufe. Richtig/sehr sicher erhöht regulär um eine Stufe. Positive Bewertungen innerhalb von 45 Sekunden erhöhen die Stufe nicht erneut und verhindern schnelles Hochklicken. Stufe 5 gilt als gelernt.

## Offline und Updates

Der Service Worker verwendet für die Navigation Network-first mit Offline-Fallback und für versionierte statische Ressourcen Cache-first mit Netzergänzung. Neue Builds erhalten einen neuen Cache-Namen, werden im Hintergrund installiert und ersetzen alte App-Caches beim Aktivieren. IndexedDB wird nicht gecacht und deshalb nie durch Cachewechsel gelöscht. Schemaänderungen erfolgen über erhöhte `DB_VERSION` und `onupgradeneeded`.

Eine laufende Runde wird nicht automatisch neu geladen. Der Nutzer erhält zunächst eine Meldung; die Aktivierung kann nach der Runde erfolgen.
# Themenintegration

`data/vocabulary.json` ist der gemeinsame, offline gebündelte Datenbestand. `sourceType` unterscheidet `chapter` und `topic`. Themen besitzen `topicId` und `topicTitle`; Kapitel behalten Nummer und Titel. Die UI sowie die Lernpipeline filtern ausschließlich diesen gemeinsamen Pool, sodass kein zweiter Trainer und keine parallele Lernlogik entsteht.

IndexedDB wurde ohne Store-Löschung auf Version 3 angehoben. Der vorhandene `progress`-Store ist ID-basiert und nimmt Themen-IDs ohne Strukturänderung auf; bestehende Kapitelstände bleiben erhalten.
