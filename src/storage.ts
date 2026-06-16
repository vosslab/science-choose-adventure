import { saveSlotId, type SaveSlotId } from "./brands";
import { SCIENTIST_IDS, STAT_IDS, type EndingType, type ScientistId } from "./config";
import { createInitialState, type GameState, type RouteScores, type StatValues } from "./engine";

const SAVE_VERSION = 1;
const STORAGE_KEY = "science_career_survival:v1";
const SAVE_SLOT = saveSlotId(STORAGE_KEY);

type SaveFileV1 = {
  readonly version: 1;
  readonly state: GameState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  const isObjectRecord = typeof value === "object" && value !== null && !Array.isArray(value);
  return isObjectRecord;
}

function isScientistId(value: unknown): value is ScientistId {
  if (typeof value !== "string") {
    return false;
  }
  for (const scientistId of SCIENTIST_IDS) {
    if (value === scientistId) {
      return true;
    }
  }
  return false;
}

function isStatValues(value: unknown): value is StatValues {
  if (!isRecord(value)) {
    return false;
  }
  for (const statId of STAT_IDS) {
    if (typeof value[statId] !== "number") {
      return false;
    }
  }
  return true;
}

function isRouteScores(value: unknown): value is RouteScores {
  if (!isRecord(value)) {
    return false;
  }
  for (const scientistId of SCIENTIST_IDS) {
    if (typeof value[scientistId] !== "number") {
      return false;
    }
  }
  return true;
}

function isStringArray(value: unknown): value is readonly string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const everyString = value.every((entry) => typeof entry === "string");
  return everyString;
}

function isChoiceIndex(value: unknown): value is 0 | 1 {
  const validChoiceIndex = value === 0 || value === 1;
  return validChoiceIndex;
}

function isEndingType(value: unknown): value is EndingType {
  const validEnding =
    value === "balanced_legacy" ||
    value === "evidence_burnout" ||
    value === "institutional_capture" ||
    value === "reckless_velocity";
  return validEnding;
}

function isCollapseReason(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const hasStat =
    typeof value.stat === "string" && STAT_IDS.some((statId) => statId === value.stat);
  const hasBand = value.band === "low" || value.band === "high";
  const hasMessage = typeof value.message === "string";
  const validCollapse = hasStat && hasBand && hasMessage;
  return validCollapse;
}

function isLastEffectMagnitude(value: unknown): value is string | undefined {
  const validMagnitude = value === undefined || typeof value === "string";
  return validMagnitude;
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }
  if (!isRouteScores(value.routeScores) || !isStatValues(value.stats)) {
    return false;
  }
  if (!isStringArray(value.unlockedExtras)) {
    return false;
  }
  if (!isLastEffectMagnitude(value.lastEffectMagnitude)) {
    return false;
  }
  if (value.phase === "prologue") {
    return typeof value.prologueIndex === "number";
  }
  if (value.phase === "path") {
    return isScientistId(value.scientistId) && typeof value.cardIndex === "number";
  }
  if (value.phase === "ending") {
    const hasCollapse =
      value.collapse === undefined || value.collapse === null || isCollapseReason(value.collapse);
    return isScientistId(value.scientistId) && isEndingType(value.endingType) && hasCollapse;
  }
  return false;
}

function isSaveFileV1(value: unknown): value is SaveFileV1 {
  if (!isRecord(value)) {
    return false;
  }
  const validSave = value.version === SAVE_VERSION && isGameState(value.state);
  return validSave;
}

export function storageSlot(): SaveSlotId {
  return SAVE_SLOT;
}

export function loadGameState(storage: Storage): GameState {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return createInitialState();
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isSaveFileV1(parsed)) {
    throw new Error("Stored game state has an unsupported shape.");
  }
  return parsed.state;
}

export function saveGameState(storage: Storage, state: GameState): void {
  const saveFile: SaveFileV1 = { version: SAVE_VERSION, state };
  storage.setItem(STORAGE_KEY, JSON.stringify(saveFile));
}

export function clearGameState(storage: Storage): void {
  storage.removeItem(STORAGE_KEY);
}

export function resetGameState(storage: Storage): GameState {
  clearGameState(storage);
  const state = createInitialState();
  return state;
}

export function normalizeChoiceIndex(index: number): 0 | 1 {
  if (!isChoiceIndex(index)) {
    throw new Error(`Choice index must be 0 or 1, got ${index}.`);
  }
  return index;
}
