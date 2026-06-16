export const STAT_IDS = ["credibility", "curiosity", "cash", "care"] as const;

export type StatId = (typeof STAT_IDS)[number];

export type StatBand = "low" | "steady" | "high";

export type EffectMagnitude = "small" | "medium" | "large";

export type EffectDirection = "up" | "down";

export const STAT_CONFIG = {
  credibility: {
    label: "Credibility",
    lowCollapse: "The field stops trusting your claims before your evidence can land.",
    highCollapse: "Your reputation becomes a glass case: impressive, sealed, and hard to move.",
  },
  curiosity: {
    label: "Curiosity",
    lowCollapse: "The career becomes safe enough to be scientifically stagnant.",
    highCollapse: "Ideas outrun evidence until the work stops holding together.",
  },
  cash: {
    label: "Cash",
    lowCollapse: "The project runs out of rooms, reagents, travel, and time.",
    highCollapse: "Sponsors and institutions tug the work away from the core question.",
  },
  care: {
    label: "Care",
    lowCollapse: "The work keeps moving, but people and consequences fall out of view.",
    highCollapse: "Protective caution prevents the difficult commitment the science now requires.",
  },
} as const satisfies Record<string, { label: string; lowCollapse: string; highCollapse: string }>;

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

// Neutral parchment theme used during the prologue, before a path is chosen.
export const PROLOGUE_THEME: ThemePalette = {
  paper: "#fbf8ef",
  ink: "#17211f",
  accent: "#a33a2d",
  glow: "rgba(23, 33, 31, 0.16)",
  motif: "Sorting the career route",
};

// One palette per path, drawn from each scientist's research motif.
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

export const ARC_BEATS = ["entry", "pressure", "breakthrough", "translation", "legacy"] as const;

export type ArcBeat = (typeof ARC_BEATS)[number];

export const ENDING_TYPES = [
  "balanced_legacy",
  "evidence_burnout",
  "institutional_capture",
  "reckless_velocity",
] as const;

export type EndingType = (typeof ENDING_TYPES)[number];

export const ENDING_TYPE_LABELS = {
  balanced_legacy: "Balanced legacy",
  evidence_burnout: "Evidence burnout",
  institutional_capture: "Institutional capture",
  reckless_velocity: "Reckless velocity",
} as const satisfies Record<EndingType, string>;

export const STARTING_STAT_VALUE = 50;
export const LOW_COLLAPSE_VALUE = 0;
export const HIGH_COLLAPSE_VALUE = 100;

export function statBand(value: number): StatBand {
  if (value <= 25) {
    return "low";
  }
  if (value >= 75) {
    return "high";
  }
  return "steady";
}
