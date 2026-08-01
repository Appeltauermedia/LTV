import test from "node:test";
import assert from "node:assert/strict";
import { createExport, validateImport } from "../src/storage/backup.js";

test("Export besitzt Typ, Version und vollständige Bereiche", () => {
  const x=createExport([{id:"k01-v001",level:1}],[],[]);
  assert.equal(x.type,"tuerkisch-lernstand");assert.equal(x.version,2);assert.equal(x.schemaVersion,2);assert.ok(x.exportedAt);
});
test("gültiger Import wird akzeptiert", () => {
  const x=createExport([{id:"k01-v001",level:1}],[],[]);
  assert.equal(validateImport(x,new Set(["k01-v001"])).valid,true);
});
test("unbekannte IDs, Version und beschädigte Struktur werden abgelehnt", () => {
  const x={type:"tuerkisch-lernstand",version:99,progress:[{id:"nix",level:9}]};
  const result=validateImport(x,new Set());assert.equal(result.valid,false);assert.ok(result.errors.length>=2);assert.equal(result.warnings.length,1);
});
test("alte Exporte bleiben importierbar und unbekannte IDs werden nur gemeldet",()=>{const x={type:"tuerkisch-lernstand",version:1,progress:[{id:"k01-v001",level:1},{id:"alt",level:2}],meta:[],daily:[]};const result=validateImport(x,new Set(["k01-v001"]));assert.equal(result.valid,true);assert.equal(result.warnings.length,1);assert.deepEqual(result.data.progress.map(p=>p.id),["k01-v001"]);});
