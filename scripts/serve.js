import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const root = path.resolve(fs.existsSync("dist/index.html") ? "dist" : ".");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let file = path.resolve(root, `.${urlPath === "/" ? "/index.html" : urlPath}`);
  if (!file.startsWith(root)) return send(response, 403, "Zugriff verweigert");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  fs.readFile(file, (error, content) => {
    if (error) return send(response, 500, "Datei konnte nicht gelesen werden.");
    response.writeHead(200, {
      "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": file.endsWith("service-worker.js") ? "no-cache" : "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(content);
  });
});

server.listen(port, "0.0.0.0", () => {
  const local = `http://localhost:${port}`;
  console.log(`\nTürkisch-Vokabeltrainer läuft:\n${local}`);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) console.log(`http://${address.address}:${port}`);
    }
  }
  console.log("\nZum Beenden Strg+C drücken.");
  if (process.platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", local], { detached: true, stdio: "ignore" });
    child.unref();
  }
});

function send(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}
