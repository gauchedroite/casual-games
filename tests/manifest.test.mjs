import test from "node:test";
import assert from "node:assert/strict";
import { validateGames } from "../manifest.js";

const base = "https://example.test/launcher/index.html";
const game = { id: "prototype", title: "Jeu prototype", entryPoint: "games/prototype/index.html" };

test("relative game URLs work in a subdirectory and empty catalogs are valid", () => {
  assert.deepEqual(validateGames({ games: [game] }, base), [{
    ...game, entryPoint: "https://example.test/launcher/games/prototype/index.html", hidden: false,
  }]);
  assert.deepEqual(validateGames({ games: [] }, base), []);
});

test("malformed catalogs, duplicate IDs and missing titles are rejected", () => {
  for (const manifest of [null, [], {}, { games: null }, { games: [null] },
    { games: [game, game] }, { games: [{ ...game, id: "Prototype" }] },
    { games: [{ ...game, title: " " }] }, { games: [{ ...game, entryPoint: null }] }]) {
    assert.throws(() => validateGames(manifest, base));
  }
});

test("hidden is an optional boolean game setting", () => {
  assert.equal(validateGames({ games: [{ ...game, hidden: true }] }, base)[0].hidden, true);
  assert.equal(validateGames({ games: [game] }, base)[0].hidden, false);
  assert.throws(() => validateGames({ games: [{ ...game, hidden: "true" }] }, base));
});

test("entry points cannot leave their same-origin game directory", () => {
  for (const entryPoint of ["https://evil.test/index.html", "//evil.test/index.html", "/index.html",
    "javascript:alert(1)", "games/prototype/../other/index.html", "games/prototype/../../index.html",
    "games/prototype/%2e%2e/other/index.html", "games/prototype/..\\other/index.html",
    "games/other/index.html", "games/prototype/%2f..%2fother/index.html"]) {
    assert.throws(() => validateGames({ games: [{ ...game, entryPoint }] }, base));
  }
});
