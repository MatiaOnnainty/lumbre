// Ejecutar con: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import * as lib from "../js/lib.js";

test("toUrl: distingue direcciones de búsquedas", () => {
  assert.equal(lib.toUrl("github.com"), "https://github.com");
  assert.equal(lib.toUrl("nuxt.com/docs/getting-started"), "https://nuxt.com/docs/getting-started");
  assert.equal(lib.toUrl("localhost:5173"), "http://localhost:5173");
  assert.equal(lib.toUrl("127.0.0.1:8080/api"), "http://127.0.0.1:8080/api");
  assert.equal(lib.toUrl("192.168.0.10"), "http://192.168.0.10");
  assert.equal(lib.toUrl("https://example.org/a?b=1"), "https://example.org/a?b=1");
  assert.equal(lib.toUrl("vue composition api"), null);
  assert.equal(lib.toUrl("nuxt"), null);
  assert.equal(lib.toUrl("v1.2"), null);
  assert.equal(lib.toUrl("   "), null);
});

test("sameUrl ignora protocolo, www, hash y barra final", () => {
  assert.ok(lib.sameUrl("https://www.github.com/", "http://github.com"));
  assert.ok(lib.sameUrl("https://x.com/a/#top", "https://x.com/a"));
  assert.ok(!lib.sameUrl("https://x.com/a", "https://x.com/b"));
});

test("hostOf y letterOf", () => {
  assert.equal(lib.hostOf("https://www.example.com/portal"), "example.com");
  assert.equal(lib.hostOf("no es url"), "");
  assert.equal(lib.letterOf("  ¡Ñandú!"), "Ñ");
  assert.equal(lib.letterOf(""), "·");
});

test("greeting por hora", () => {
  assert.equal(lib.greeting(8), "Buenos días");
  assert.equal(lib.greeting(15), "Buenas tardes");
  assert.equal(lib.greeting(22), "Buenas noches");
  assert.equal(lib.greeting(3), "Buenas noches");
});

test("relativeTime", () => {
  const now = 1_000_000_000_000;
  assert.equal(lib.relativeTime(now - 10_000, now), "Hace un momento");
  assert.equal(lib.relativeTime(now - 12 * 60_000, now), "Hace 12 min");
  assert.equal(lib.relativeTime(now - 3 * 3_600_000, now), "Hace 3 h");
  assert.equal(lib.relativeTime(now - 26 * 3_600_000, now), "Ayer");
  assert.equal(lib.relativeTime(now - 5 * 86_400_000, now), "Hace 5 d");
});

test("matchTabs: todas las palabras y orden por título", () => {
  const tabs = [
    { title: "Docs de Nuxt", url: "https://nuxt.com/docs", lastAccessed: 1 },
    { title: "Nuxt UI", url: "https://ui.nuxt.com", lastAccessed: 2 },
    { title: "GitLab", url: "https://gitlab.example.com/nuxt-app", lastAccessed: 3 },
  ];
  assert.deepEqual(lib.matchTabs(tabs, "nuxt").map((t) => t.title), ["Nuxt UI", "Docs de Nuxt", "GitLab"]);
  assert.deepEqual(lib.matchTabs(tabs, "nuxt docs").map((t) => t.title), ["Docs de Nuxt"]);
  assert.deepEqual(lib.matchTabs(tabs, "   "), []);
});

test("parsePorts", () => {
  assert.deepEqual(lib.parsePorts("3000, 5173 8080;3000 abc 70000"), [3000, 5173, 8080]);
});

test("JSON", () => {
  assert.equal(lib.formatJson('{"a":1,"b":[1,2]}'), '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  assert.equal(lib.minifyJson('{ "a" : 1 }'), '{"a":1}');
  assert.throws(() => lib.formatJson("{a:1}"));
});

test("Base64 con UTF-8 y base64url", () => {
  const text = "Ñandú ✓ 🚀";
  assert.equal(lib.base64Decode(lib.base64Encode(text)), text);
  assert.equal(lib.base64Encode("hola"), "aG9sYQ==");
  assert.equal(lib.base64Decode("aG9sYQ"), "hola"); // sin padding
  // url-safe: "-" y "_" equivalen a "+" y "/"
  assert.equal(lib.base64Encode("~~~?"), "fn5+Pw==");
  assert.equal(lib.base64Decode("fn5-Pw"), "~~~?");
  assert.equal(lib.base64Encode("???"), "Pz8/");
  assert.equal(lib.base64Decode("Pz8_"), "???");
  // Bytes que no son UTF-8 válido: error en vez de texto basura
  assert.throws(() => lib.base64Decode("-_8"));
});

test("decodeJwt", () => {
  const enc = (o) => lib.base64Encode(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: "42", exp: 1 })}.firma`;
  const r = lib.decodeJwt(token);
  assert.equal(r.header.alg, "HS256");
  assert.equal(r.payload.sub, "42");
  assert.equal(r.expired, true);
  assert.equal(r.dates.exp.getTime(), 1000);
  assert.throws(() => lib.decodeJwt("nada"));
});

test("parseTimestamp: segundos, milisegundos y texto", () => {
  assert.equal(lib.parseTimestamp("1700000000").getTime(), 1_700_000_000_000);
  assert.equal(lib.parseTimestamp("1700000000000").getTime(), 1_700_000_000_000);
  assert.equal(lib.parseTimestamp("2023-11-14T22:13:20Z").getTime(), 1_700_000_000_000);
  assert.throws(() => lib.parseTimestamp("ayer a la tarde"));
  assert.equal(lib.describeTimestamp(new Date(1_700_000_000_000)).seconds, 1_700_000_000);
});

test("regexMatches con grupos y sin bucle en coincidencias vacías", () => {
  const r = lib.regexMatches("(\\d+)-(?<n>\\w)", "", "10-a 20-b");
  assert.equal(r.length, 2);
  assert.deepEqual(r[1].groups, ["20", "b"]);
  assert.equal(r[0].named.n, "a");
  assert.equal(lib.regexMatches("x*", "", "abc").length, 4);
  assert.throws(() => lib.regexMatches("(", "", "a"));
});

test("colores: ida y vuelta entre formatos", () => {
  const c = lib.describeColor("#FFAA70");
  assert.equal(c.hex, "#ffaa70");
  assert.equal(c.rgbText, "rgb(255 170 112)");
  assert.equal(lib.describeColor(c.hslText).hex, "#ffaa70");
  assert.equal(lib.describeColor(c.oklchText).hex, "#ffaa70");
  assert.equal(lib.describeColor("#fff").oklchText, "oklch(100% 0 0)");
  assert.equal(lib.describeColor("rgb(0, 0, 0)").hex, "#000000");
  assert.equal(lib.describeColor("#ff000080").rgbText, "rgb(255 0 0 / 0.5)");
  assert.equal(lib.describeColor("hsl(0 100% 50% / 0.5)").hex, "#ff000080");
  assert.throws(() => lib.describeColor("rojo"));
});

test("iconTone: clasifica íconos oscuros, blancos y de color", () => {
  const px = (r, g, b, a) => [r, g, b, a];
  const dark = new Uint8ClampedArray([...px(0, 0, 0, 255), ...px(20, 20, 25, 255), ...px(10, 10, 10, 255), ...px(0, 0, 0, 255), ...px(255, 255, 255, 0)]);
  assert.equal(lib.iconTone(dark), "dark");
  const orange = new Uint8ClampedArray(Array.from({ length: 6 }, () => px(252, 109, 38, 255)).flat());
  assert.equal(lib.iconTone(orange), "color");
  const white = new Uint8ClampedArray([...Array.from({ length: 5 }, () => px(250, 250, 250, 255)).flat(), ...px(40, 200, 90, 255)]);
  assert.equal(lib.iconTone(white), "white");
  assert.equal(lib.iconTone(new Uint8ClampedArray(px(0, 0, 0, 0))), null);
});
