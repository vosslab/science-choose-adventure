import { validateContent } from "./content_validation";
import { choose, createInitialState, type GameState } from "./engine";
import { attachInputController } from "./input_controller";
import { clearGameState, loadGameState, saveGameState } from "./storage";
import { render } from "./ui_renderer";

function rootElement(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) {
    throw new Error("Missing #app root element.");
  }
  return root;
}

function main(): void {
  const issues = validateContent();
  if (issues.length > 0) {
    const messages = issues.map((issue) => issue.message).join("; ");
    throw new Error(`Content validation failed: ${messages}`);
  }

  const root = rootElement();
  let state: GameState = loadGameState(window.localStorage);

  // Advance state, persist it, then re-render so the saved state and the display stay in sync.
  function commit(nextState: GameState): void {
    state = nextState;
    saveGameState(window.localStorage, state);
    render(root, state, handlers);
  }

  const handlers = {
    choose(choiceIndex: 0 | 1): void {
      // On the result screen the run is complete; ignore stray choice events.
      if (state.phase === "result") {
        return;
      }
      commit(choose(state, choiceIndex));
    },
    restart(): void {
      commit(createInitialState());
    },
    reset(): void {
      clearGameState(window.localStorage);
      state = createInitialState();
      render(root, state, handlers);
    },
  };

  attachInputController(root, handlers);
  render(root, state, handlers);
}

main();
