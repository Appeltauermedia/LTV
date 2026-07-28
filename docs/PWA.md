# Progressive Web App

Manifest, Symbole, Cover, das vorläufige Istanbul-Hintergrundbild, Oberfläche und gesamter Wortschatz werden lokal ausgeliefert. Nach dem ersten vollständigen Laden ist eine Lernrunde offline möglich. Installation und Service Worker benötigen HTTPS; `localhost` ist die Browser-Ausnahme.

Android nutzt `beforeinstallprompt` ausschließlich nach Tippen auf „App installieren“. iPhone/iPad erhalten eine Safari-Anleitung für Teilen → Zum Home-Bildschirm. Im Standalone-Modus wird die Hilfe nicht automatisch gezeigt.

Bei einem neuen Build lädt der Browser neue Dateien im Hintergrund. Der Cache trägt die App-Version. Die IndexedDB-Stores sind davon unabhängig und bleiben erhalten.

Über eine unverschlüsselte LAN-Adresse (`http://192.168…`) funktioniert die normale App einschließlich IndexedDB-Lernstand, aber der Browser erlaubt dort keinen Service Worker. Installation, automatischer Offline-Start und PWA-Updates stehen erst über HTTPS zur Verfügung. `http://localhost` ist nur auf demselben Gerät eine Browser-Ausnahme.
