import {
  HIGH_COLLAPSE_VALUE,
  LOW_COLLAPSE_VALUE,
  MAGNITUDE_CONFIG,
  SCIENTIST_IDS,
  STARTING_STAT_VALUE,
  STAT_CONFIG,
  STAT_IDS,
  type EndingType,
  type ScientistId,
  type StatId,
} from "./config";
import {
  PROLOGUE_CARDS,
  SCIENTIST_PATHS,
  getRouteCoverage,
  type CareerCard,
  type Choice,
  type PrologueCard,
} from "./content";

export { getRouteCoverage };

export type StatValues = Record<StatId, number>;
export type RouteScores = Record<ScientistId, number>;

export type CollapseReason = {
  readonly stat: StatId;
  readonly band: "low" | "high";
  readonly message: string;
};

export type GameState =
  | {
      readonly phase: "prologue";
      readonly prologueIndex: number;
      readonly routeScores: RouteScores;
      readonly stats: StatValues;
      readonly unlockedExtras: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
    }
  | {
      readonly phase: "path";
      readonly scientistId: ScientistId;
      readonly cardIndex: number;
      readonly routeScores: RouteScores;
      readonly stats: StatValues;
      readonly unlockedExtras: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
    }
  | {
      readonly phase: "ending";
      readonly scientistId: ScientistId;
      readonly endingType: EndingType;
      readonly collapse: CollapseReason | undefined;
      readonly routeScores: RouteScores;
      readonly stats: StatValues;
      readonly unlockedExtras: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
    };

export type VisibleCard =
  | {
      readonly kind: "prologue";
      readonly prompt: string;
      readonly choices: readonly [string, string];
    }
  | {
      readonly kind: "path";
      readonly scientistId: ScientistId;
      readonly prompt: string;
      readonly choices: readonly [string, string];
    }
  | { readonly kind: "ending"; readonly title: string; readonly text: string };

function initialStats(): StatValues {
  const stats = {
    credibility: STARTING_STAT_VALUE,
    curiosity: STARTING_STAT_VALUE,
    cash: STARTING_STAT_VALUE,
    care: STARTING_STAT_VALUE,
  };
  return stats;
}

function initialRouteScores(): RouteScores {
  const scores = {
    jennifer_doudna: 0,
    rosalind_franklin: 0,
    marie_curie: 0,
    alexander_fleming: 0,
    katalin_kariko: 0,
  };
  return scores;
}

export function createInitialState(): GameState {
  const state: GameState = {
    phase: "prologue",
    prologueIndex: 0,
    routeScores: initialRouteScores(),
    stats: initialStats(),
    unlockedExtras: [],
    lastEffectMagnitude: undefined,
  };
  return state;
}

export function getStartingState(): GameState {
  const state = createInitialState();
  return state;
}

function chooseScientist(routeScores: RouteScores): ScientistId {
  let bestScientist: ScientistId = SCIENTIST_IDS[0];
  let bestScore = routeScores[bestScientist];
  for (const scientistId of SCIENTIST_IDS) {
    const score = routeScores[scientistId];
    if (score > bestScore) {
      bestScientist = scientistId;
      bestScore = score;
    }
  }
  return bestScientist;
}

function applyChoiceEffects(stats: StatValues, choice: Choice): StatValues {
  const nextStats: StatValues = { ...stats };
  for (const choiceEffect of choice.effects) {
    const config = MAGNITUDE_CONFIG[choiceEffect.magnitude];
    const signedDelta = choiceEffect.direction === "up" ? config.delta : -config.delta;
    nextStats[choiceEffect.stat] += signedDelta;
  }
  return nextStats;
}

function visibleMagnitude(choice: Choice): string {
  let largestDelta = 0;
  let label = "Small";
  for (const choiceEffect of choice.effects) {
    const config = MAGNITUDE_CONFIG[choiceEffect.magnitude];
    if (config.delta >= largestDelta) {
      largestDelta = config.delta;
      label = config.label;
    }
  }
  return label;
}

function collapseReason(stats: StatValues): CollapseReason | undefined {
  for (const statId of STAT_IDS) {
    const value = stats[statId];
    const statConfig = STAT_CONFIG[statId];
    if (value <= LOW_COLLAPSE_VALUE) {
      const reason: CollapseReason = {
        stat: statId,
        band: "low",
        message: statConfig.lowCollapse,
      };
      return reason;
    }
    if (value >= HIGH_COLLAPSE_VALUE) {
      const reason: CollapseReason = {
        stat: statId,
        band: "high",
        message: statConfig.highCollapse,
      };
      return reason;
    }
  }
  return undefined;
}

function collapseEndingType(collapse: CollapseReason): EndingType {
  if (collapse.stat === "cash") {
    return "institutional_capture";
  }
  if (collapse.stat === "curiosity" && collapse.band === "high") {
    return "reckless_velocity";
  }
  if (collapse.stat === "care" && collapse.band === "low") {
    return "reckless_velocity";
  }
  return "evidence_burnout";
}

function selectEndingType(stats: StatValues): EndingType {
  if (stats.credibility >= 75 && stats.care >= 55) {
    return "balanced_legacy";
  }
  if (stats.care >= 80 || stats.credibility >= 90) {
    return "evidence_burnout";
  }
  if (stats.cash >= 80) {
    return "institutional_capture";
  }
  return "reckless_velocity";
}

function addUnlockedExtra(
  unlockedExtras: readonly string[],
  scientistId: ScientistId,
): readonly string[] {
  const extra = `${scientistId}:source_notes`;
  if (unlockedExtras.includes(extra)) {
    return unlockedExtras;
  }
  const nextExtras = [...unlockedExtras, extra];
  return nextExtras;
}

function prologueCardAt(index: number): PrologueCard {
  const prologueCard = PROLOGUE_CARDS[index];
  if (prologueCard === undefined) {
    throw new Error(`Missing prologue card at index ${index}.`);
  }
  return prologueCard;
}

function careerCardAt(scientistId: ScientistId, index: number): CareerCard {
  const path = SCIENTIST_PATHS[scientistId];
  const careerCard = path.cards[index];
  if (careerCard === undefined) {
    throw new Error(`Missing career card ${index} for ${scientistId}.`);
  }
  return careerCard;
}

function prologueChoice(
  state: Extract<GameState, { phase: "prologue" }>,
  choiceIndex: 0 | 1,
): GameState {
  const prologueCard = prologueCardAt(state.prologueIndex);
  const selectedChoice = prologueCard.choices[choiceIndex];
  const nextRouteScores: RouteScores = { ...state.routeScores };
  nextRouteScores[selectedChoice.routeTo] += 1;

  const virtualChoice: Choice = {
    label: selectedChoice.label,
    effects: [selectedChoice.effect],
  };
  const nextStats = applyChoiceEffects(state.stats, virtualChoice);
  const lastEffectMagnitude = visibleMagnitude(virtualChoice);
  const nextIndex = state.prologueIndex + 1;
  if (nextIndex < PROLOGUE_CARDS.length) {
    const nextState: GameState = {
      phase: "prologue",
      prologueIndex: nextIndex,
      routeScores: nextRouteScores,
      stats: nextStats,
      unlockedExtras: state.unlockedExtras,
      lastEffectMagnitude,
    };
    return nextState;
  }

  const scientistId = chooseScientist(nextRouteScores);
  const nextState: GameState = {
    phase: "path",
    scientistId,
    cardIndex: 0,
    routeScores: nextRouteScores,
    stats: nextStats,
    unlockedExtras: state.unlockedExtras,
    lastEffectMagnitude,
  };
  return nextState;
}

function pathChoice(state: Extract<GameState, { phase: "path" }>, choiceIndex: 0 | 1): GameState {
  const path = SCIENTIST_PATHS[state.scientistId];
  const currentCard = careerCardAt(state.scientistId, state.cardIndex);
  const selectedChoice = currentCard.choices[choiceIndex];
  const nextStats = applyChoiceEffects(state.stats, selectedChoice);
  const lastEffectMagnitude = visibleMagnitude(selectedChoice);
  const collapse = collapseReason(nextStats);
  if (collapse !== undefined) {
    const nextState: GameState = {
      phase: "ending",
      scientistId: state.scientistId,
      endingType: collapseEndingType(collapse),
      collapse,
      routeScores: state.routeScores,
      stats: nextStats,
      unlockedExtras: state.unlockedExtras,
      lastEffectMagnitude,
    };
    return nextState;
  }

  const nextCardIndex = state.cardIndex + 1;
  if (nextCardIndex < path.cards.length) {
    const nextState: GameState = {
      phase: "path",
      scientistId: state.scientistId,
      cardIndex: nextCardIndex,
      routeScores: state.routeScores,
      stats: nextStats,
      unlockedExtras: state.unlockedExtras,
      lastEffectMagnitude,
    };
    return nextState;
  }

  const nextState: GameState = {
    phase: "ending",
    scientistId: state.scientistId,
    endingType: selectEndingType(nextStats),
    collapse: undefined,
    routeScores: state.routeScores,
    stats: nextStats,
    unlockedExtras: addUnlockedExtra(state.unlockedExtras, state.scientistId),
    lastEffectMagnitude,
  };
  return nextState;
}

export function choose(state: GameState, choiceIndex: 0 | 1): GameState {
  if (state.phase === "prologue") {
    return prologueChoice(state, choiceIndex);
  }
  if (state.phase === "path") {
    return pathChoice(state, choiceIndex);
  }
  return createInitialState();
}

export function applyChoice(state: GameState, choiceIndex: 0 | 1): GameState {
  const nextState = choose(state, choiceIndex);
  return nextState;
}

export function choosePrologueOption(
  state: Extract<GameState, { phase: "prologue" }>,
  choiceIndex: 0 | 1,
): GameState {
  const nextState = prologueChoice(state, choiceIndex);
  return nextState;
}

export function restartRun(): GameState {
  const state = createInitialState();
  return state;
}

function endingText(state: Extract<GameState, { phase: "ending" }>): VisibleCard {
  const path = SCIENTIST_PATHS[state.scientistId];
  if (state.collapse !== undefined) {
    const title = `${STAT_CONFIG[state.collapse.stat].label} ${state.collapse.band}`;
    const card: VisibleCard = { kind: "ending", title, text: state.collapse.message };
    return card;
  }

  const ending = path.endings.find((pathEnding) => pathEnding.type === state.endingType);
  if (ending === undefined) {
    throw new Error(`Missing ending ${state.endingType} for ${state.scientistId}.`);
  }
  const card: VisibleCard = { kind: "ending", title: ending.title, text: ending.text };
  return card;
}

function cardChoices(card: CareerCard): readonly [string, string] {
  const labels: readonly [string, string] = [card.choices[0].label, card.choices[1].label];
  return labels;
}

export function currentVisibleCard(state: GameState): VisibleCard {
  if (state.phase === "prologue") {
    const prologueCard = prologueCardAt(state.prologueIndex);
    const choices: readonly [string, string] = [
      prologueCard.choices[0].label,
      prologueCard.choices[1].label,
    ];
    const card: VisibleCard = { kind: "prologue", prompt: prologueCard.prompt, choices };
    return card;
  }
  if (state.phase === "path") {
    const pathCard = careerCardAt(state.scientistId, state.cardIndex);
    const card: VisibleCard = {
      kind: "path",
      scientistId: state.scientistId,
      prompt: pathCard.prompt,
      choices: cardChoices(pathCard),
    };
    return card;
  }
  return endingText(state);
}

export function getCurrentCard(state: GameState): VisibleCard {
  const visibleCard = currentVisibleCard(state);
  return visibleCard;
}
