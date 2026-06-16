import { SCIENTIST_IDS, STAT_IDS, type ScientistId } from "./config";
import {
  createInitialState,
  type GameState,
  type RankingEntry,
  type StatValues,
  type StrainLine,
} from "./engine";

const SAVE_VERSION = 2;
const STORAGE_KEY = "science_career_survival:v2";

type SaveFileV2 = {
  readonly version: 2;
  readonly state: GameState;
};

//============================================
// Type guard helpers
//============================================

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
  // Every expected stat key must be present and numeric; extra keys are tolerated.
  for (const statId of STAT_IDS) {
    if (typeof value[statId] !== "number") {
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

function isLastEffectMagnitude(value: unknown): value is string | undefined {
  // The field is optional: undefined means no choice has been made yet this run.
  const validMagnitude = value === undefined || typeof value === "string";
  return validMagnitude;
}

// Validate one entry in the result-phase resemblance ranking.
function isRankingEntry(value: unknown): value is RankingEntry {
  if (!isRecord(value)) {
    return false;
  }
  const validEntry = isScientistId(value.scientistId) && typeof value.distance === "number";
  return validEntry;
}

function isRankingArray(value: unknown): value is readonly RankingEntry[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const everyEntry = value.every((entry) => isRankingEntry(entry));
  return everyEntry;
}

// Validate the strain array: each element must be a well-shaped low-band strain entry.
// The engine type (StrainLine) declares band: "low" and strainLines() only ever emits
// "low"; high-band strain no longer exists in the model and is not a valid save value.
function isStrainArray(value: unknown): value is readonly StrainLine[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const everyElement = value.every((entry) => {
    if (!isRecord(entry)) {
      return false;
    }
    const hasStat = typeof entry.stat === "string" && STAT_IDS.some((id) => id === entry.stat);
    const hasBand = entry.band === "low";
    const hasLine = typeof entry.line === "string";
    return hasStat && hasBand && hasLine;
  });
  return everyElement;
}

//============================================
// GameState type guard (new run/result union)
//============================================

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }
  // Fields common to both phases.
  if (!isStatValues(value.stats)) {
    return false;
  }
  if (typeof value.seed !== "number") {
    return false;
  }
  if (typeof value.answeredCount !== "number") {
    return false;
  }
  if (!isStringArray(value.askedIds)) {
    return false;
  }
  if (!isLastEffectMagnitude(value.lastEffectMagnitude)) {
    return false;
  }
  if (!isStrainArray(value.strain)) {
    return false;
  }
  if (!isStringArray(value.unlockedExtras)) {
    return false;
  }
  // Phase-specific fields.
  if (value.phase === "run") {
    // The run phase has no additional required fields beyond the shared ones above.
    return true;
  }
  if (value.phase === "result") {
    // The result phase adds a matched scientist, ranking, and plain-language explanation.
    const hasScientist = isScientistId(value.scientistId);
    const hasRanking = isRankingArray(value.ranking);
    const hasExplanation = typeof value.explanation === "string";
    return hasScientist && hasRanking && hasExplanation;
  }
  // Unknown phase (old v1 "prologue"/"path"/"ending" or any future shape): reject.
  return false;
}

function isSaveFileV2(value: unknown): value is SaveFileV2 {
  if (!isRecord(value)) {
    return false;
  }
  // Reject any save file whose version does not match this slot's expected version.
  // Old v1 blobs have version: 1 and will correctly fail here, triggering a fresh run.
  const validSave = value.version === SAVE_VERSION && isGameState(value.state);
  return validSave;
}

//============================================
// Public API
//============================================

export function loadGameState(storage: Storage): GameState {
  const raw = storage.getItem(STORAGE_KEY);
  // No save present: start a fresh run.
  if (raw === null) {
    return createInitialState();
  }
  // Malformed JSON or wrong version/shape: start a fresh run rather than crashing.
  // Old v1 saves (phase: "prologue"/"path"/"ending", routeScores, collapse) will fail
  // isSaveFileV2 and land here -- that is the intended no-migration behavior.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createInitialState();
  }
  if (!isSaveFileV2(parsed)) {
    return createInitialState();
  }
  return parsed.state;
}

export function saveGameState(storage: Storage, state: GameState): void {
  const saveFile: SaveFileV2 = { version: SAVE_VERSION, state };
  storage.setItem(STORAGE_KEY, JSON.stringify(saveFile));
}

export function clearGameState(storage: Storage): void {
  storage.removeItem(STORAGE_KEY);
}
