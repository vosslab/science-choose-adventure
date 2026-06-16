import {
  PROLOGUE_THEME,
  RUN_LENGTH,
  SCIENTIST_CONFIG,
  STAT_CONFIG,
  STAT_IDS,
  STAT_STEP_COUNT,
  lowRisk,
  scientistTheme,
  statBand,
  statStep,
  type LowRisk,
  type EffectDirection,
  type ScientistId,
  type StatId,
  type ThemePalette,
} from "./config";
import { SCIENTIST_SOURCE_NOTES, type SourceNote } from "./content";
import { currentVisibleCard, type GameState, type StatValues, type StrainLine } from "./engine";

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

// Build ChoiceView pairs for the run phase. VisibleCard exposes choice labels only; per-choice
// effect data for the drag controller is encoded in card.dataset.left/right by the run renderer,
// so effect arrays here are empty by design.
function currentChoicesWithEffects(
  state: Extract<GameState, { phase: "run" }>,
): readonly [ChoiceView, ChoiceView] | undefined {
  const visibleCard = currentVisibleCard(state);
  if (visibleCard.kind !== "run") {
    return undefined;
  }
  const choices: readonly [ChoiceView, ChoiceView] = [
    {
      label: visibleCard.choices[0],
      magnitude: "",
      effects: [],
    },
    {
      label: visibleCard.choices[1],
      magnitude: "",
      effects: [],
    },
  ];
  return choices;
}

// The run phase uses the neutral parchment theme throughout; no scientist identity leaks.
// Only the result screen switches to the matched scientist's theme, so the reveal carries
// that scientist's color while the run stays neutral.
function activeTheme(state: GameState): ThemePalette {
  if (state.phase === "result") {
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

// Progress eyebrow: "Question k of RUN_LENGTH" where k = answeredCount + 1 clamped to RUN_LENGTH.
// No scientist name or identifying term appears here during the run phase.
function runPhaseLabel(answeredCount: number): string {
  const questionNumber = Math.min(answeredCount + 1, RUN_LENGTH);
  const label = `Question ${questionNumber} of ${RUN_LENGTH}`;
  return label;
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

// Visual tone for a stat meter. The low tiers warn (bad = red, warn = amber); a high
// stat reads as "good" (positive accent) and everything in between reads as "ok"
// (neutral fill). High is never a warning in the no-lose resemblance model.
type MeterTone = "bad" | "warn" | "good" | "ok";

function meterTone(value: number): MeterTone {
  const risk: LowRisk = lowRisk(value);
  if (risk === "bad") {
    return "bad";
  }
  if (risk === "warn") {
    return "warn";
  }
  if (statBand(value) === "high") {
    return "good";
  }
  return "ok";
}

function renderStats(stats: StatValues): HTMLElement {
  const wrapper = makeElement("section", "stats", undefined);
  wrapper.setAttribute("aria-label", "Four career pressures");
  for (const statId of STAT_ORDER) {
    const statConfig = STAT_CONFIG[statId];
    const step = statStep(stats[statId]);
    // Meter color follows the low-pressure tier (bad/warn/ok), not the symmetric band:
    // only low values warn, and high values read as fine. tone keeps "high" as a
    // positive accent so high stats look good rather than neutral.
    const tone = meterTone(stats[statId]);
    const item = makeElement("div", "stat", undefined);
    item.dataset.statItem = statId;
    const label = makeElement("span", "stat__label", statConfig.label);
    const meter = makeElement("span", `stat__meter stat__meter--${tone}`, undefined);
    // data-stat lets the drag controller light up this meter while a choice is held.
    meter.dataset.stat = statId;
    meter.setAttribute("role", "img");
    // The blurb rides along in both the title (hover tooltip) and the aria-label
    // (screen readers), so each C explains itself without a separate help block.
    const meterDescription =
      `${statConfig.label} is step ${step} of ${STAT_STEP_COUNT}, ${statBandLabel(stats[statId])}. ` +
      statConfig.blurb;
    meter.title = statConfig.blurb;
    meter.setAttribute("aria-label", meterDescription);
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

// Render soft-tension strain lines below the meters. Each line describes a stat that has
// drifted into an extreme band. Styled as descriptive flavor, not a fail warning.
// Class "strain" on the container, "strain__line" on each line element, so CSS and
// Playwright can target them by class name.
function renderStrainLines(strainLineList: readonly StrainLine[]): HTMLElement | undefined {
  if (strainLineList.length === 0) {
    return undefined;
  }
  const container = makeElement("div", "strain", undefined);
  container.setAttribute("aria-label", "Career strain notes");
  for (const strainLine of strainLineList) {
    const line = makeElement("p", "strain__line", strainLine.line);
    // data-stat and data-band let CSS and Playwright target specific strain states.
    line.dataset.stat = strainLine.stat;
    line.dataset.band = strainLine.band;
    container.append(line);
  }
  return container;
}

// Meter-color legend only. The separate stability banner was removed: it duplicated the
// low-only strain lines below the meters, so the strain lines are now the single
// low-pressure surface and this legend just explains the meter colors. Red marks a stat
// running very low, amber marks one getting low; higher fills are fine and high is good.
function renderLegend(): HTMLElement {
  const legend = makeElement("p", "legend", undefined);
  legend.append(
    document.createTextNode("Meters: "),
    makeElement("b", "", "red"),
    document.createTextNode(" marks a stat running low, "),
    makeElement("b", "", "amber"),
    document.createTextNode(" is getting low. Higher is fine; a full meter is a strength."),
  );
  return legend;
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
  // Show magnitude in meta text only when available (run phase uses lastEffectMagnitude separately).
  const metaText =
    choice.magnitude.length > 0
      ? `${hint} / ${key} / ${choice.magnitude} effect`
      : `${hint} / ${key}`;
  button.append(
    makeElement("span", "choice-button__direction", index === 0 ? "Left" : "Right"),
    makeElement("span", "choice-button__label", choice.label),
    renderEffectTags(choice.effects),
    makeElement("span", "choice-button__meta", metaText),
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

// Render the run-phase decision card. No scientist name or identifying term appears here.
function renderRunCard(
  state: Extract<GameState, { phase: "run" }>,
  choices: readonly [ChoiceView, ChoiceView],
): HTMLElement {
  const visibleCard = currentVisibleCard(state);
  const prompt = visibleCard.kind === "run" ? visibleCard.prompt : "";
  // Nudge only the very first card so new players see that it shifts and is draggable.
  const isFirstCard = state.answeredCount === 0;
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

  // Progress eyebrow: "Question k of RUN_LENGTH" -- no scientist name appears here.
  const eyebrow = runPhaseLabel(state.answeredCount);

  card.append(
    renderCardEdge("left", choices[0].label),
    renderCardEdge("right", choices[1].label),
    makeElement("p", "eyebrow", eyebrow),
    makeElement("p", "card__text", prompt),
    makeElement("p", "effect-hint", effectText),
  );
  return card;
}

// Headline plus the matched scientist's research field, so the reveal names who the player
// resembles and what that scientist worked on. The headline "You most resemble {name}" comes
// straight from the engine's VisibleCard, so the UI never re-derives the match wording.
function renderResultHeadline(headline: string, scientistId: ScientistId): HTMLElement {
  const group = makeElement("div", "result-headline", undefined);
  const headlineEl = makeElement("h2", "result-headline__title", headline);
  const field = SCIENTIST_CONFIG[scientistId].field;
  const fieldEl = makeElement("p", "result-headline__field", `Field: ${field}`);
  group.append(headlineEl, fieldEl);
  return group;
}

// The engine's plain-language explanation sentence (for example "...because curiosity and care
// stayed high while cash stayed low"). Rendered verbatim; the UI does not compute its own.
function renderResultExplanation(explanationText: string): HTMLElement {
  const block = makeElement("p", "result-explanation", explanationText);
  return block;
}

// The matched scientist's per-C signature rationale: one line per stat, in STAT_IDS order,
// pairing each stat label with the hand-authored reason from SCIENTIST_SIGNATURE.
function renderResultRationale(rationale: Record<StatId, string>): HTMLElement {
  const block = makeElement("section", "rationale", undefined);
  block.setAttribute("aria-label", "Why this match");
  block.append(makeElement("h3", "rationale__heading", "Why this match"));
  const list = makeElement("dl", "rationale__list", undefined);
  for (const statId of STAT_IDS) {
    const term = makeElement("dt", "rationale__stat", STAT_CONFIG[statId].label);
    const detail = makeElement("dd", "rationale__reason", rationale[statId]);
    list.append(term, detail);
  }
  block.append(list);
  return block;
}

// The ordered resemblance ranking, names only -- no raw distance numbers. The engine already
// sorts the list nearest-first, so the first entry is the match and is marked with a modifier
// class for CSS and Playwright. data-scientist carries the id for targeting without exposing
// any number to the player.
function renderResultRanking(
  ranking: readonly { readonly scientistId: ScientistId; readonly name: string }[],
): HTMLElement {
  const block = makeElement("section", "ranking", undefined);
  block.setAttribute("aria-label", "Resemblance ranking");
  block.append(makeElement("h3", "ranking__heading", "Closest matches"));
  const list = makeElement("ol", "ranking__list", undefined);
  for (const [index, entry] of ranking.entries()) {
    const isMatch = index === 0;
    const itemClass = isMatch ? "ranking__item ranking__item--match" : "ranking__item";
    const item = makeElement("li", itemClass, undefined);
    item.dataset.scientist = entry.scientistId;
    item.append(makeElement("span", "ranking__name", entry.name));
    if (isMatch) {
      // Label the leader as the match in words, never with a distance value.
      item.append(makeElement("span", "ranking__match-tag", "match"));
    }
    list.append(item);
  }
  block.append(list);
  return block;
}

// The matched scientist's unlocked source notes as a list of external links. Only rendered
// when the engine has unlocked them (the "{scientistId}:source_notes" token in unlockedExtras),
// keeping the educational payload gated on reaching the reveal. Links open with rel="noreferrer".
function renderResultSourceNotes(notes: readonly SourceNote[]): HTMLElement {
  const block = makeElement("section", "source-notes", undefined);
  block.setAttribute("aria-label", "Source notes");
  block.append(makeElement("h3", "source-notes__heading", "Source notes"));
  const list = makeElement("ul", "source-notes__list", undefined);
  for (const note of notes) {
    const item = makeElement("li", "source-notes__item", undefined);
    const link = makeElement("a", "source-notes__link", note.label);
    link.href = note.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    item.append(link);
    list.append(item);
  }
  block.append(list);
  return block;
}

function renderResultActions(handlers: RenderHandlers): HTMLElement {
  const endingActions = makeElement("div", "ending-actions", undefined);
  const restart = makeElement("button", "primary-action", "Restart run");
  restart.type = "button";
  restart.addEventListener("click", handlers.restart);
  const reset = makeElement("button", "secondary-action", "Reset save");
  reset.type = "button";
  reset.addEventListener("click", handlers.reset);
  endingActions.append(restart, reset);
  return endingActions;
}

// Full result reveal: matched scientist (headline + field + theme), the engine's
// plain-language explanation, the per-C signature rationale, the ordered name ranking
// (names only, no distances), the unlocked source notes, and Restart/Reset actions.
function renderResultCard(
  state: Extract<GameState, { phase: "result" }>,
  handlers: RenderHandlers,
): HTMLElement {
  const visibleCard = currentVisibleCard(state);
  // currentVisibleCard returns the "result" kind for a result-phase state; the guard keeps
  // the types narrow and provides safe fallbacks should the contract ever change.
  if (visibleCard.kind !== "result") {
    throw new Error("Result phase expects a result visible card.");
  }

  const card = makeElement("section", "card card--result", undefined);
  card.setAttribute("aria-live", "polite");
  card.setAttribute("aria-label", "Result card");

  card.append(
    renderResultHeadline(visibleCard.headline, visibleCard.scientistId),
    renderResultExplanation(visibleCard.explanation),
    renderResultRationale(visibleCard.rationale),
    renderResultRanking(visibleCard.ranking),
  );

  // Source notes appear only when the engine unlocked them for the matched scientist.
  const unlockToken = `${visibleCard.scientistId}:source_notes`;
  if (state.unlockedExtras.includes(unlockToken)) {
    const notes = SCIENTIST_SOURCE_NOTES[visibleCard.scientistId];
    card.append(renderResultSourceNotes(notes));
  }

  card.append(renderResultActions(handlers));
  return card;
}

function renderStage(state: GameState, handlers: RenderHandlers): HTMLElement {
  const stage = makeElement("div", "card-stage", undefined);
  // Two static ghost cards behind the live card create Reigns-style deck depth.
  stage.append(
    makeElement("div", "card-ghost card-ghost--back", undefined),
    makeElement("div", "card-ghost card-ghost--front", undefined),
  );

  if (state.phase === "result") {
    stage.append(renderResultCard(state, handlers));
    return stage;
  }

  // Run phase: draw choices and render the draggable decision card.
  const choices = currentChoicesWithEffects(state);
  if (choices === undefined) {
    throw new Error("Choices are required during run phase.");
  }
  stage.append(renderChoiceRail(choices, handlers));
  stage.insertBefore(renderRunCard(state, choices), stage.querySelector(".choice-rail"));
  return stage;
}

function renderHeader(state: GameState, handlers: RenderHandlers): HTMLElement {
  const header = makeElement("header", "game-header", undefined);
  const headingGroup = makeElement("div", "heading-group", undefined);
  const title = makeElement("h1", "game-title", "Science Career Survival");
  // Neutral subtitle throughout the run -- no scientist identity revealed until result.
  const subtitle = makeElement(
    "p",
    "game-subtitle",
    "Your choices reveal which scientist your career style resembles.",
  );
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
  // Scientist identity is NOT stamped on the shell during the run phase. The data-scientist
  // attribute is set only on the result screen so no CSS or JS exposes it mid-run.
  if (state.phase === "result") {
    shell.dataset.scientist = state.scientistId;
  }
  applyTheme(shell, activeTheme(state));

  // Header (title, subtitle, controls) and the final 4C meters show in both phases. The
  // meters double as the run-end profile snapshot the resemblance match is read from.
  shell.append(renderHeader(state, handlers), renderStats(state.stats));

  // Run-only furniture (meter legend, input strip) describes the live decision loop, so it
  // is skipped on the result screen where there is no card to play. Per-stat meaning now
  // lives in each meter's tooltip, and the low-only strain lines below cover any pressure,
  // so no separate stability banner or per-stat help block is needed.
  if (state.phase === "run") {
    shell.append(renderLegend());
  }

  // Strain lines appear below the meters when at least one stat is in an extreme band.
  // Rendered during both run and result phases so texture carries through to the reveal.
  const strainEl = renderStrainLines(state.strain);
  if (strainEl !== undefined) {
    shell.append(strainEl);
  }

  shell.append(renderStage(state, handlers));
  if (state.phase === "run") {
    shell.append(renderInstructionStrip());
  }

  root.append(shell);
}
