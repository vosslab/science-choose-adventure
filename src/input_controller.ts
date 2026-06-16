export type InputHandlers = {
  readonly choose: (choiceIndex: 0 | 1) => void;
  readonly restart: () => void;
  readonly reset: () => void;
};

type PointerStart = {
  readonly x: number;
  readonly y: number;
};

const SWIPE_MINIMUM_PIXELS = 52;

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  const textInput = tagName === "input" || tagName === "textarea" || target.isContentEditable;
  return textInput;
}

export function attachInputController(root: HTMLElement, handlers: InputHandlers): void {
  let pointerStart: PointerStart | undefined = undefined;

  root.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  root.addEventListener("pointercancel", () => {
    pointerStart = undefined;
  });

  root.addEventListener("pointerup", (event) => {
    if (pointerStart === undefined) {
      return;
    }
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = undefined;
    if (Math.abs(dx) < SWIPE_MINIMUM_PIXELS || Math.abs(dx) < Math.abs(dy)) {
      return;
    }
    const choiceIndex = dx < 0 ? 0 : 1;
    handlers.choose(choiceIndex);
  });

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
