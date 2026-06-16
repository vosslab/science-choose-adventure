import {
  FLAVOR_MIN_MARGIN,
  SCIENTIST_IDS,
  SCIENTIST_SIGNATURE,
  STAT_IDS,
  type ScientistId,
  type StatId,
} from "./config";
import { CORE_DECK, FLAVOR_POOL, type CareerCard } from "./content";

export type ValidationIssue = {
  readonly code: string;
  readonly message: string;
};

// Terms whose presence in any core or flavor prompt (case-insensitive) would
// reveal a scientist's identity before the end-of-run reveal. Tests import
// this constant directly so the denylist stays a single source of truth.
export const LEAK_TERM_DENYLIST: readonly string[] = [
  "doudna",
  "franklin",
  "curie",
  "fleming",
  "kariko",
  "mrna",
  "radium",
  "polonium",
  "photo 51",
  "mold plate",
  "penicillin",
  "crispr",
];

// Minimum number of core cards for a 12-card pilot run with re-draw headroom.
const CORE_DECK_FLOOR = 18;

function issue(code: string, message: string): ValidationIssue {
  const validationIssue = { code, message };
  return validationIssue;
}

function includesStat(values: readonly StatId[], target: StatId): boolean {
  const found = values.includes(target);
  return found;
}

// Returns the set of StatIds touched by either choice's effects on a card.
function effectStats(card: (typeof CORE_DECK)[number]): StatId[] {
  const stats: StatId[] = [];
  for (const ch of card.choices) {
    for (const eff of ch.effects) {
      if (!stats.includes(eff.stat)) {
        stats.push(eff.stat);
      }
    }
  }
  return stats;
}

// Euclidean distance between two 4C value-vectors.
function euclideanDistance(a: Record<StatId, number>, b: Record<StatId, number>): number {
  let sumSq = 0;
  for (const stat of STAT_IDS) {
    const diff = a[stat] - b[stat];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

// All cards in play: core deck plus every scientist's flavor cards. Computed
// once at module load and reused by all checks that iterate the full card set.
const ALL_CARDS: readonly CareerCard[] = [
  ...CORE_DECK,
  ...Object.values(FLAVOR_POOL).flatMap((cards) => [...cards]),
];

// Check a: CORE_DECK must have at least CORE_DECK_FLOOR cards.
function checkCoreDeckSize(issues: ValidationIssue[]): void {
  if (CORE_DECK.length < CORE_DECK_FLOOR) {
    issues.push(
      issue(
        "core_deck_size",
        `CORE_DECK has ${CORE_DECK.length} cards; minimum is ${CORE_DECK_FLOOR}.`,
      ),
    );
  }
}

// Check b: every StatId must be probed by at least 2 core cards.
function checkStatCoverage(issues: ValidationIssue[]): void {
  for (const stat of STAT_IDS) {
    const count = CORE_DECK.filter((card) => card.probes.includes(stat)).length;
    if (count < 2) {
      issues.push(
        issue(
          "stat_coverage",
          `Stat "${stat}" is probed by only ${count} core card(s); minimum is 2.`,
        ),
      );
    }
  }
}

// Check c: for every card in CORE_DECK and FLAVOR_POOL, every probed stat must
// appear in the union of its two choices' effects (probe-subset-of-effects rule).
function checkProbeSubsetOfEffects(issues: ValidationIssue[]): void {
  const allCards = ALL_CARDS;
  for (const card of allCards) {
    const touched = effectStats(card);
    for (const probed of card.probes) {
      if (!touched.includes(probed)) {
        issues.push(
          issue(
            "probe_not_in_effects",
            `Card "${card.id}" probes stat "${probed}" but no choice affects it.`,
          ),
        );
      }
    }
  }
}

// Check d: every choice has >= 1 effect, and every effect.stat is a valid StatId.
function checkChoiceEffects(issues: ValidationIssue[]): void {
  const allCards = ALL_CARDS;
  for (const card of allCards) {
    for (const ch of card.choices) {
      if (ch.effects.length === 0) {
        issues.push(issue("choice_no_effects", `Card "${card.id}" has a choice with no effects.`));
      }
      for (const eff of ch.effects) {
        if (!includesStat(STAT_IDS, eff.stat)) {
          issues.push(
            issue(
              "invalid_effect_stat",
              `Card "${card.id}" references unknown stat "${eff.stat}".`,
            ),
          );
        }
      }
    }
  }
}

// Check e: FLAVOR_POOL must have at least one card for every ScientistId.
function checkFlavorPoolCoverage(issues: ValidationIssue[]): void {
  for (const scientistId of SCIENTIST_IDS) {
    const cards = FLAVOR_POOL[scientistId];
    // With noUncheckedIndexedAccess the lookup may return undefined even though
    // every ScientistId should be present by construction. Report the two
    // failure modes distinctly so callers can diagnose them separately.
    if (cards === undefined) {
      issues.push(
        issue("flavor_pool_missing", `FLAVOR_POOL has no entry for scientist "${scientistId}".`),
      );
    } else if (cards.length === 0) {
      issues.push(
        issue("flavor_pool_empty", `FLAVOR_POOL entry for scientist "${scientistId}" is empty.`),
      );
    }
  }
}

// Check f: SCIENTIST_SIGNATURE values in [0,100], rationale non-empty for all
// 4 Cs, and pairwise Euclidean distance >= FLAVOR_MIN_MARGIN.
function checkSignatures(issues: ValidationIssue[]): void {
  for (const scientistId of SCIENTIST_IDS) {
    const sig = SCIENTIST_SIGNATURE[scientistId];
    for (const stat of STAT_IDS) {
      const val = sig.values[stat];
      if (val < 0 || val > 100) {
        issues.push(
          issue(
            "signature_out_of_range",
            `Signature for "${scientistId}" has "${stat}" = ${val} outside [0, 100].`,
          ),
        );
      }
      // stat is a StatId and rationale is Record<StatId,string>, so every key is present.
      const rationale = sig.rationale[stat];
      if (rationale.trim().length === 0) {
        issues.push(
          issue(
            "signature_empty_rationale",
            `Signature for "${scientistId}" has empty rationale for "${stat}".`,
          ),
        );
      }
    }
  }

  // Pairwise distinctness: every pair must be separated by at least FLAVOR_MIN_MARGIN.
  const scientistIdList = [...SCIENTIST_IDS];
  for (let i = 0; i < scientistIdList.length; i++) {
    for (let j = i + 1; j < scientistIdList.length; j++) {
      // Non-null assertion safe: i and j are bounded by scientistIdList.length.
      const idA: ScientistId = scientistIdList[i]!;
      const idB: ScientistId = scientistIdList[j]!;
      const dist = euclideanDistance(
        SCIENTIST_SIGNATURE[idA].values,
        SCIENTIST_SIGNATURE[idB].values,
      );
      if (dist < FLAVOR_MIN_MARGIN) {
        issues.push(
          issue(
            "signature_too_close",
            `Signatures for "${idA}" and "${idB}" are too close ` +
              `(distance ${dist.toFixed(2)} < ${FLAVOR_MIN_MARGIN}).`,
          ),
        );
      }
    }
  }
}

// Check g: no prompt in CORE_DECK or FLAVOR_POOL (case-insensitive) contains a
// leak term that would hint at a scientist's identity mid-run.
// NOTE: SCIENTIST_SOURCE_NOTES legitimately contains scientist names -- not scanned here.
function checkLeakTerms(issues: ValidationIssue[]): void {
  const allCards = ALL_CARDS;
  for (const card of allCards) {
    const promptLower = card.prompt.toLowerCase();
    for (const term of LEAK_TERM_DENYLIST) {
      if (promptLower.includes(term.toLowerCase())) {
        issues.push(
          issue("leak_term_in_prompt", `Card "${card.id}" prompt contains leak term "${term}".`),
        );
      }
    }
  }
}

export function validateContent(): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  checkCoreDeckSize(issues);
  checkStatCoverage(issues);
  checkProbeSubsetOfEffects(issues);
  checkChoiceEffects(issues);
  checkFlavorPoolCoverage(issues);
  checkSignatures(issues);
  checkLeakTerms(issues);

  return issues;
}
