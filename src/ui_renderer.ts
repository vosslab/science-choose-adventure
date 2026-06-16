import {
  MAGNITUDE_CONFIG,
  PROLOGUE_THEME,
  SCIENTIST_CONFIG,
  STAT_CONFIG,
  scientistTheme,
  statBand,
  type EffectDirection,
  type StatId,
  type ThemePalette,
} from "./config";
import { PROLOGUE_CARDS, SCIENTIST_PATHS, type Choice, type Effect } from "./content";
import { currentVisibleCard, type GameState, type StatValues } from "./engine";

export type RenderHandlers = {
  readonly choose: (choiceIndex: 0 | 1) => void;
  readonly restart: () => void;
  readonly reset: () => void;
};

type SideEffect = {
  readonly stat: StatId;
  readonly direction: EffectDirection;
};

type ChoiceView = {
  readonly label: string;
  readonly magnitude: string;
  readonly effects: readonly SideEffect[];
};

const STAT_ORDER: readonly StatId[] = ["credibility", "curiosity", "cash", "care"];
const STAT_STEP_COUNT = 10;

function removeChildren(node: HTMLElement): void {
  while (node.firstChild !== null) {
    node.firstChild.remove();
  }
}

function makeElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text: string | undefined,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className.length > 0) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function appendText(parent: HTMLElement, text: string): void {
  parent.append(document.createTextNode(text));
}

function largestMagnitude(effects: readonly Effect[]): string {
  let largestDelta = -1;
  let label = "Small";
  for (const effect of effects) {
    const config = MAGNITUDE_CONFIG[effect.magnitude];
    if (config.delta > largestDelta) {
      largestDelta = config.delta;
      label = config.label;
    }
  }
  return label;
}

function sideEffects(effects: readonly Effect[]): readonly SideEffect[] {
  const list = effects.map((effect) => ({ stat: effect.stat, direction: effect.direction }));
  return list;
}

function choiceMagnitude(choice: Choice): string {
  const magnitude = largestMagnitude(choice.effects);
  return magnitude;
}

function currentChoices(state: GameState): readonly [ChoiceView, ChoiceView] | undefined {
  if (state.phase === "prologue") {
    const card = PROLOGUE_CARDS[state.prologueIndex];
    if (card === undefined) {
      throw new Error(`Missing prologue card ${state.prologueIndex}.`);
    }
    const choices = [
      {
        label: card.choices[0].label,
        magnitude: largestMagnitude([card.choices[0].effect]),
        effects: sideEffects([card.choices[0].effect]),
      },
      {
        label: card.choices[1].label,
        magnitude: largestMagnitude([card.choices[1].effect]),
        effects: sideEffects([card.choices[1].effect]),
      },
    ] as const;
    return choices;
  }
  if (state.phase === "path") {
    const path = SCIENTIST_PATHS[state.scientistId];
    const card = path.cards[state.cardIndex];
    if (card === undefined) {
      throw new Error(`Missing path card ${state.cardIndex} for ${state.scientistId}.`);
    }
    const choices = [
      {
        label: card.choices[0].label,
        magnitude: choiceMagnitude(card.choices[0]),
        effects: sideEffects(card.choices[0].effects),
      },
      {
        label: card.choices[1].label,
        magnitude: choiceMagnitude(card.choices[1]),
        effects: sideEffects(card.choices[1].effects),
      },
    ] as const;
    return choices;
  }
  return undefined;
}

function activeTheme(state: GameState): ThemePalette {
  if (state.phase === "path" || state.phase === "ending") {
    return scientistTheme(state.scientistId);
  }
  return PROLOGUE_THEME;
}

function applyTheme(shell: HTMLElement, theme: ThemePalette): void {
  shell.style.setProperty("--paper", theme.paper);
  shell.style.setProperty("--ink", theme.ink);
  shell.style.setProperty("--accent", theme.accent);
  shell.style.setProperty("--glow", theme.glow);
}

function phaseLabel(state: GameState): string {
  if (state.phase === "prologue") {
    const label = `Prologue ${state.prologueIndex + 1} of ${PROLOGUE_CARDS.length}`;
    return label;
  }
  if (state.phase === "path") {
    const path = SCIENTIST_PATHS[state.scientistId];
    const label = `${SCIENTIST_CONFIG[state.scientistId].name} ${state.cardIndex + 1} of ${
      path.cards.length
    }`;
    return label;
  }
  return "Ending";
}

function routeLabel(state: GameState): string {
  if (state.phase === "path" || state.phase === "ending") {
    const config = SCIENTIST_CONFIG[state.scientistId];
    const label = `${config.name}: ${config.field}`;
    return label;
  }
  return "Your choices are sorting the career route.";
}

function statBandLabel(value: number): string {
  const band = statBand(value);
  if (band === "low") {
    return "low";
  }
  if (band === "high") {
    return "high";
  }
  return "steady";
}

function statStep(value: number): number {
  const clampedValue = Math.max(0, Math.min(100, value));
  const step = Math.max(1, Math.ceil(clampedValue / STAT_STEP_COUNT));
  return step;
}

function renderStats(stats: StatValues): HTMLElement {
  const wrapper = makeElement("section", "stats", undefined);
  wrapper.setAttribute("aria-label", "Four career pressures");
  for (const statId of STAT_ORDER) {
    const statConfig = STAT_CONFIG[statId];
    const band = statBand(stats[statId]);
    const step = statStep(stats[statId]);
    const item = makeElement("div", "stat", undefined);
    item.dataset.statItem = statId;
    const label = makeElement("span", "stat__label", statConfig.label);
    const meter = makeElement("span", `stat__meter stat__meter--${band}`, undefined);
    // data-stat lets the drag controller light up this meter while a choice is held.
    meter.dataset.stat = statId;
    meter.setAttribute("role", "img");
    meter.setAttribute(
      "aria-label",
      `${statConfig.label} is step ${step} of ${STAT_STEP_COUNT}, ${statBandLabel(stats[statId])}.`,
    );
    for (let index = 1; index <= STAT_STEP_COUNT; index += 1) {
      const segmentClass = index <= step ? "stat__segment stat__segment--active" : "stat__segment";
      meter.append(makeElement("span", segmentClass, undefined));
    }
    const status = makeElement(
      "span",
      "stat__status",
      `Step ${step} of ${STAT_STEP_COUNT} - ${statBandLabel(stats[statId])}`,
    );
    item.append(label, meter, status);
    wrapper.append(item);
  }
  return wrapper;
}

type StatRisk = "danger" | "watch" | "safe";

function statRisk(value: number): StatRisk {
  if (value <= 8 || value >= 92) {
    return "danger";
  }
  const band = statBand(value);
  if (band === "low" || band === "high") {
    return "watch";
  }
  return "safe";
}

function riskedStatNames(stats: StatValues, risk: StatRisk): readonly string[] {
  const names = STAT_ORDER.filter((statId) => statRisk(stats[statId]) === risk).map(
    (statId) => STAT_CONFIG[statId].label,
  );
  return names;
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names.join("");
  }
  const tail = names[names.length - 1] ?? "";
  const head = names.slice(0, -1).join(", ");
  if (names.length === 2) {
    return `${head} and ${tail}`;
  }
  return `${head}, and ${tail}`;
}

function renderStability(stats: StatValues): HTMLElement {
  const danger = riskedStatNames(stats, "danger");
  const watch = riskedStatNames(stats, "watch");
  let tone = "stable";
  let message = "Career stable. Keep all four pressures near the middle.";
  if (danger.length > 0) {
    tone = "danger";
    message = `Critical: ${joinNames(danger)} about to break the run.`;
  } else if (watch.length > 0) {
    tone = "watch";
    message = `Watch ${joinNames(watch)} drifting toward an edge.`;
  }
  const banner = makeElement("p", `stability stability--${tone}`, message);
  banner.setAttribute("role", "status");
  return banner;
}

function renderLegend(): HTMLElement {
  const legend = makeElement("p", "legend", undefined);
  legend.append(
    document.createTextNode("Aim for the "),
    makeElement("b", "", "steady teal middle"),
    document.createTextNode(
      ". Red means too low, amber means too high, and both ends end the run.",
    ),
  );
  return legend;
}

function renderStatus(stats: StatValues): HTMLElement {
  const status = makeElement("section", "status-block", undefined);
  status.setAttribute("aria-label", "How the run is going");
  status.append(renderStability(stats), renderLegend());
  return status;
}

function renderCareHelp(): HTMLElement {
  const details = makeElement("details", "care-help", undefined);
  const summary = makeElement("summary", "care-help__summary", "Care help");
  const text = makeElement(
    "p",
    "care-help__text",
    "Care means attention to people affected by the work, including collaborators, patients, students, and the public.",
  );
  details.append(summary, text);
  return details;
}

function renderControls(handlers: RenderHandlers): HTMLElement {
  const controls = makeElement("nav", "utility-controls", undefined);
  controls.setAttribute("aria-label", "Run controls");
  const restart = makeElement("button", "utility-button", "Restart run");
  restart.type = "button";
  restart.addEventListener("click", handlers.restart);
  const reset = makeElement("button", "utility-button utility-button--quiet", "Reset save");
  reset.type = "button";
  reset.addEventListener("click", handlers.reset);
  controls.append(restart, reset);
  return controls;
}

function renderSourceNotes(state: GameState): HTMLElement | undefined {
  if (
    state.phase !== "ending" ||
    !state.unlockedExtras.includes(`${state.scientistId}:source_notes`)
  ) {
    return undefined;
  }
  const path = SCIENTIST_PATHS[state.scientistId];
  const notes = makeElement("section", "source-notes", undefined);
  const heading = makeElement("h2", "source-notes__heading", "Unlocked source notes");
  const list = makeElement("ul", "source-notes__list", undefined);
  for (const sourceNote of path.sourceNotes) {
    const item = makeElement("li", "", undefined);
    const anchor = makeElement("a", "", sourceNote.label);
    anchor.href = sourceNote.url;
    anchor.rel = "noreferrer";
    item.append(anchor);
    list.append(item);
  }
  notes.append(heading, list);
  return notes;
}

function renderEffectTags(effects: readonly SideEffect[]): HTMLElement {
  // Local effect hint on the button: which pressures move and which way (no magnitude).
  const wrapper = makeElement("span", "choice-button__effects", undefined);
  for (const effect of effects) {
    const direction = effect.direction === "up" ? "up" : "down";
    const tagClass = `effect-tag effect-tag--${direction}`;
    const tag = makeElement("span", tagClass, `${STAT_CONFIG[effect.stat].label} ${direction}`);
    wrapper.append(tag);
  }
  return wrapper;
}

function renderChoiceButton(
  choice: ChoiceView,
  index: 0 | 1,
  handlers: RenderHandlers,
): HTMLButtonElement {
  const button = makeElement("button", `choice-button choice-button--${index}`, undefined);
  button.dataset.choice = String(index);
  const key = index === 0 ? "A" : "D";
  const hint = index === 0 ? "Swipe left" : "Swipe right";
  button.type = "button";
  button.addEventListener("click", () => {
    handlers.choose(index);
  });
  // Hovering or focusing a choice previews which meters it will move (direction only).
  function previewEffects(active: boolean): void {
    for (const effect of choice.effects) {
      const meter = document.querySelector<HTMLElement>(`.stat__meter[data-stat="${effect.stat}"]`);
      if (meter === null) {
        continue;
      }
      const hintClass = effect.direction === "up" ? "stat__meter--rise" : "stat__meter--fall";
      meter.classList.toggle(hintClass, active);
    }
  }
  button.addEventListener("mouseenter", () => previewEffects(true));
  button.addEventListener("mouseleave", () => previewEffects(false));
  button.addEventListener("focus", () => previewEffects(true));
  button.addEventListener("blur", () => previewEffects(false));
  button.append(
    makeElement("span", "choice-button__direction", index === 0 ? "Left" : "Right"),
    makeElement("span", "choice-button__label", choice.label),
    renderEffectTags(choice.effects),
    makeElement("span", "choice-button__meta", `${hint} / ${key} / ${choice.magnitude} effect`),
  );
  return button;
}

function renderChoiceRail(
  choices: readonly [ChoiceView, ChoiceView],
  handlers: RenderHandlers,
): HTMLElement {
  const rail = makeElement("div", "choice-rail", undefined);
  rail.append(
    renderChoiceButton(choices[0], 0, handlers),
    renderChoiceButton(choices[1], 1, handlers),
  );
  return rail;
}

function effectsToData(effects: readonly SideEffect[]): string {
  const encoded = effects.map((effect) => `${effect.stat}:${effect.direction}`).join(",");
  return encoded;
}

function renderCardEdge(side: "left" | "right", label: string): HTMLElement {
  const edge = makeElement("div", `card__edge card__edge--${side}`, undefined);
  edge.setAttribute("aria-hidden", "true");
  const arrow = makeElement("span", "card__edge-arrow", side === "left" ? "<" : ">");
  const text = makeElement("span", "card__edge-label", label);
  if (side === "left") {
    edge.append(arrow, text);
  } else {
    edge.append(text, arrow);
  }
  return edge;
}

function renderDecisionCard(
  state: GameState,
  choices: readonly [ChoiceView, ChoiceView],
): HTMLElement {
  const visibleCard = currentVisibleCard(state);
  const prompt = visibleCard.kind === "ending" ? "" : visibleCard.prompt;
  // Nudge only the very first card so new players see that it shifts and is draggable.
  const isFirstCard = state.phase === "prologue" && state.prologueIndex === 0;
  const cardClass = isFirstCard ? "card card--draggable card--nudge" : "card card--draggable";
  const card = makeElement("section", cardClass, undefined);
  card.setAttribute("aria-live", "polite");
  card.setAttribute("aria-label", "Current decision card");
  // Per-side effects let the drag controller glow the affected meters before commit.
  card.dataset.left = effectsToData(choices[0].effects);
  card.dataset.right = effectsToData(choices[1].effects);

  const effectText =
    state.lastEffectMagnitude === undefined
      ? "Each choice reveals only effect size."
      : `Last choice had a ${state.lastEffectMagnitude.toLowerCase()} effect.`;

  card.append(
    renderCardEdge("left", choices[0].label),
    renderCardEdge("right", choices[1].label),
    makeElement("p", "eyebrow", phaseLabel(state)),
    makeElement("p", "card__text", prompt),
    makeElement("p", "effect-hint", effectText),
  );
  return card;
}

function renderEndingCard(state: GameState, handlers: RenderHandlers): HTMLElement {
  const visibleCard = currentVisibleCard(state);
  const card = makeElement("section", "card card--ending", undefined);
  card.setAttribute("aria-live", "polite");
  card.setAttribute("aria-label", "Run ending card");
  card.append(
    makeElement("p", "eyebrow", phaseLabel(state)),
    makeElement("h2", "card__title", visibleCard.kind === "ending" ? visibleCard.title : ""),
    makeElement("p", "card__text", visibleCard.kind === "ending" ? visibleCard.text : ""),
  );
  const endingActions = makeElement("div", "ending-actions", undefined);
  const restart = makeElement("button", "primary-action", "Restart run");
  restart.type = "button";
  restart.addEventListener("click", handlers.restart);
  const reset = makeElement("button", "secondary-action", "Reset save");
  reset.type = "button";
  reset.addEventListener("click", handlers.reset);
  endingActions.append(restart, reset);
  card.append(endingActions);
  return card;
}

function renderStage(state: GameState, handlers: RenderHandlers): HTMLElement {
  const stage = makeElement("div", "card-stage", undefined);
  // Two static ghost cards behind the live card create Reigns-style deck depth.
  stage.append(
    makeElement("div", "card-ghost card-ghost--back", undefined),
    makeElement("div", "card-ghost card-ghost--front", undefined),
  );

  if (state.phase === "ending") {
    stage.append(renderEndingCard(state, handlers));
    return stage;
  }

  const choices = currentChoices(state);
  if (choices === undefined) {
    throw new Error("Choices are required outside ending phase.");
  }
  stage.append(renderChoiceRail(choices, handlers));
  stage.insertBefore(renderDecisionCard(state, choices), stage.querySelector(".choice-rail"));
  return stage;
}

function renderHeader(state: GameState, handlers: RenderHandlers): HTMLElement {
  const header = makeElement("header", "game-header", undefined);
  const headingGroup = makeElement("div", "heading-group", undefined);
  const title = makeElement("h1", "game-title", "Science Career Survival");
  const subtitle = makeElement("p", "game-subtitle", routeLabel(state));
  headingGroup.append(title, subtitle);
  const theme = activeTheme(state);
  headingGroup.append(makeElement("p", "game-motif", theme.motif));
  header.append(headingGroup, renderControls(handlers));
  return header;
}

function renderInstructionStrip(): HTMLElement {
  const strip = makeElement("p", "input-strip", undefined);
  appendText(strip, "Drag the card left or right, or use the buttons, ");
  const keyboard = makeElement("kbd", "", "A/D");
  strip.append(keyboard);
  appendText(strip, ", and arrow keys for the same choices.");
  return strip;
}

export function render(root: HTMLElement, state: GameState, handlers: RenderHandlers): void {
  removeChildren(root);

  const shell = makeElement("main", "game-shell", undefined);
  shell.dataset.phase = state.phase;
  if (state.phase === "path" || state.phase === "ending") {
    shell.dataset.scientist = state.scientistId;
  }
  applyTheme(shell, activeTheme(state));
  shell.append(
    renderHeader(state, handlers),
    renderStats(state.stats),
    renderStatus(state.stats),
    renderCareHelp(),
    renderStage(state, handlers),
    renderInstructionStrip(),
  );
  const sourceNotes = renderSourceNotes(state);
  if (sourceNotes !== undefined) {
    shell.append(sourceNotes);
  }
  root.append(shell);
}
