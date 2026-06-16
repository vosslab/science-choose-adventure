export type InputHandlers = {
  readonly choose: (choiceIndex: 0 | 1) => void;
  readonly restart: () => void;
  readonly reset: () => void;
};

type DragSession = {
  readonly card: HTMLElement;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly commitPixels: number;
};

// Minimum horizontal travel before a side starts to light up.
const ACTIVATE_PIXELS = 54;
// Fraction of card width that must be crossed to commit a choice on release.
const COMMIT_FRACTION = 0.32;
const COMMIT_MINIMUM_PIXELS = 92;
// How long the fly-off animation runs before the choice is applied.
const FLY_OFF_MS = 200;
const MAX_TILT_DEGREES = 16;

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const interactive = target.closest("button, a, summary, input, textarea");
  return interactive !== null;
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  const textInput = tagName === "input" || tagName === "textarea" || target.isContentEditable;
  return textInput;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseSideEffects(encoded: string | undefined): readonly { stat: string; rise: boolean }[] {
  if (encoded === undefined || encoded.length === 0) {
    return [];
  }
  const entries = encoded.split(",").flatMap((part) => {
    const [stat, direction] = part.split(":");
    if (stat === undefined || stat.length === 0) {
      return [];
    }
    return [{ stat, rise: direction === "up" }];
  });
  return entries;
}

export function attachInputController(root: HTMLElement, handlers: InputHandlers): void {
  let session: DragSession | undefined = undefined;
  let busy = false;
  const glowing = new Set<HTMLElement>();

  function clearGlow(): void {
    for (const meter of glowing) {
      meter.classList.remove("stat__meter--rise", "stat__meter--fall");
    }
    glowing.clear();
  }

  function setGlow(side: "left" | "right"): void {
    if (session === undefined) {
      return;
    }
    clearGlow();
    const encoded = side === "left" ? session.card.dataset.left : session.card.dataset.right;
    for (const effect of parseSideEffects(encoded)) {
      const meter = root.querySelector<HTMLElement>(`.stat__meter[data-stat="${effect.stat}"]`);
      if (meter === null) {
        continue;
      }
      meter.classList.add(effect.rise ? "stat__meter--rise" : "stat__meter--fall");
      glowing.add(meter);
    }
  }

  function setEdgeOpacity(dx: number, commitPixels: number): void {
    if (session === undefined) {
      return;
    }
    const left = session.card.querySelector<HTMLElement>(".card__edge--left");
    const right = session.card.querySelector<HTMLElement>(".card__edge--right");
    if (left !== null) {
      left.style.opacity = String(clamp(-dx / commitPixels, 0, 1));
    }
    if (right !== null) {
      right.style.opacity = String(clamp(dx / commitPixels, 0, 1));
    }
  }

  function resetCardVisuals(): void {
    if (session === undefined) {
      return;
    }
    clearGlow();
    setEdgeOpacity(0, session.commitPixels);
    session.card.classList.remove("card--active-left", "card--active-right");
  }

  function endDrag(): void {
    session = undefined;
  }

  root.addEventListener("pointerdown", (event) => {
    if (busy || session !== undefined) {
      return;
    }
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (isInteractive(event.target)) {
      return;
    }
    const card = event.target.closest<HTMLElement>(".card--draggable");
    if (card === null) {
      return;
    }
    const commitPixels = Math.max(COMMIT_MINIMUM_PIXELS, card.clientWidth * COMMIT_FRACTION);
    session = {
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      commitPixels,
    };
    card.setPointerCapture(event.pointerId);
    card.classList.add("card--dragging");
    card.classList.remove("card--spring");
  });

  root.addEventListener("pointermove", (event) => {
    if (session === undefined || event.pointerId !== session.pointerId) {
      return;
    }
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    const tilt = clamp(dx * 0.05, -MAX_TILT_DEGREES, MAX_TILT_DEGREES);
    // Cap visual travel so the card and its answer banner stay on screen.
    const maxTravel = session.card.clientWidth * 0.5;
    const visualX = clamp(dx, -maxTravel, maxTravel);
    session.card.style.transform = `translateX(${visualX}px) rotate(${tilt}deg)`;
    setEdgeOpacity(dx, session.commitPixels);

    const past = Math.abs(dx) >= ACTIVATE_PIXELS && Math.abs(dx) > Math.abs(dy);
    session.card.classList.toggle("card--active-left", past && dx < 0);
    session.card.classList.toggle("card--active-right", past && dx > 0);
    if (past) {
      setGlow(dx < 0 ? "left" : "right");
    } else {
      clearGlow();
    }
  });

  function finishDrag(event: PointerEvent): void {
    if (session === undefined || event.pointerId !== session.pointerId) {
      return;
    }
    const active = session;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    active.card.classList.remove("card--dragging");
    if (active.card.hasPointerCapture(event.pointerId)) {
      active.card.releasePointerCapture(event.pointerId);
    }

    const committed = Math.abs(dx) >= active.commitPixels && Math.abs(dx) > Math.abs(dy);
    if (committed) {
      const choiceIndex: 0 | 1 = dx < 0 ? 0 : 1;
      busy = true;
      active.card.classList.add(dx < 0 ? "card--fly-left" : "card--fly-right");
      clearGlow();
      window.setTimeout(() => {
        busy = false;
        handlers.choose(choiceIndex);
      }, FLY_OFF_MS);
      endDrag();
      return;
    }

    // Under threshold: spring the card back to center and drop all hints.
    active.card.classList.add("card--spring");
    active.card.style.transform = "";
    resetCardVisuals();
    endDrag();
  }

  root.addEventListener("pointerup", finishDrag);
  root.addEventListener("pointercancel", finishDrag);

  window.addEventListener("keydown", (event) => {
    if (isTextInput(event.target)) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      handlers.choose(0);
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      handlers.choose(1);
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      handlers.restart();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handlers.reset();
    }
  });
}
