import {
  SCIENTIST_CONFIG,
  SCIENTIST_IDS,
  SCIENTIST_SIGNATURE,
  STAT_IDS,
  signatureWeights,
  type ScientistId,
  type StatId,
} from "./config";
import type { RankingEntry, StatValues } from "./engine";

// ============================================================================
// Signature ranking
// ============================================================================

// Blend weight for the cosine-similarity term in the combined resemblance score. The metric is
// distance-dominant with a small cosine term: the weighted z-score distance is the primary
// signal, and cosine only nudges apart runs whose normalized distances are close but whose
// profile shapes differ. 0.25 keeps the cosine contribution
// (cosine distance is in [0, 1] for these non-negative stat vectors) well below the z-score
// distance term (typically order 1 to 3 across the four axes), so distance stays dominant.
const COSINE_BLEND_WEIGHT = 0.25;

// Per-axis mean and population standard deviation of a pool's signature values.
type AxisNormalizers = {
  mean: Record<StatId, number>;
  stddev: Record<StatId, number>;
};

// Build a fresh Record<StatId, number> with every axis set to 0. Used as the seed for the
// normalizer maps so each axis key exists before it is filled in.
function blankStatRecord(): Record<StatId, number> {
  const record = Object.fromEntries(STAT_IDS.map((statId) => [statId, 0]));
  return record as Record<StatId, number>;
}

// Compute per-axis mean and population standard deviation across a pool's signature values.
// These normalize each axis to a z-score so an axis with naturally wide spread does not
// dominate the distance purely because of its raw scale. Population stddev (divide by N) is
// used, not sample stddev, because the pool is the entire reference set, not a sample drawn
// from a larger population.
function computeAxisNormalizers(pool: readonly ScientistId[]): AxisNormalizers {
  const count = pool.length;
  const mean = blankStatRecord();
  const stddev = blankStatRecord();
  // An empty pool cannot define a distribution. Leave every axis at mean 0, stddev 0 so the
  // zero-variance guard downstream contributes nothing rather than dividing by zero. The real
  // pools (celebrated, disgraced) are never empty; this only protects a degenerate caller.
  if (count === 0) {
    return { mean, stddev };
  }
  for (const statId of STAT_IDS) {
    // Mean of this axis across every signature in the pool.
    let sum = 0;
    for (const scientistId of pool) {
      sum += SCIENTIST_SIGNATURE[scientistId].values[statId];
    }
    const axisMean = sum / count;
    mean[statId] = axisMean;
    // Population variance: the average squared deviation from the axis mean.
    let sumSquaredDeviation = 0;
    for (const scientistId of pool) {
      const deviation = SCIENTIST_SIGNATURE[scientistId].values[statId] - axisMean;
      sumSquaredDeviation += deviation * deviation;
    }
    stddev[statId] = Math.sqrt(sumSquaredDeviation / count);
  }
  return { mean, stddev };
}

// Cosine similarity between the raw stats vector and a raw signature vector. Cosine is a
// shape/direction measure, so it deliberately uses the raw 4C values, not the z-scored axes:
// it answers "does this run lean the same way as the signature" independent of overall
// magnitude. Returns 0 when either vector has zero length (an undefined direction), which the
// caller reads as maximal dissimilarity.
function computeCosineSimilarity(stats: StatValues, signature: Record<StatId, number>): number {
  let dot = 0;
  let statsNormSquared = 0;
  let signatureNormSquared = 0;
  for (const statId of STAT_IDS) {
    const statValue = stats[statId];
    const signatureValue = signature[statId];
    dot += statValue * signatureValue;
    statsNormSquared += statValue * statValue;
    signatureNormSquared += signatureValue * signatureValue;
  }
  const denominator = Math.sqrt(statsNormSquared) * Math.sqrt(signatureNormSquared);
  // Guard a zero-length vector: its direction is undefined, so report no similarity.
  if (denominator === 0) {
    return 0;
  }
  return dot / denominator;
}

// Combined resemblance score between a 4C run and a scientist's signature: lower means a
// closer match. The score blends two terms:
//   1. A weighted z-score distance. Each axis delta is normalized by the active pool's per-axis
//      mean and population stddev, squared, and multiplied by that scientist's per-axis weight
//      from signatureWeights(). A zero-variance axis (every pool signature shares one value)
//      contributes nothing, which also avoids dividing by zero.
//   2. A small cosine-distance term (1 - cosine similarity) on the raw vectors, scaled by
//      COSINE_BLEND_WEIGHT.
// The pool defaults to the celebrated roster to mirror rankSignatures' default, so a bare
// two-argument call normalizes against the same reference an honest run uses. A point sitting
// exactly on a signature gets a zero distance term and a zero cosine-distance term, so its
// combined score is 0 while every other scientist scores above 0: the matched scientist ranks
// first. Any axis on which another scientist differs from that exact point has positive
// variance, so the zero-variance guard can never erase a discriminating axis.
export function signatureDistance(
  stats: StatValues,
  scientistId: ScientistId,
  pool: readonly ScientistId[] = celebratedIds(),
): number {
  // Pool-membership guard: the z-score normalizers are derived from `pool`, so ranking a
  // scientist that is not in `pool` normalizes against the wrong reference distribution and
  // silently returns a misleading distance. Fail loudly instead. The guard runs once here at
  // the public boundary, never inside the per-scientist normalizer loop, so a pool-internal
  // ranking (rankSignatures, which only ever passes pool members) pays no per-iteration cost.
  if (!pool.includes(scientistId)) {
    throw new Error(
      `signatureDistance: scientist "${scientistId}" is not in the supplied pool ` +
        `[${pool.join(", ")}]; its distance would be normalized against the wrong distribution.`,
    );
  }
  // The normalizers depend only on the pool, so compute them here for a standalone call.
  const normalizers = computeAxisNormalizers(pool);
  const combinedScore = signatureDistanceWithNormalizers(stats, scientistId, normalizers);
  return combinedScore;
}

// Core resemblance computation shared by signatureDistance and rankSignatures. The pool-derived
// normalizers are passed in so a ranking over a constant pool computes them once instead of once
// per scientist. Behavior is identical to computing them inside signatureDistance.
function signatureDistanceWithNormalizers(
  stats: StatValues,
  scientistId: ScientistId,
  normalizers: AxisNormalizers,
): number {
  const signature = SCIENTIST_SIGNATURE[scientistId].values;
  const weights = signatureWeights(scientistId);
  let weightedSumSquares = 0;
  for (const statId of STAT_IDS) {
    const axisStddev = normalizers.stddev[statId];
    // Skip a zero-variance axis: it carries no discriminating information and would divide by
    // zero. Every axis that separates two distinct signatures has positive variance, so a
    // discriminating axis is never skipped.
    if (axisStddev === 0) {
      continue;
    }
    // Z-score the axis delta, then weight the squared term per scientist.
    const zScore = (stats[statId] - signature[statId]) / axisStddev;
    weightedSumSquares += weights[statId] * zScore * zScore;
  }
  const distanceTerm = Math.sqrt(weightedSumSquares);
  // Cosine distance is 0 when the run points exactly along the signature direction.
  const cosineSimilarity = computeCosineSimilarity(stats, signature);
  const cosineDistance = 1 - cosineSimilarity;
  const combinedScore = distanceTerm + COSINE_BLEND_WEIGHT * cosineDistance;
  return combinedScore;
}

// The celebrated resemblance targets: the pool an honest run matches against.
export function celebratedIds(): readonly ScientistId[] {
  const ids = SCIENTIST_IDS.filter((id) => SCIENTIST_CONFIG[id].kind === "celebrated");
  return ids;
}

// The disgraced cautionary cases: the pool the downfall branch matches against.
export function disgracedIds(): readonly ScientistId[] {
  const ids = SCIENTIST_IDS.filter((id) => SCIENTIST_CONFIG[id].kind === "disgraced");
  return ids;
}

// Sort one pool of scientists by ascending combined resemblance score. The pool is the subset
// to rank within (celebrated or disgraced); it defaults to the celebrated pool, never the mixed
// roster, so a caller that omits the pool cannot accidentally rank the two pools together. The
// same pool feeds signatureDistance, so every entry is z-score normalized against the same
// reference distribution. Ties break by the fixed SCIENTIST_IDS order so the ranking (and the
// named leader) is fully deterministic regardless of the pool's order.
export function rankSignatures(
  stats: StatValues,
  pool: readonly ScientistId[] = celebratedIds(),
): readonly RankingEntry[] {
  // The pool is constant across this ranking, so compute its normalizers once and reuse them
  // for every scientist rather than recomputing inside each signatureDistance call.
  const normalizers = computeAxisNormalizers(pool);
  const entries: RankingEntry[] = [];
  for (const scientistId of pool) {
    const distance = signatureDistanceWithNormalizers(stats, scientistId, normalizers);
    entries.push({ scientistId, distance });
  }
  // SCIENTIST_IDS order is the stable tie-break: compare distance, then original index.
  const orderIndex = (id: ScientistId): number => SCIENTIST_IDS.indexOf(id);
  entries.sort((first, second) => {
    if (first.distance !== second.distance) {
      return first.distance - second.distance;
    }
    return orderIndex(first.scientistId) - orderIndex(second.scientistId);
  });
  return entries;
}
