# Veröffentlichung

## Normaler Webspace

1. `npm ci`
2. `npm run check`
3. Inhalt von `dist/` unverändert in ein HTTPS-Verzeichnis hochladen.
4. MIME-Typen für `.webmanifest`, JavaScript, JSON, SVG und PNG prüfen.
5. Sicherheitsheader aus `public/_headers` beim Hoster konfigurieren.

## GitHub Pages

Für dieses Repository ist der Vite-Basispfad fest auf `/LTV/` gesetzt. Der Workflow `.github/workflows/deploy-pages.yml` validiert Daten, führt Tests aus, erstellt `dist/` und veröffentlicht ausschließlich dieses Build-Artefakt über GitHub Pages. In den Repository-Einstellungen muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** gewählt sein. Pages stellt anschließend HTTPS bereit.

## Versionswechsel

App-Version in `package.json`, `src/main.js` und Cache-Version in `public/service-worker.js` anheben. Danach Build und Offline-Test ausführen. Eine frühere Version wird durch erneutes Veröffentlichen ihres `dist/`-Artefakts wiederhergestellt. Vor Datenbank-Schemaänderungen Export testen und `DB_VERSION` mit einer nicht destruktiven Migration erhöhen.

Version 1.0.1 behebt einen browserabhängigen IndexedDB-Start-Deadlock aus Version 1.0.0. Beim Austausch von 1.0.0 muss stets der vollständige neue `dist/`-Inhalt veröffentlicht werden.

Das finale Cover ersetzt `public/images/book-cover-placeholder.svg`; Dateiname entweder beibehalten oder Referenz und Service-Worker-Liste gemeinsam ändern.
