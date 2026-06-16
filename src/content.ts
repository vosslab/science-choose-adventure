import { cardId, type CardId } from "./brands";
import {
  ARC_BEATS,
  ENDING_TYPES,
  SCIENTIST_IDS,
  STAT_IDS,
  type ArcBeat,
  type EffectDirection,
  type EffectMagnitude,
  type EndingType,
  type ScientistId,
  type StatId,
} from "./config";

export type Effect = {
  readonly stat: StatId;
  readonly direction: EffectDirection;
  readonly magnitude: EffectMagnitude;
};

export type Choice = {
  readonly label: string;
  readonly effects: readonly Effect[];
};

export type CareerCard = {
  readonly id: CardId;
  readonly prompt: string;
  readonly arcBeat: ArcBeat;
  readonly scientistSpecific: boolean;
  readonly contributionTags: readonly string[];
  readonly choices: readonly [Choice, Choice];
};

export type SourceNote = {
  readonly label: string;
  readonly url: string;
};

export type PathEnding = {
  readonly type: EndingType;
  readonly title: string;
  readonly text: string;
};

export type ScientistPath = {
  readonly scientistId: ScientistId;
  readonly title: string;
  readonly motifs: readonly [string, string, ...string[]];
  readonly arcBeats: readonly ArcBeat[];
  readonly cards: readonly CareerCard[];
  readonly endings: readonly PathEnding[];
  readonly sourceNotes: readonly SourceNote[];
  readonly sensitiveAreas: readonly string[];
};

export type PrologueChoice = {
  readonly label: string;
  readonly routeTo: ScientistId;
  readonly effect: Effect;
};

export type PrologueCard = {
  readonly id: CardId;
  readonly prompt: string;
  readonly choices: readonly [PrologueChoice, PrologueChoice];
};

function effect(stat: StatId, direction: EffectDirection, magnitude: EffectMagnitude): Effect {
  const nextEffect = { stat, direction, magnitude };
  return nextEffect;
}

function card(
  scientistId: ScientistId,
  index: number,
  prompt: string,
  arcBeat: ArcBeat,
  first: Choice,
  second: Choice,
  contributionTags: readonly string[] = [scientistId],
): CareerCard {
  const nextCard: CareerCard = {
    id: cardId(`${scientistId}_${index}`),
    prompt,
    arcBeat,
    scientistSpecific: contributionTags.length > 0,
    contributionTags,
    choices: [first, second],
  };
  return nextCard;
}

function choice(label: string, effects: readonly Effect[]): Choice {
  const nextChoice = { label, effects };
  return nextChoice;
}

const doudnaCards = [
  card(
    "jennifer_doudna",
    1,
    "A student brings data from a bacterial immune system that looks oddly programmable.",
    "entry",
    choice("Chase the weird system", [effect("curiosity", "up", "medium")]),
    choice("Return to safer RNA structure", [effect("cash", "up", "small")]),
    ["rna", "crispr"],
  ),
  card(
    "jennifer_doudna",
    2,
    "A collaborator wants to simplify the system until it works in a tube.",
    "entry",
    choice("Strip it down", [effect("curiosity", "up", "medium")]),
    choice("Preserve every biological detail", [effect("credibility", "up", "small")]),
    ["crispr"],
  ),
  card(
    "jennifer_doudna",
    3,
    "The first clean editing result lands on your desk.",
    "breakthrough",
    choice("Celebrate carefully", [effect("credibility", "up", "medium")]),
    choice("Announce loudly", [effect("cash", "up", "medium")]),
    ["genome_editing"],
  ),
  card(
    "jennifer_doudna",
    4,
    "A patent office wants a timeline clearer than the science felt at the time.",
    "pressure",
    choice("Document the messy path", [effect("credibility", "up", "small")]),
    choice("Let lawyers simplify it", [effect("cash", "up", "medium")]),
    ["patents"],
  ),
  card(
    "jennifer_doudna",
    5,
    "A reporter asks whether CRISPR will cure everything.",
    "translation",
    choice("Explain the limits", [effect("credibility", "up", "medium")]),
    choice("Give the exciting answer", [effect("cash", "up", "small")]),
    ["ethics"],
  ),
  card(
    "jennifer_doudna",
    6,
    "A colleague warns that gene editing could move faster than public trust.",
    "pressure",
    choice("Call for guardrails", [effect("care", "up", "medium")]),
    choice("Trust the field to adapt", [effect("curiosity", "up", "small")]),
    ["ethics"],
  ),
  card(
    "jennifer_doudna",
    7,
    "A startup offers resources for translation.",
    "translation",
    choice("Build the bridge", [effect("cash", "up", "large")]),
    choice("Stay in basic science", [effect("curiosity", "up", "medium")]),
    ["translation"],
  ),
  card(
    "jennifer_doudna",
    8,
    "A student wants to edit an organism for a flashy demo.",
    "pressure",
    choice("Ask for the biological reason", [effect("credibility", "up", "small")]),
    choice("Approve the spectacle", [effect("cash", "up", "medium")]),
    ["ethics"],
  ),
  card(
    "jennifer_doudna",
    9,
    "The public hears designer babies before hearing bacterial immunity.",
    "translation",
    choice("Enter the public debate", [effect("care", "up", "large")]),
    choice("Stay in the lab", [effect("credibility", "up", "small")]),
    ["public_trust"],
  ),
  card(
    "jennifer_doudna",
    10,
    "A rival lab publishes fast.",
    "pressure",
    choice("Tighten your evidence", [effect("credibility", "up", "medium")]),
    choice("Race sentence by sentence", [effect("care", "down", "medium")]),
    ["credit"],
  ),
  card(
    "jennifer_doudna",
    11,
    "The Nobel call arrives before coffee.",
    "legacy",
    choice("Share the credit widely", [effect("care", "up", "medium")]),
    choice("Become the symbol", [effect("credibility", "up", "large")]),
    ["nobel"],
  ),
  card(
    "jennifer_doudna",
    12,
    "A new generation treats CRISPR as ordinary lab equipment.",
    "legacy",
    choice("Teach caution as a skill", [effect("care", "up", "medium")]),
    choice("Let convenience win", [effect("curiosity", "up", "small")]),
    ["legacy"],
  ),
] as const;

const franklinCards = [
  card(
    "rosalind_franklin",
    1,
    "A diffraction pattern is almost clear enough to speak for itself.",
    "entry",
    choice("Collect cleaner data", [effect("credibility", "up", "medium")]),
    choice("Publish the hint now", [effect("curiosity", "up", "medium")]),
  ),
  card(
    "rosalind_franklin",
    2,
    "A colleague wants a quick model from partial evidence.",
    "pressure",
    choice("Demand more measurements", [effect("credibility", "up", "medium")]),
    choice("Let the model lead", [effect("cash", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    3,
    "The lab culture treats certainty as stubbornness.",
    "pressure",
    choice("Hold the line", [effect("credibility", "up", "medium")]),
    choice("Soften the claim", [effect("care", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    4,
    "A student produces a striking image.",
    "breakthrough",
    choice("Archive it carefully", [effect("credibility", "up", "medium")]),
    choice("Show it around casually", [effect("curiosity", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    5,
    "A meeting turns your caution into a personality flaw.",
    "pressure",
    choice("Return to the data", [effect("care", "up", "small")]),
    choice("Fight the room", [effect("credibility", "up", "medium")]),
  ),
  card(
    "rosalind_franklin",
    6,
    "Another group is moving fast with models.",
    "pressure",
    choice("Check every parameter", [effect("credibility", "up", "medium")]),
    choice("Race with a rough sketch", [effect("curiosity", "up", "medium")]),
  ),
  card(
    "rosalind_franklin",
    7,
    "A supervisor wants data shared without clear credit rules.",
    "pressure",
    choice("Ask for terms", [effect("credibility", "up", "medium")]),
    choice("Keep the peace", [effect("care", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    8,
    "The A-form data are difficult, but you trust the method.",
    "entry",
    choice("Stay with the hard pattern", [effect("curiosity", "up", "medium")]),
    choice("Switch to the easier story", [effect("cash", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    9,
    "A paper draft needs careful wording.",
    "translation",
    choice("Write narrowly", [effect("credibility", "up", "medium")]),
    choice("Make the boldest claim", [effect("curiosity", "up", "large")]),
  ),
  card(
    "rosalind_franklin",
    10,
    "You leave a tense project for new work.",
    "translation",
    choice("Carry the standards forward", [effect("care", "up", "medium")]),
    choice("Carry the conflict forward", [effect("credibility", "up", "small")]),
  ),
  card(
    "rosalind_franklin",
    11,
    "Later scientists cite the model more than the measurements.",
    "legacy",
    choice("Let the record build slowly", [effect("care", "up", "small")]),
    choice("Demand the center stage", [effect("credibility", "up", "large")]),
  ),
  card(
    "rosalind_franklin",
    12,
    "Students ask what the image teaches.",
    "legacy",
    choice("Teach evidence and credit", [effect("care", "up", "medium")]),
    choice("Teach only the helix", [effect("cash", "up", "small")]),
  ),
] as const;

const curieCards = [
  card(
    "marie_curie",
    1,
    "A crude workspace is available, if you can call it a workspace.",
    "entry",
    choice("Use the shed", [effect("curiosity", "up", "medium")]),
    choice("Wait for proper space", [effect("care", "up", "medium")]),
  ),
  card(
    "marie_curie",
    2,
    "A mineral sample gives stronger readings than expected.",
    "entry",
    choice("Follow the anomaly", [effect("curiosity", "up", "medium")]),
    choice("Blame the instrument", [effect("credibility", "up", "small")]),
  ),
  card(
    "marie_curie",
    3,
    "Processing ore will take months of exhausting labor.",
    "pressure",
    choice("Start boiling vats", [effect("curiosity", "up", "large")]),
    choice("Search for shortcuts", [effect("care", "up", "small")]),
  ),
  card(
    "marie_curie",
    4,
    "The public wants a simple story about invisible rays.",
    "translation",
    choice("Explain cautiously", [effect("credibility", "up", "medium")]),
    choice("Let wonder lead", [effect("cash", "up", "medium")]),
  ),
  card(
    "marie_curie",
    5,
    "A colleague says safety rules will slow everything down.",
    "pressure",
    choice("Add precautions", [effect("care", "up", "large")]),
    choice("Push through", [effect("curiosity", "up", "medium")]),
  ),
  card(
    "marie_curie",
    6,
    "The measurements are consistent, but the substance is tiny.",
    "breakthrough",
    choice("Trust the numbers", [effect("credibility", "up", "medium")]),
    choice("Wait for visible proof", [effect("cash", "down", "small")]),
  ),
  card(
    "marie_curie",
    7,
    "Recognition brings attention, but not enough support.",
    "translation",
    choice("Ask for resources", [effect("cash", "up", "medium")]),
    choice("Keep working quietly", [effect("care", "down", "small")]),
  ),
  card(
    "marie_curie",
    8,
    "A newspaper wants the heroic version.",
    "translation",
    choice("Mention the labor", [effect("credibility", "up", "medium")]),
    choice("Feed the myth", [effect("cash", "up", "medium")]),
  ),
  card(
    "marie_curie",
    9,
    "A student wants to handle samples casually.",
    "pressure",
    choice("Stop the habit", [effect("care", "up", "large")]),
    choice("Assume everyone knows", [effect("curiosity", "up", "small")]),
  ),
  card(
    "marie_curie",
    10,
    "A prize committee notices the work late.",
    "legacy",
    choice("Accept and redirect attention", [effect("cash", "up", "medium")]),
    choice("Ignore the ceremony", [effect("care", "up", "small")]),
  ),
  card(
    "marie_curie",
    11,
    "Medical uses of radiation become tempting.",
    "translation",
    choice("Support cautious translation", [effect("credibility", "up", "medium")]),
    choice("Promise miracles", [effect("cash", "up", "large")]),
  ),
  card(
    "marie_curie",
    12,
    "The next generation asks what discovery costs.",
    "legacy",
    choice("Tell the full story", [effect("care", "up", "medium")]),
    choice("Polish the legend", [effect("credibility", "up", "large")]),
  ),
] as const;

const flemingCards = [
  card(
    "alexander_fleming",
    1,
    "A plate looks ruined by mold.",
    "entry",
    choice("Look closer", [effect("curiosity", "up", "medium")]),
    choice("Throw it away", [effect("care", "up", "small")]),
  ),
  card(
    "alexander_fleming",
    2,
    "The bacteria around the mold have vanished.",
    "breakthrough",
    choice("Repeat the observation", [effect("credibility", "up", "medium")]),
    choice("Call it a lucky mess", [effect("curiosity", "up", "small")]),
  ),
  card(
    "alexander_fleming",
    3,
    "The substance is unstable and hard to purify.",
    "pressure",
    choice("Publish the clue", [effect("credibility", "up", "medium")]),
    choice("Wait for a product", [effect("cash", "down", "small")]),
  ),
  card(
    "alexander_fleming",
    4,
    "A hospital case reminds you why infection matters.",
    "entry",
    choice("Connect lab to clinic", [effect("care", "up", "medium")]),
    choice("Stay with petri dishes", [effect("curiosity", "up", "small")]),
  ),
  card(
    "alexander_fleming",
    5,
    "A colleague jokes that your lab is too messy.",
    "pressure",
    choice("Defend observation", [effect("credibility", "up", "medium")]),
    choice("Clean away the evidence", [effect("care", "up", "small")]),
  ),
  card(
    "alexander_fleming",
    6,
    "The paper gets modest attention.",
    "translation",
    choice("Keep the record clear", [effect("credibility", "up", "medium")]),
    choice("Oversell the cure", [effect("cash", "up", "medium")]),
  ),
  card(
    "alexander_fleming",
    7,
    "Chemists may be needed to make the drug real.",
    "translation",
    choice("Invite translation", [effect("care", "up", "medium")]),
    choice("Guard the discovery", [effect("credibility", "up", "large")]),
  ),
  card(
    "alexander_fleming",
    8,
    "War increases demand for infection treatment.",
    "pressure",
    choice("Push collaboration", [effect("care", "up", "medium")]),
    choice("Wait for normal conditions", [effect("cash", "down", "small")]),
  ),
  card(
    "alexander_fleming",
    9,
    "Mass production needs industry.",
    "translation",
    choice("Accept scale-up", [effect("cash", "up", "large")]),
    choice("Distrust the factory", [effect("care", "up", "medium")]),
  ),
  card(
    "alexander_fleming",
    10,
    "The public wants one hero.",
    "legacy",
    choice("Name the team", [effect("credibility", "up", "medium")]),
    choice("Accept the legend", [effect("cash", "up", "medium")]),
  ),
  card(
    "alexander_fleming",
    11,
    "Antibiotic use grows quickly.",
    "legacy",
    choice("Warn about resistance", [effect("credibility", "up", "medium")]),
    choice("Celebrate without caveats", [effect("cash", "up", "large")]),
  ),
  card(
    "alexander_fleming",
    12,
    "Students ask about luck in science.",
    "legacy",
    choice("Teach prepared noticing", [effect("curiosity", "up", "medium")]),
    choice("Teach the miracle story", [effect("credibility", "up", "small")]),
  ),
] as const;

const karikoCards = [
  card(
    "katalin_kariko",
    1,
    "Another grant review calls mRNA unrealistic.",
    "entry",
    choice("Keep going", [effect("curiosity", "up", "medium")]),
    choice("Choose a safer project", [effect("cash", "up", "small")]),
  ),
  card(
    "katalin_kariko",
    2,
    "A colleague suggests your career would survive better with a trendier molecule.",
    "pressure",
    choice("Stay with mRNA", [effect("curiosity", "up", "medium")]),
    choice("Follow the trend", [effect("care", "up", "small")]),
  ),
  card(
    "katalin_kariko",
    3,
    "The immune response keeps wrecking the experiment.",
    "breakthrough",
    choice("Change the nucleosides", [effect("curiosity", "up", "large")]),
    choice("Lower the ambition", [effect("credibility", "up", "small")]),
  ),
  card(
    "katalin_kariko",
    4,
    "A hallway conversation points toward collaboration.",
    "entry",
    choice("Share the problem", [effect("care", "up", "medium")]),
    choice("Protect the idea", [effect("credibility", "up", "medium")]),
  ),
  card(
    "katalin_kariko",
    5,
    "The data improve, but funding does not.",
    "pressure",
    choice("Patch together resources", [effect("cash", "up", "small")]),
    choice("Pause the project", [effect("care", "up", "medium")]),
  ),
  card(
    "katalin_kariko",
    6,
    "A demotion threatens morale.",
    "pressure",
    choice("Separate title from purpose", [effect("curiosity", "up", "medium")]),
    choice("Take the hint", [effect("care", "up", "small")]),
  ),
  card(
    "katalin_kariko",
    7,
    "A paper reviewer wants stronger evidence.",
    "translation",
    choice("Do the extra controls", [effect("credibility", "up", "medium")]),
    choice("Argue harder", [effect("care", "down", "small")]),
  ),
  card(
    "katalin_kariko",
    8,
    "Companies begin noticing mRNA platforms.",
    "translation",
    choice("Enter translation", [effect("cash", "up", "large")]),
    choice("Stay purely academic", [effect("credibility", "up", "medium")]),
  ),
  card(
    "katalin_kariko",
    9,
    "A pandemic changes the urgency overnight.",
    "translation",
    choice("Move fast with evidence", [effect("care", "up", "medium")]),
    choice("Move fast with slogans", [effect("cash", "up", "medium")]),
  ),
  card(
    "katalin_kariko",
    10,
    "The public hears new vaccine technology and worries.",
    "translation",
    choice("Explain the history", [effect("credibility", "up", "medium")]),
    choice("Dismiss the fear", [effect("care", "down", "medium")]),
  ),
  card(
    "katalin_kariko",
    11,
    "Recognition arrives after decades of no.",
    "legacy",
    choice("Share the persistence story", [effect("care", "up", "medium")]),
    choice("Polish it into destiny", [effect("credibility", "up", "large")]),
  ),
  card(
    "katalin_kariko",
    12,
    "Students ask how to survive rejection.",
    "legacy",
    choice("Teach adaptation plus stubbornness", [effect("care", "up", "medium")]),
    choice("Teach stubbornness only", [effect("curiosity", "up", "large")]),
  ),
] as const;

const commonEndings = [
  {
    type: "balanced_legacy",
    title: "The work stays usable",
    text: "You leave a record that names limits, credits help, and keeps the next question alive.",
  },
  {
    type: "evidence_burnout",
    title: "The evidence becomes a cage",
    text: "The standards are real, but the career can no longer move under their weight.",
  },
  {
    type: "institutional_capture",
    title: "The machine adopts the discovery",
    text: "Money, prestige, or public appetite keeps the project moving in the wrong direction.",
  },
  {
    type: "reckless_velocity",
    title: "The story outruns the science",
    text: "The field hears momentum where it needed measurement.",
  },
] as const satisfies readonly PathEnding[];

function source(label: string, url: string): SourceNote {
  const note = { label, url };
  return note;
}

function path(
  scientistId: ScientistId,
  title: string,
  motifs: readonly [string, string, ...string[]],
  cards: readonly CareerCard[],
  sourceNotes: readonly [SourceNote, SourceNote, SourceNote, ...SourceNote[]],
  sensitiveAreas: readonly string[],
): ScientistPath {
  const scientistPath = {
    scientistId,
    title,
    motifs,
    arcBeats: ARC_BEATS,
    cards,
    endings: commonEndings,
    sourceNotes,
    sensitiveAreas,
  };
  return scientistPath;
}

export const SCIENTIST_PATHS = {
  jennifer_doudna: path(
    "jennifer_doudna",
    "The tool becomes bigger than the lab",
    [
      "The bacterial immune system keeps looking like a toolbox.",
      "Every exciting tool arrives with a committee, a patent lawyer, and an ethics panel.",
    ],
    doudnaCards,
    [
      source("Nobel Prize facts", "https://www.nobelprize.org/prizes/chemistry/2020/doudna/facts/"),
      source(
        "Nobel biographical note",
        "https://www.nobelprize.org/prizes/chemistry/2020/doudna/biographical/",
      ),
      source("Britannica overview", "https://www.britannica.com/biography/Jennifer-Doudna"),
    ],
    ["ethical controversy", "credit disputes", "public fear", "patents"],
  ),
  rosalind_franklin: path(
    "rosalind_franklin",
    "The data are clear, but the room is not fair",
    [
      "The photograph knows the answer before the room agrees.",
      "Precision is treated like delay by people in a hurry.",
    ],
    franklinCards,
    [
      source("King's College London profile", "https://www.kcl.ac.uk/people/rosalind-franklin"),
      source("Britannica overview", "https://www.britannica.com/biography/Rosalind-Franklin"),
      source(
        "Nature education DNA history",
        "https://www.nature.com/scitable/topicpage/discovery-of-dna-structure-and-function-watson-397/",
      ),
    ],
    ["credit disputes", "discrimination", "institutional conflict"],
  ),
  marie_curie: path(
    "marie_curie",
    "Discovery has a cost",
    [
      "The shed is not a lab, but the data do not care.",
      "The glow is beautiful, and also a warning.",
    ],
    curieCards,
    [
      source(
        "1903 Nobel Prize facts",
        "https://www.nobelprize.org/prizes/physics/1903/marie-curie/facts/",
      ),
      source(
        "1911 Nobel Prize facts",
        "https://www.nobelprize.org/prizes/chemistry/1911/marie-curie/facts/",
      ),
      source(
        "Nobel biographical note",
        "https://www.nobelprize.org/prizes/physics/1903/marie-curie/biographical/",
      ),
    ],
    ["illness", "restricted education", "unsafe working conditions", "public attention"],
  ),
  alexander_fleming: path(
    "alexander_fleming",
    "The accident only matters if someone notices",
    [
      "Contamination is usually a problem, until it is the plot.",
      "A discovery is not the same thing as a treatment.",
    ],
    flemingCards,
    [
      source(
        "Nobel biographical note",
        "https://www.nobelprize.org/prizes/medicine/1945/fleming/biographical/",
      ),
      source("Nobel facts", "https://www.nobelprize.org/prizes/medicine/1945/fleming/facts/"),
      source("Britannica overview", "https://www.britannica.com/biography/Alexander-Fleming"),
    ],
    ["credit disputes", "war translation", "ethical antibiotic use"],
  ),
  katalin_kariko: path(
    "katalin_kariko",
    "The risky idea keeps getting rejected",
    [
      "The grant system says no. The molecule says maybe.",
      "A risky idea is only obvious after it works.",
    ],
    karikoCards,
    [
      source("Nobel facts", "https://www.nobelprize.org/prizes/medicine/2023/kariko/facts/"),
      source(
        "Nobel press release",
        "https://www.nobelprize.org/prizes/medicine/2023/press-release/",
      ),
      source(
        "University of Pennsylvania profile",
        "https://www.pennmedicine.org/news/news-releases/2023/october/katalin-kariko-and-drew-weissman-win-2023-nobel-prize-in-medicine",
      ),
    ],
    ["discrimination", "career rejection", "political conflict", "public health fear"],
  ),
} as const satisfies Record<ScientistId, ScientistPath>;

export const PROLOGUE_CARDS = [
  {
    id: cardId("prologue_1"),
    prompt: "A strange result appears in the lab, but the project has almost no money.",
    choices: [
      {
        label: "Follow the strange result",
        routeTo: "jennifer_doudna",
        effect: effect("curiosity", "up", "small"),
      },
      {
        label: "Ask for stronger evidence first",
        routeTo: "rosalind_franklin",
        effect: effect("credibility", "up", "small"),
      },
    ],
  },
  {
    id: cardId("prologue_2"),
    prompt: "The lab space is bad. Waiting for better tools could slow the work.",
    choices: [
      {
        label: "Start with what you have",
        routeTo: "marie_curie",
        effect: effect("curiosity", "up", "small"),
      },
      {
        label: "Wait for better support",
        routeTo: "alexander_fleming",
        effect: effect("credibility", "up", "small"),
      },
    ],
  },
  {
    id: cardId("prologue_3"),
    prompt: "A reviewer says the risky idea is probably wrong.",
    choices: [
      {
        label: "Keep testing the risky idea",
        routeTo: "katalin_kariko",
        effect: effect("curiosity", "up", "small"),
      },
      {
        label: "Find a collaborator who understands it",
        routeTo: "jennifer_doudna",
        effect: effect("care", "up", "small"),
      },
    ],
  },
  {
    id: cardId("prologue_4"),
    prompt: "People want a quick answer, but the data are not ready.",
    choices: [
      {
        label: "Slow down and protect the evidence",
        routeTo: "rosalind_franklin",
        effect: effect("credibility", "up", "small"),
      },
      {
        label: "Share the early clue and keep working",
        routeTo: "alexander_fleming",
        effect: effect("care", "up", "small"),
      },
    ],
  },
  {
    id: cardId("prologue_5"),
    prompt: "Your career is taking shape. Which problem feels worth the pressure?",
    choices: [
      {
        label: "Keep going after years of rejection",
        routeTo: "katalin_kariko",
        effect: effect("cash", "down", "small"),
      },
      {
        label: "Follow a dangerous discovery into the unknown",
        routeTo: "marie_curie",
        effect: effect("care", "up", "small"),
      },
    ],
  },
] as const satisfies readonly PrologueCard[];

export const GAME_CONTENT = {
  paths: SCIENTIST_PATHS,
  prologueCards: PROLOGUE_CARDS,
} as const;

export function getScientistPath(scientistId: ScientistId): ScientistPath {
  const scientistPath = SCIENTIST_PATHS[scientistId];
  return scientistPath;
}

export function getRouteCoverage(): Readonly<Record<ScientistId, number>> {
  const coverage: Record<ScientistId, number> = {
    jennifer_doudna: 0,
    rosalind_franklin: 0,
    marie_curie: 0,
    alexander_fleming: 0,
    katalin_kariko: 0,
  };

  for (const prologueCard of PROLOGUE_CARDS) {
    for (const prologueChoice of prologueCard.choices) {
      coverage[prologueChoice.routeTo] += 1;
    }
  }

  return coverage;
}

export function scientistIds(): readonly ScientistId[] {
  return SCIENTIST_IDS;
}

export function statIds(): readonly StatId[] {
  return STAT_IDS;
}

export function endingTypes(): readonly EndingType[] {
  return ENDING_TYPES;
}
