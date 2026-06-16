import {
  ARC_BEATS,
  ENDING_TYPES,
  SCIENTIST_IDS,
  STAT_IDS,
  type ArcBeat,
  type EndingType,
  type ScientistId,
  type StatId,
} from "./config";
import { PROLOGUE_CARDS, SCIENTIST_PATHS, getRouteCoverage, type ScientistPath } from "./content";

export type ValidationIssue = {
  readonly code: string;
  readonly message: string;
};

function issue(code: string, message: string): ValidationIssue {
  const validationIssue = { code, message };
  return validationIssue;
}

function includesArcBeat(values: readonly ArcBeat[], target: ArcBeat): boolean {
  const found = values.includes(target);
  return found;
}

function includesEnding(values: readonly EndingType[], target: EndingType): boolean {
  const found = values.includes(target);
  return found;
}

function includesScientist(values: readonly ScientistId[], target: ScientistId): boolean {
  const found = values.includes(target);
  return found;
}

function includesStat(values: readonly StatId[], target: StatId): boolean {
  const found = values.includes(target);
  return found;
}

function validatePath(path: ScientistPath): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (path.scientistId.length === 0) {
    issues.push(issue("path_id", "Scientist path id cannot be empty."));
  }
  if (path.cards.length < 12) {
    issues.push(issue("cards", `${path.scientistId} has fewer than 12 cards.`));
  }
  if (path.motifs.length < 2) {
    issues.push(issue("motifs", `${path.scientistId} has fewer than 2 motifs.`));
  }
  if (path.sourceNotes.length < 3 || path.sourceNotes.length > 5) {
    issues.push(issue("source_notes", `${path.scientistId} source notes must be 3 to 5.`));
  }
  for (const sourceNote of path.sourceNotes) {
    if (sourceNote.label.length === 0 || !sourceNote.url.startsWith("https://")) {
      issues.push(issue("source_note_detail", `${path.scientistId} has an invalid source note.`));
    }
  }
  const scientistSpecificCards = path.cards.filter((card) => card.scientistSpecific);
  if (scientistSpecificCards.length < 3) {
    issues.push(issue("specific_cards", `${path.scientistId} needs 3 scientist cards.`));
  }
  const contributionCards = path.cards.filter((card) => card.contributionTags.length > 0);
  if (contributionCards.length < 3) {
    issues.push(
      issue("contribution_cards", `${path.scientistId} needs 3 contribution-specific cards.`),
    );
  }

  const cardArcBeats = path.cards.map((card) => card.arcBeat);
  for (const arcBeat of ARC_BEATS) {
    if (!includesArcBeat(cardArcBeats, arcBeat)) {
      issues.push(issue("arc_beat", `${path.scientistId} misses arc beat ${arcBeat}.`));
    }
  }

  const pathEndingTypes = path.endings.map((ending) => ending.type);
  if (path.endings.length !== ENDING_TYPES.length) {
    issues.push(issue("ending_count", `${path.scientistId} must have 4 ending types.`));
  }
  for (const endingType of ENDING_TYPES) {
    if (!includesEnding(pathEndingTypes, endingType)) {
      issues.push(issue("ending_type", `${path.scientistId} misses ending ${endingType}.`));
    }
  }

  for (const card of path.cards) {
    if (card.choices.length !== 2) {
      issues.push(issue("choice_count", `${card.id} must have exactly 2 choices.`));
    }
    for (const choice of card.choices) {
      if (choice.effects.length === 0) {
        issues.push(issue("effects", `${card.id} choice has no effects.`));
      }
      for (const cardEffect of choice.effects) {
        if (!includesStat(STAT_IDS, cardEffect.stat)) {
          issues.push(issue("stat", `${card.id} references unknown stat ${cardEffect.stat}.`));
        }
      }
    }
  }

  return issues;
}

export function validateContent(): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const scientistId of SCIENTIST_IDS) {
    const path = SCIENTIST_PATHS[scientistId];
    issues.push(...validatePath(path));
  }

  const prologueRoutes = PROLOGUE_CARDS.flatMap((card) =>
    card.choices.map((choice) => choice.routeTo),
  );
  const routeCoverage = getRouteCoverage();
  for (const scientistId of SCIENTIST_IDS) {
    if (!includesScientist(prologueRoutes, scientistId)) {
      issues.push(issue("prologue_route", `Prologue does not route to ${scientistId}.`));
    }
    if (routeCoverage[scientistId] < 1) {
      issues.push(issue("route_coverage", `Route coverage misses ${scientistId}.`));
    }
  }

  return issues;
}

export function validatePathCompleteness(path: ScientistPath): readonly ValidationIssue[] {
  const issues = validatePath(path);
  return issues;
}
