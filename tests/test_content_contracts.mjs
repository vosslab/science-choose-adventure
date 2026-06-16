import assert from "node:assert/strict";
import test from "node:test";

import { SCIENTIST_IDS, STAT_CONFIG } from "../src/config.ts";
import { PROLOGUE_CARDS, SCIENTIST_PATHS } from "../src/content.ts";
import { validateContent } from "../src/content_validation.ts";

test("release content satisfies the launch floor", () => {
  assert.deepEqual(validateContent(), []);
});

test("all core scientist paths are playable and source grounded", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const path = SCIENTIST_PATHS[scientistId];
    assert.ok(
      path.cards.some((card) => card.prompt.length > 30),
      scientistId,
    );
    assert.ok(
      path.sourceNotes.every((note) => note.url.startsWith("https://")),
      scientistId,
    );
  }
});

test("prologue routes to every core path without locking core paths", () => {
  const routeTargets = PROLOGUE_CARDS.flatMap((card) =>
    card.choices.map((choice) => choice.routeTo),
  );
  for (const scientistId of SCIENTIST_IDS) {
    assert.ok(routeTargets.includes(scientistId), scientistId);
  }
});

test("high care collapse wording frames protective caution accurately", () => {
  assert.match(STAT_CONFIG.care.highCollapse, /Protective caution/);
  assert.match(STAT_CONFIG.care.highCollapse, /prevents the difficult commitment/);
});
