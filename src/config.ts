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
  // Celebrated pool: the five resemblance targets the blind run matches against.
  "jennifer_doudna",
  "rosalind_franklin",
  "marie_curie",
  "alexander_fleming",
  "katalin_kariko",
  // Disgraced pool: nine cautionary cases the downfall branch can route to.
  "andrew_wakefield",
  "hwang_woosuk",
  "he_jiankui",
  "gary_strobel",
  "purdue_sackler",
  "jan_hendrik_schon",
  "diederik_stapel",
  "paolo_macchiarini",
  "haruko_obokata",
] as const;

// A scientist is either a celebrated resemblance target or a disgraced cautionary case.
export type ScientistKind = "celebrated" | "disgraced";

// The kind of misconduct a disgraced case represents. Celebrated entries use "none".
export type CaseType =
  | "fraud"
  | "fabrication"
  | "reckless-human-research"
  | "patient-harm"
  | "profit-harm"
  | "regulatory-violation"
  | "none";

export type ScientistId = (typeof SCIENTIST_IDS)[number];

export const SCIENTIST_CONFIG = {
  jennifer_doudna: {
    name: "Jennifer Doudna",
    field: "RNA and genome editing",
    sourceFile: "data/science_career_paths/jennifer_doudna.md",
    kind: "celebrated",
    caseType: "none",
  },
  rosalind_franklin: {
    name: "Rosalind Franklin",
    field: "X-ray crystallography and DNA",
    sourceFile: "data/science_career_paths/rosalind_franklin.md",
    kind: "celebrated",
    caseType: "none",
  },
  marie_curie: {
    name: "Marie Curie",
    field: "radioactivity",
    sourceFile: "data/science_career_paths/marie_curie.md",
    kind: "celebrated",
    caseType: "none",
  },
  alexander_fleming: {
    name: "Alexander Fleming",
    field: "bacteriology and penicillin",
    sourceFile: "data/science_career_paths/alexander_fleming.md",
    kind: "celebrated",
    caseType: "none",
  },
  katalin_kariko: {
    name: "Katalin Kariko",
    field: "mRNA therapeutics",
    sourceFile: "data/science_career_paths/katalin_kariko.md",
    kind: "celebrated",
    caseType: "none",
  },
  andrew_wakefield: {
    name: "Andrew Wakefield",
    field: "vaccine safety (retracted)",
    sourceFile: "data/science_career_paths/andrew_wakefield.md",
    kind: "disgraced",
    caseType: "fraud",
  },
  hwang_woosuk: {
    name: "Hwang Woo-suk",
    field: "stem-cell cloning (fabricated)",
    sourceFile: "data/science_career_paths/hwang_woosuk.md",
    kind: "disgraced",
    caseType: "fabrication",
  },
  he_jiankui: {
    name: "He Jiankui",
    field: "human embryo editing",
    sourceFile: "data/science_career_paths/he_jiankui.md",
    kind: "disgraced",
    caseType: "reckless-human-research",
  },
  gary_strobel: {
    name: "Gary Strobel",
    field: "plant microbiology",
    sourceFile: "data/science_career_paths/gary_strobel.md",
    kind: "disgraced",
    caseType: "regulatory-violation",
  },
  purdue_sackler: {
    name: "Purdue/Sackler",
    field: "pharmaceutical marketing",
    sourceFile: "data/science_career_paths/purdue_sackler.md",
    kind: "disgraced",
    caseType: "profit-harm",
  },
  jan_hendrik_schon: {
    name: "Jan Hendrik Schon",
    field: "condensed-matter physics",
    sourceFile: "data/science_career_paths/jan_hendrik_schon.md",
    kind: "disgraced",
    caseType: "fabrication",
  },
  diederik_stapel: {
    name: "Diederik Stapel",
    field: "social psychology",
    sourceFile: "data/science_career_paths/diederik_stapel.md",
    kind: "disgraced",
    caseType: "fabrication",
  },
  paolo_macchiarini: {
    name: "Paolo Macchiarini",
    field: "regenerative surgery",
    sourceFile: "data/science_career_paths/paolo_macchiarini.md",
    kind: "disgraced",
    caseType: "patient-harm",
  },
  haruko_obokata: {
    name: "Haruko Obokata",
    field: "stem-cell biology (STAP)",
    sourceFile: "data/science_career_paths/haruko_obokata.md",
    kind: "disgraced",
    caseType: "fabrication",
  },
} as const satisfies Record<
  ScientistId,
  { name: string; field: string; sourceFile: string; kind: ScientistKind; caseType: CaseType }
>;

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
  // Disgraced-pool palettes: dark/muted treatment for the downfall reveal.
  andrew_wakefield: {
    paper: "#1a1414",
    ink: "#e6d9d6",
    accent: "#9a3b34",
    glow: "rgba(154, 59, 52, 0.30)",
    motif: "A retracted paper that would not die",
  },
  hwang_woosuk: {
    paper: "#141a18",
    ink: "#d8e2dd",
    accent: "#3f7a68",
    glow: "rgba(63, 122, 104, 0.30)",
    motif: "Cloned headlines, hollow data",
  },
  he_jiankui: {
    paper: "#15171c",
    ink: "#dadfe8",
    accent: "#5566b0",
    glow: "rgba(85, 102, 176, 0.30)",
    motif: "Edited children, broken lines",
  },
  gary_strobel: {
    paper: "#181a12",
    ink: "#e0e2d2",
    accent: "#7d8a3a",
    glow: "rgba(125, 138, 58, 0.30)",
    motif: "Released into the field before the permits arrived",
  },
  purdue_sackler: {
    paper: "#1c1812",
    ink: "#e8ddcc",
    accent: "#a8862f",
    glow: "rgba(168, 134, 47, 0.30)",
    motif: "Marketing pain by the milligram",
  },
  jan_hendrik_schon: {
    paper: "#12161a",
    ink: "#d6dee6",
    accent: "#4a6fa0",
    glow: "rgba(74, 111, 160, 0.30)",
    motif: "One graph, reused too many times",
  },
  diederik_stapel: {
    paper: "#181318",
    ink: "#e2d6e0",
    accent: "#8a4a82",
    glow: "rgba(138, 74, 130, 0.30)",
    motif: "Data invented to fit the story",
  },
  paolo_macchiarini: {
    paper: "#1a1212",
    ink: "#e6d4d4",
    accent: "#9c4444",
    glow: "rgba(156, 68, 68, 0.30)",
    motif: "Miracle surgery, fatal cost",
  },
  haruko_obokata: {
    paper: "#121a16",
    ink: "#d4e2da",
    accent: "#3f8a6a",
    glow: "rgba(63, 138, 106, 0.30)",
    motif: "A stress that never made the cells",
  },
} as const satisfies Record<ScientistId, ThemePalette>;

export function scientistTheme(scientistId: ScientistId): ThemePalette {
  return SCIENTIST_THEME[scientistId];
}

export const STARTING_STAT_VALUE = 50;

// Number of display steps in a normal stat meter (1-10 scale). Also the value-units per
// step, since the normal ceiling is 100 (100 / 10 = 10 steps).
export const STAT_STEP_COUNT = 10;

// Normal playable ceiling: a stat at this value fills all STAT_STEP_COUNT meter steps.
// Values above this enter the extreme band -- there is no hard maximum, so a hard-pushed
// stat keeps climbing and the meter grows extra steps to match.
export const STAT_NORMAL_MAX = 100;

// Map a stat value to a display step. ceil keeps small nonzero values at step 1, and
// max(1, ...) prevents a value of 0 from rendering an empty meter. The value is floored at
// 0 but has no upper bound: values past STAT_NORMAL_MAX return steps above STAT_STEP_COUNT
// without limit, so the extreme band is unbounded.
export function statStep(value: number): number {
  const flooredValue = Math.max(0, value);
  const step = Math.max(1, Math.ceil(flooredValue / STAT_STEP_COUNT));
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
  // Disgraced-pool signatures. Values are pairwise distinct by >= FLAVOR_MIN_MARGIN;
  // minimum pair is gary_strobel vs haruko_obokata at ~22.6. Rationales are grounded
  // in documented public records of each case; keep educational and non-sensational.
  andrew_wakefield: {
    values: { credibility: 10, curiosity: 35, cash: 80, care: 15 },
    rationale: {
      credibility:
        "Very low: the Lancet paper was retracted for fraud and Wakefield was struck from the medical register.",
      curiosity:
        "Low-medium: pursued a narrow anti-vaccine claim rather than open epidemiological inquiry.",
      cash: "High: received undisclosed payments from a law firm seeking to sue vaccine manufacturers.",
      care: "Very low: the false alarm depressed vaccination rates and damaged public health for years.",
    },
  },
  hwang_woosuk: {
    values: { credibility: 15, curiosity: 85, cash: 60, care: 30 },
    rationale: {
      credibility:
        "Very low: landmark human-cloning claims published in Science were entirely fabricated and retracted.",
      curiosity:
        "Very high: aggressively chased the frontier of human embryo cloning before any lab had the technique.",
      cash: "Medium-high: South Korea directed major national prestige funding to the project before the fraud emerged.",
      care: "Low: pressured junior staff to donate eggs and bypassed normal ethical review to accelerate results.",
    },
  },
  he_jiankui: {
    values: { credibility: 25, curiosity: 95, cash: 50, care: 5 },
    rationale: {
      credibility:
        "Low: conducted secret embryo editing outside peer review, drawing global condemnation and a prison sentence.",
      curiosity:
        "Very high: raced to be the first to apply CRISPR to the human germline before safety standards existed.",
      cash: "Medium: privately funded outside the normal grant process, which helped conceal the work from oversight.",
      care: "Very low: proceeded without genuine informed consent and ignored scientific consensus that the field was not ready.",
    },
  },
  gary_strobel: {
    values: { credibility: 40, curiosity: 80, cash: 20, care: 40 },
    rationale: {
      credibility:
        "Low-medium: a productive biology career was undermined by a regulatory violation, not data fraud.",
      curiosity:
        "High: wide-ranging hunt for bioactive microbes carried across forests on multiple continents.",
      cash: "Low: field campaigns on a modest academic budget with no commercial backing.",
      care: "Low-medium: released an engineered Fusarium strain in a UK field site without obtaining the required permits.",
    },
  },
  purdue_sackler: {
    values: { credibility: 45, curiosity: 20, cash: 95, care: 5 },
    rationale: {
      credibility:
        "Low-medium: company credibility collapsed when internal documents showed executives knew addiction risks were understated.",
      curiosity:
        "Very low: the enterprise was pharmaceutical marketing, not scientific research or genuine innovation.",
      cash: "Very high: OxyContin generated billions while aggressive promotion systematically minimized addiction risk.",
      care: "Very low: evidence of patient harm was suppressed to protect revenue; the human cost ran to hundreds of thousands.",
    },
  },
  jan_hendrik_schon: {
    values: { credibility: 20, curiosity: 70, cash: 35, care: 20 },
    rationale: {
      credibility:
        "Very low: duplicate figures and impossible curves across more than 20 papers led to retraction and dismissal from Bell Labs.",
      curiosity:
        "Medium-high: targeted the most exciting condensed-matter topics, from organic superconductors to molecular transistors.",
      cash: "Low-medium: worked within a prestigious industrial research lab but without independent grant funding.",
      care: "Very low: deceived co-authors who lent their names to fabricated results and seeded the field with false leads.",
    },
  },
  diederik_stapel: {
    values: { credibility: 12, curiosity: 45, cash: 30, care: 25 },
    rationale: {
      credibility:
        "Very low: invented data for dozens of studies over years; a formal inquiry led to more than 50 retractions.",
      curiosity:
        "Low-medium: preferred tidy narratives over real data, replacing genuine inquiry with storytelling.",
      cash: "Low: supported by standard Dutch academic grants; the misconduct was driven by prestige rather than financial gain.",
      care: "Low: betrayed PhD students who built dissertations on data they were never told was fabricated.",
    },
  },
  paolo_macchiarini: {
    values: { credibility: 30, curiosity: 75, cash: 75, care: 5 },
    rationale: {
      credibility:
        "Low: overstated patient outcomes in publications; several papers were retracted and most transplant recipients died.",
      curiosity:
        "High: pursued a speculative frontier of regenerative surgery using synthetic tracheal scaffolds seeded with stem cells.",
      cash: "High: attracted major institutional investment and international press attention to the experimental procedures.",
      care: "Very low: continued operating on patients despite mounting evidence of failure; most recipients did not survive.",
    },
  },
  haruko_obokata: {
    values: { credibility: 18, curiosity: 80, cash: 25, care: 40 },
    rationale: {
      credibility:
        "Very low: the STAP cell papers were retracted after manipulation and improper splicing of image data were found.",
      curiosity:
        "High: claimed that simple acid stress could reprogram adult cells to pluripotency, a striking biological shortcut.",
      cash: "Low: an early-career researcher working within a large institute on standard laboratory resources.",
      care: "Low-medium: the retraction damaged collaborators' careers and shook public trust in the stem-cell research community.",
    },
  },
};

// Credibility at or below this floor routes a run to the disgraced pool and the
// downfall branch instead of the celebrated resemblance reveal.
export const DISGRACE_FLOOR = 20;

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
