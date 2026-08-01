# Anforderungen

## Produktumfang

Die Anwendung verarbeitet alle 45 Kapitel des gelieferten Extrakts, läuft mobile-first und erweitert sich ab Tablet- beziehungsweise Desktopbreite zu Mehrspaltenansichten. Sie ist ohne Konto, Tracking, Werbung, Cloud oder Serverlogik statisch hostbar.

## Funktionen

- Startseite mit Cover, Tagesziel, Lernserie, Fortschritt und Schnellstart
- Kapitelwahl: einzeln, mehrfach, alle, invertiert, zurückgesetzt und zusammenhängender Bereich
- Kapitel- und Lernstatussuche sowie globale Vokabelsuche
- Lernrichtungen Türkisch–Deutsch, Deutsch–Türkisch und gemischt
- Karteikarten, Multiple Choice, Texteingabe, Selbstbewertung, Fehlerwiederholung und fällige Wiederholungen
- Favoriten, schwierige Wörter, Tageswerte, Kapitel- und Gesamtfortschritt
- versionierter IndexedDB-Lernstand, JSON-Export, validierter Import und bestätigtes Zurücksetzen
- Hell-, Dunkel- und Systemmodus, große Schrift, Tastatur- und Touchbedienung
- installierbare, offline-fähige PWA mit Android-Dialog und korrekter iOS-Anleitung

## Qualitätsanforderungen

Die App verwendet semantisches HTML, sichtbare Fokuszustände, Sprachkennzeichnungen, ausreichende Touchziele, `prefers-reduced-motion`, Safe Areas und verständliche Fehlertexte. Vokabeldaten werden niemals als HTML ausgeführt. Externe Ressourcen und Tracker sind nicht enthalten.
# Erweiterung Themenwortschatz (2026-08-01)

- Die 45 Kapitel bleiben unverändert erhalten.
- Elf Themenrubriken mit insgesamt 250 Einträgen sind eigenständige Datenquellen.
- Mehrfachauswahl, kombinierte Lernrunden, alle Lernmodi und Statusfilter gelten für beide Quellen.
- Themenfortschritt wird anhand stabiler `thema-<topicId>-NNN`-IDs lokal gespeichert.
- Globale Suche und Statistik können nach Quelle bzw. Rubrik gefiltert werden.
- Alte Lernstandexporte der Version 1 bleiben importierbar.
