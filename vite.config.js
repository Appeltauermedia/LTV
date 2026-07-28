import { defineConfig } from "vite";

export default defineConfig({
  // Die aktuell verwendete Veröffentlichung liegt an der Domainwurzel.
  // Ein expliziter Root-Pfad verhindert gemischte relative Asset-URLs.
  base: "/"
});
