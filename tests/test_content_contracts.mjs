import assert from "node:assert/strict";
import test from "node:test";

import {
  FLAVOR_MIN_MARGIN,
  RUN_LENGTH,
  SCIENTIST_IDS,
  SCIENTIST_SIGNATURE,
  STAT_IDS,
} from "../src/config.ts";
import { CORE_DECK, FLAVOR_POOL, SCIENTIST_SOURCE_NOTES } from "../src/content.ts";
import { LEAK_TERM_DENYLIST, validateContent } from "../src/content_validation.ts";
import { loadGameState } from "../src/storage.ts";

// ============================================================================
// Test a: release content satisfies all contracts
// ============================================================================
test("release content satisfies all contracts (validateContent returns empty)", () => {
  const issues = validateContent();
  assert.deepEqual(issues, []);
});

// ============================================================================
// Test b: core-deck structural floor
// ============================================================================
test("CORE_DECK has at least RUN_LENGTH cards (structural floor)", () => {
  assert.ok(CORE_DECK.length >= RUN_LENGTH, `CORE_DECK has only ${CORE_DECK.length} cards`);
});

test("every stat is probed by at least 2 core cards", () => {
  for (const stat of STAT_IDS) {
    const count = CORE_DECK.filter((card) => card.probes.includes(stat)).length;
    assert.ok(count >= 2, `stat "${stat}" is probed by only ${count} core card(s)`);
  }
});

// ============================================================================
// Test c: flavor pool covers every scientist
// ============================================================================
test("FLAVOR_POOL has at least one card for every scientist", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const cards = FLAVOR_POOL[scientistId];
    assert.ok(cards && cards.length > 0, `FLAVOR_POOL missing cards for "${scientistId}"`);
  }
});

// ============================================================================
// Test d: signature values in range and rationale non-empty
// ============================================================================
test("every scientist signature value is within [0, 100]", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const sig = SCIENTIST_SIGNATURE[scientistId];
    for (const stat of STAT_IDS) {
      const val = sig.values[stat];
      assert.ok(val >= 0 && val <= 100, `${scientistId} "${stat}" = ${val} out of [0,100]`);
    }
  }
});

test("every scientist signature has a non-empty rationale for each stat", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const sig = SCIENTIST_SIGNATURE[scientistId];
    for (const stat of STAT_IDS) {
      const rationale = sig.rationale[stat];
      assert.ok(
        rationale && rationale.trim().length > 0,
        `${scientistId} "${stat}" has empty rationale`,
      );
    }
  }
});

test("scientist signatures are pairwise distinct by at least FLAVOR_MIN_MARGIN", () => {
  const idList = [...SCIENTIST_IDS];
  for (let i = 0; i < idList.length; i++) {
    for (let j = i + 1; j < idList.length; j++) {
      const idA = idList[i];
      const idB = idList[j];
      let sumSq = 0;
      for (const stat of STAT_IDS) {
        const diff = SCIENTIST_SIGNATURE[idA].values[stat] - SCIENTIST_SIGNATURE[idB].values[stat];
        sumSq += diff * diff;
      }
      const dist = Math.sqrt(sumSq);
      assert.ok(
        dist >= FLAVOR_MIN_MARGIN,
        `signatures for "${idA}" and "${idB}" too close (dist ${dist.toFixed(2)} < ${FLAVOR_MIN_MARGIN})`,
      );
    }
  }
});

// ============================================================================
// Test e: leak-term denylist -- no core or flavor prompt contains a leak term
// ============================================================================
test("no CORE_DECK prompt contains a leak term (case-insensitive)", () => {
  for (const card of CORE_DECK) {
    const lower = card.prompt.toLowerCase();
    for (const term of LEAK_TERM_DENYLIST) {
      assert.ok(
        !lower.includes(term.toLowerCase()),
        `CORE_DECK card "${card.id}" prompt contains leak term "${term}"`,
      );
    }
  }
});

test("no FLAVOR_POOL prompt contains a leak term (case-insensitive)", () => {
  for (const scientistId of SCIENTIST_IDS) {
    for (const card of FLAVOR_POOL[scientistId]) {
      const lower = card.prompt.toLowerCase();
      for (const term of LEAK_TERM_DENYLIST) {
        assert.ok(
          !lower.includes(term.toLowerCase()),
          `FLAVOR_POOL card "${card.id}" (${scientistId}) prompt contains leak term "${term}"`,
        );
      }
    }
  }
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
