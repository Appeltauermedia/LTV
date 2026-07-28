(function () {
  if (location.protocol !== "file:") return;
  document.addEventListener("DOMContentLoaded", function () {
    var app = document.getElementById("app");
    if (!app) return;
    app.innerHTML =
      '<main class="fatal">' +
      '<h1>Bitte nicht per Doppelklick öffnen</h1>' +
      '<p>Diese Progressive Web App benötigt eine HTTP- oder HTTPS-Adresse. ' +
      'Der Browser blockiert App-Dateien über <code>file://</code>.</p>' +
      '<p>Unter Windows bitte <strong>STARTEN.cmd</strong> im Projektordner ausführen.</p>' +
      '</main>';
  });
})();
