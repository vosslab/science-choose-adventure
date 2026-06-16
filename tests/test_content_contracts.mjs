import assert from "node:assert/strict";
import test from "node:test";

import { SCIENTIST_IDS } from "../src/config.ts";
import { SCIENTIST_SOURCE_NOTES } from "../src/content.ts";
import { validateContent } from "../src/content_validation.ts";
import { loadGameState } from "../src/storage.ts";

// ============================================================================
// Test a: release content satisfies all contracts
// ============================================================================
test("release content satisfies all contracts (validateContent returns empty)", () => {
  const issues = validateContent();
  assert.deepEqual(issues, []);
});

// ============================================================================
// Test f: source notes have https URLs for every scientist
// ============================================================================
test("SCIENTIST_SOURCE_NOTES has https URLs for every scientist", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const notes = SCIENTIST_SOURCE_NOTES[scientistId];
    assert.ok(notes && notes.length > 0, `no source notes for "${scientistId}"`);
    for (const note of notes) {
      assert.ok(
        note.url.startsWith("https://"),
        `${scientistId} source note URL is not https: "${note.url}"`,
      );
    }
  }
});

// ============================================================================
// Test g: malformed / old-save resilience in loadGameState
// ============================================================================

// Minimal in-memory Storage shim (mirrors the browser localStorage API shape).
function makeStorage(initial) {
  const store = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

test("loadGameState returns a fresh run state from empty storage without throwing", () => {
  const storage = makeStorage();
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});

test("loadGameState returns a fresh run state from garbage JSON without throwing", () => {
  const storage = makeStorage({ "science_career_survival:v2": "{{not valid json}}" });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});

test("loadGameState returns a fresh run state from a v1-shape blob without throwing", () => {
  const v1Blob = JSON.stringify({
    version: 1,
    state: { phase: "prologue", routeScores: {}, cards: [] },
  });
  const storage = makeStorage({ "science_career_survival:v2": v1Blob });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});
