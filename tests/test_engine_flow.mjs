import assert from "node:assert/strict";
import test from "node:test";

import { SCIENTIST_IDS } from "../src/config.ts";
import { choose, createInitialState, currentVisibleCard } from "../src/engine.ts";

function runPrologueWith(choiceIndex) {
  let state = createInitialState();
  while (state.phase === "prologue") {
    state = choose(state, choiceIndex);
  }
  return state;
}

test("career sorting reaches a scientist path", () => {
  const state = runPrologueWith(0);
  assert.equal(state.phase, "path");
  assert.ok(SCIENTIST_IDS.includes(state.scientistId));
});

test("visible choices expose magnitude text state without exact stat values", () => {
  const initialState = createInitialState();
  const nextState = choose(initialState, 0);
  const card = currentVisibleCard(nextState);
  assert.equal(nextState.lastEffectMagnitude, "Small");
  assert.notDeepEqual(card.kind, "ending");
});

test("restart behavior is represented by choosing from an ending", () => {
  let state = runPrologueWith(1);
  while (state.phase === "path") {
    state = choose(state, 1);
  }
  assert.equal(state.phase, "ending");
  const restarted = choose(state, 0);
  assert.equal(restarted.phase, "prologue");
});
