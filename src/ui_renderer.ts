import { MAGNITUDE_CONFIG, SCIENTIST_CONFIG, STAT_CONFIG, statBand, type StatId } from "./config";
import { PROLOGUE_CARDS, SCIENTIST_PATHS, type Choice, type Effect } from "./content";
import { currentVisibleCard, type GameState, type StatValues } from "./engine";

export type RenderHandlers = {
  readonly choose: (choiceIndex: 0 | 1) => void;
  readonly restart: () => void;
  readonly reset: () => void;
};

type ChoiceView = {
  readonly label: string;
  readonly magnitude: string;
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
      { label: card.choices[0].label, magnitude: largestMagnitude([card.choices[0].effect]) },
      { label: card.choices[1].label, magnitude: largestMagnitude([card.choices[1].effect]) },
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
      { label: card.choices[0].label, magnitude: choiceMagnitude(card.choices[0]) },
      { label: card.choices[1].label, magnitude: choiceMagnitude(card.choices[1]) },
    ] as const;
    return choices;
  }
  return undefined;
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
    const label = makeElement("span", "stat__label", statConfig.label);
    const meter = makeElement("span", `stat__meter stat__meter--${band}`, undefined);
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

function renderChoiceButton(
  choice: ChoiceView,
  index: 0 | 1,
  handlers: RenderHandlers,
): HTMLButtonElement {
  const button = makeElement("button", `choice-button choice-button--${index}`, undefined);
  const key = index === 0 ? "A" : "D";
  const hint = index === 0 ? "Swipe left" : "Swipe right";
  button.type = "button";
  button.addEventListener("click", () => {
    handlers.choose(index);
  });
  button.append(
    makeElement("span", "choice-button__direction", index === 0 ? "Left" : "Right"),
    makeElement("span", "choice-button__label", choice.label),
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

function renderCard(state: GameState, handlers: RenderHandlers): HTMLElement {
  const visibleCard = currentVisibleCard(state);
  const card = makeElement("section", "card", undefined);
  card.setAttribute("aria-live", "polite");
  card.setAttribute("aria-label", "Current decision card");

  if (visibleCard.kind === "ending") {
    card.append(
      makeElement("p", "eyebrow", phaseLabel(state)),
      makeElement("h2", "card__title", visibleCard.title),
      makeElement("p", "card__text", visibleCard.text),
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

  const choices = currentChoices(state);
  if (choices === undefined) {
    throw new Error("Choices are required outside ending phase.");
  }
  const effectText =
    state.lastEffectMagnitude === undefined
      ? "Each choice reveals only effect size."
      : `Last choice had a ${state.lastEffectMagnitude.toLowerCase()} effect.`;
  card.append(
    makeElement("p", "eyebrow", phaseLabel(state)),
    makeElement("p", "card__text", visibleCard.prompt),
    makeElement("p", "effect-hint", effectText),
    renderChoiceRail(choices, handlers),
  );
  return card;
}

function renderHeader(state: GameState, handlers: RenderHandlers): HTMLElement {
  const header = makeElement("header", "game-header", undefined);
  const headingGroup = makeElement("div", "heading-group", undefined);
  const title = makeElement("h1", "game-title", "Science Career Survival");
  const subtitle = makeElement("p", "game-subtitle", routeLabel(state));
  headingGroup.append(title, subtitle);
  header.append(headingGroup, renderControls(handlers));
  return header;
}

function renderInstructionStrip(): HTMLElement {
  const strip = makeElement("p", "input-strip", undefined);
  appendText(strip, "Swipe left or right. Buttons, ");
  const keyboard = makeElement("kbd", "", "A/D");
  strip.append(keyboard);
  appendText(strip, ", and arrow keys choose the same actions.");
  return strip;
}

export function render(root: HTMLElement, state: GameState, handlers: RenderHandlers): void {
  removeChildren(root);

  const shell = makeElement("main", "game-shell", undefined);
  shell.append(
    renderHeader(state, handlers),
    renderStats(state.stats),
    renderCareHelp(),
    renderCard(state, handlers),
    renderInstructionStrip(),
  );
  const sourceNotes = renderSourceNotes(state);
  if (sourceNotes !== undefined) {
    shell.append(sourceNotes);
  }
  root.append(shell);
}
