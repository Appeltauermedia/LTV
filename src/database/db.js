const DB_NAME = "lerne-tuerkisch", DB_VERSION = 2;
let dbPromise;
export function openDB() {
  if (!("indexedDB" in globalThis)) return Promise.reject(new Error("IndexedDB wird von diesem Browser nicht unterstützt."));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      if (!db.objectStoreNames.contains("daily")) db.createObjectStore("daily", { keyPath: "date" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Datenbankaktualisierung ist durch einen anderen Tab blockiert."));
  });
  return dbPromise;
}
async function transaction(store, mode, operation) {
  const database = await openDB();
  const tx = database.transaction(store, mode);
  const os = tx.objectStore(store);
  // Safari kann eine kurze readonly-Transaktion bereits abschließen, während
  // auf das einzelne Request-Ergebnis gewartet wird. Deshalb müssen die
  // Transaktions-Handler vor dem ersten await registriert sein.
  const completed = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("IndexedDB-Transaktion fehlgeschlagen."));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB-Transaktion wurde abgebrochen."));
  });
  const result = await operation(os);
  await completed;
  return result;
}
const request = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
export const db = {
  all: (store) => transaction(store, "readonly", (os) => request(os.getAll())),
  get: (store, key) => transaction(store, "readonly", (os) => request(os.get(key))),
  put: (store, value) => transaction(store, "readwrite", (os) => request(os.put(value))),
  delete: (store, key) => transaction(store, "readwrite", (os) => request(os.delete(key))),
  clear: (store) => transaction(store, "readwrite", (os) => request(os.clear())),
  bulkPut: (store, values) => transaction(store, "readwrite", async (os) => { for (const value of values) os.put(value); })
};
