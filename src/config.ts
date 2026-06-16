export const STAT_IDS = ["credibility", "curiosity", "cash", "care"] as const;

export type StatId = (typeof STAT_IDS)[number];

export type StatBand = "low" | "steady" | "high";

export type EffectMagnitude = "small" | "medium" | "large";

export type EffectDirection = "up" | "down";

// Each stat carries a short blurb shown as a hover tooltip and accessible label on
// its meter, so players can learn what each of the four Cs means without a separate
// standing help block taking up vertical space.
export const STAT_CONFIG = {
  credibility: {
    label: "Credibility",
    blurb: "Trust the field places in your claims and evidence.",
  },
  curiosity: {
    label: "Curiosity",
    blurb: "Drive to chase new, risky scientific questions.",
  },
  cash: {
    label: "Cash",
    blurb: "Funding and resources available to the work.",
  },
  care: {
    label: "Care",
    blurb:
      "Attention to people affected by the work: collaborators, patients, students, and the public.",
  },
} as const satisfies Record<string, { label: string; blurb: string }>;

export const MAGNITUDE_CONFIG = {
  small: { label: "Small", delta: 8 },
  medium: { label: "Medium", delta: 14 },
  large: { label: "Large", delta: 22 },
} as const satisfies Record<EffectMagnitude, { label: string; delta: number }>;

export const SCIENTIST_IDS = [
  "jennifer_doudna",
  "rosalind_franklin",
  "marie_curie",
  "alexander_fleming",
  "katalin_kariko",
] as const;

export type ScientistId = (typeof SCIENTIST_IDS)[number];

export const SCIENTIST_CONFIG = {
  jennifer_doudna: {
    name: "Jennifer Doudna",
    field: "RNA and genome editing",
    sourceFile: "data/science_career_paths/jennifer_doudna.md",
  },
  rosalind_franklin: {
    name: "Rosalind Franklin",
    field: "X-ray crystallography and DNA",
    sourceFile: "data/science_career_paths/rosalind_franklin.md",
  },
  marie_curie: {
    name: "Marie Curie",
    field: "radioactivity",
    sourceFile: "data/science_career_paths/marie_curie.md",
  },
  alexander_fleming: {
    name: "Alexander Fleming",
    field: "bacteriology and penicillin",
    sourceFile: "data/science_career_paths/alexander_fleming.md",
  },
  katalin_kariko: {
    name: "Katalin Kariko",
    field: "mRNA therapeutics",
    sourceFile: "data/science_career_paths/katalin_kariko.md",
  },
} as const satisfies Record<ScientistId, { name: string; field: string; sourceFile: string }>;

export type ThemePalette = {
  readonly paper: string;
  readonly ink: string;
  readonly accent: string;
  readonly glow: string;
  readonly motif: string;
};

// Neutral parchment theme used throughout the blind run, before the result reveal.
export const NEUTRAL_THEME: ThemePalette = {
  paper: "#fbf8ef",
  ink: "#17211f",
  accent: "#a33a2d",
  glow: "rgba(23, 33, 31, 0.16)",
  motif: "Your choices reveal the shape of a career",
};

// One palette per scientist, applied at the result reveal.
export const SCIENTIST_THEME = {
  jennifer_doudna: {
    paper: "#f0f7f4",
    ink: "#103629",
    accent: "#1f9d6b",
    glow: "rgba(16, 54, 43, 0.22)",
    motif: "Scissors and signatures",
  },
  rosalind_franklin: {
    paper: "#eef0fb",
    ink: "#1b1f43",
    accent: "#4456c7",
    glow: "rgba(27, 31, 67, 0.24)",
    motif: "The photograph is sharp, the room is not",
  },
  marie_curie: {
    paper: "#eef4ef",
    ink: "#14201a",
    accent: "#2f9e5b",
    glow: "rgba(33, 90, 55, 0.32)",
    motif: "The glow is beautiful and dangerous",
  },
  alexander_fleming: {
    paper: "#f6f2e4",
    ink: "#2c2410",
    accent: "#9a7b1b",
    glow: "rgba(60, 50, 16, 0.22)",
    motif: "The dirty bench tells the truth",
  },
  katalin_kariko: {
    paper: "#f9eef6",
    ink: "#3a1430",
    accent: "#b5378f",
    glow: "rgba(58, 20, 48, 0.24)",
    motif: "Decades of no before one yes",
  },
} as const satisfies Record<ScientistId, ThemePalette>;

export function scientistTheme(scientistId: ScientistId): ThemePalette {
  return SCIENTIST_THEME[scientistId];
}

export const STARTING_STAT_VALUE = 50;

// Number of display steps in a stat meter (1-10 scale).
export const STAT_STEP_COUNT = 10;

// Map a stat value to a 1-10 display step. ceil keeps small nonzero values at step 1,
// and max(1, ...) prevents a value of 0 from rendering an empty meter.
export function statStep(value: number): number {
  const clampedValue = Math.max(0, Math.min(100, value));
  const step = Math.max(1, Math.ceil(clampedValue / STAT_STEP_COUNT));
  return step;
}

// Low-pressure warning tier for a stat. "bad" (red) and "warn" (amber) flag a stat
// running low; "ok" covers everything from mid up, since high values are never a
// warning in the no-lose resemblance model. Driven by display step so the meter color
// matches the visible fill.
export type LowRisk = "bad" | "warn" | "ok";

export function lowRisk(value: number): LowRisk {
  const step = statStep(value);
  if (step <= LOW_BAD_STEP) {
    return "bad";
  }
  if (step <= LOW_WARN_STEP) {
    return "warn";
  }
  return "ok";
}

export function statBand(value: number): StatBand {
  if (value <= 25) {
    return "low";
  }
  if (value >= 75) {
    return "high";
  }
  return "steady";
}

// Low-pressure warning tiers. Low stats are the only genuine concern in the no-lose
// resemblance model: low credibility/curiosity/cash/care is the intended soft tension.
// High values are never a warning -- they simply shape which scientist you resemble.
// Thresholds are expressed as display steps (step = ceil(value / 10), 1-10 scale):
//   step <= LOW_BAD_STEP   (value <= 20) reads as "bad" (red).
//   step <= LOW_WARN_STEP  (value 21-40) reads as "reaching low" (amber).
//   anything higher reads as fine, with high values treated as good.
const LOW_BAD_STEP = 2;
const LOW_WARN_STEP = 4;

// Number of cards drawn in a single blind run before the resemblance reveal.
export const RUN_LENGTH = 12;

// A flavor-pool card may be injected on every Nth draw once a hidden leader emerges.
export const FLAVOR_EVERY = 4;

// Minimum signature-distance margin (Euclidean, 0-100 space) the nearest scientist
// must lead the runner-up by before a hidden leader is considered to have emerged.
// Reused by content validation to assert the hand-authored signatures stay distinct.
export const FLAVOR_MIN_MARGIN = 20;

// Baseline draw weight every eligible core card carries before per-stat emphasis is
// added. Keeping a nonzero base ensures no card weight collapses to zero, so the deck
// never funnels every run toward a single stat or scientist.
export const DRAW_WEIGHT_BASE = 1;

// Hand-authored 4C target vector per scientist plus a one-line rationale per C.
// The rationale is the source-of-truth justification that reviewers and the result
// screen read; it explains why each C sits high, medium, or low for this scientist.
// Values are 0-100 in credibility / curiosity / cash / care order, grounded in the
// matching data/science_career_paths/<name>.md draft. Tunable, but kept pairwise
// distinct by at least FLAVOR_MIN_MARGIN (enforced in content validation).
// StatValues lives in engine.ts; to avoid a circular import the value type is
// written inline as Record<StatId, number> here.
export const SCIENTIST_SIGNATURE: Record<
  ScientistId,
  { values: Record<StatId, number>; rationale: Record<StatId, string> }
> = {
  jennifer_doudna: {
    values: { credibility: 75, curiosity: 80, cash: 70, care: 55 },
    rationale: {
      credibility:
        "High: a Nobel-recognized method only landed because the evidence was made to withstand scrutiny.",
      curiosity:
        "High: chasing a weird bacterial system over safer work is the move that opened genome editing.",
      cash: "High: translation, startups, and patents pulled real resources around the tool.",
      care: "Medium: called for guardrails on the technology, but discovery kept setting the pace.",
    },
  },
  rosalind_franklin: {
    values: { credibility: 80, curiosity: 65, cash: 25, care: 75 },
    rationale: {
      credibility:
        "High: authority came from precise measurement and refusing to publish ahead of the data.",
      curiosity:
        "Medium: drawn to hard diffraction problems, but discipline outranked speculation.",
      cash: "Low: worked in friction-filled institutions with thin support and contested credit.",
      care: "High: insisted on fair credit terms and standards even when the room called it stubbornness.",
    },
  },
  marie_curie: {
    values: { credibility: 75, curiosity: 90, cash: 30, care: 35 },
    rationale: {
      credibility: "High: two Nobel Prizes rest on painstaking, repeatable isolation work.",
      curiosity:
        "Very high: chased a strange measurable glow no one else would, into uncharted physics and chemistry.",
      cash: "Low: did landmark work in a converted shed with scarce resources.",
      care: "Low: pushed through dangerous conditions and personal cost for the discovery.",
    },
  },
  alexander_fleming: {
    values: { credibility: 55, curiosity: 68, cash: 45, care: 70 },
    rationale: {
      credibility:
        "Medium: noticed the key result, but turning it into trusted medicine took others.",
      curiosity:
        "Medium-high: caught one decisive contaminated plate rather than chasing a long campaign.",
      cash: "Low-medium: early development stayed small until larger efforts took over.",
      care: "High: the payoff was a treatment for people, and the work centered that promise.",
    },
  },
  katalin_kariko: {
    values: { credibility: 40, curiosity: 80, cash: 30, care: 80 },
    rationale: {
      credibility:
        "Low: recognition came late after years of rejection questioned the work's standing.",
      curiosity:
        "High: stayed on a risky, unpopular molecule that reviewers kept calling unrealistic.",
      cash: "Low: grant after grant said no, so the work ran on persistence, not funding.",
      care: "High: the through-line was a therapy meant to protect people, pursued for decades.",
    },
  },
};

// Soft-tension texture lines shown when a stat runs low. Low is the only genuine
// pressure in the no-lose resemblance model, so there is one concern line per stat and
// no high-side entries. These are descriptive color, not fail warnings: the run never
// ends on them. They color both the live run and the resemblance reveal.
export const LOW_PRESSURE_TEXTURE: Record<StatId, string> = {
  credibility: "Colleagues start hedging when your name comes up; claims need a second look now.",
  curiosity: "The bench settles into safe routine, and the interesting questions go quiet.",
  cash: "The lab is fraying for lack of funds; reagents and time are rationed.",
  care: "People and consequences are slipping out of view while the work keeps moving.",
};
