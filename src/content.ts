import { cardId, type CardId } from "./brands";
import {
  type EffectDirection,
  type EffectMagnitude,
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
  readonly choices: readonly [Choice, Choice];
  // Stats this card is thematically about; used for draw-weight in the engine.
  // Every probed stat must be affected by at least one of the two choices.
  readonly probes: readonly StatId[];
};

export type SourceNote = {
  readonly label: string;
  readonly url: string;
};

function effect(stat: StatId, direction: EffectDirection, magnitude: EffectMagnitude): Effect {
  const nextEffect = { stat, direction, magnitude };
  return nextEffect;
}

function choice(label: string, effects: readonly Effect[]): Choice {
  const nextChoice = { label, effects };
  return nextChoice;
}

//============================================
// Scientist-neutral core deck
//============================================

// Built with a local helper (coreCard) so ids are neutral ("core_1".."core_NN").
// Each card carries probes (stats it is about); every probed stat is affected
// by at least one choice, per the probe-subset-of-effects rule enforced by
// content validation.
let coreCardCounter = 0;
function coreCard(
  prompt: string,
  first: Choice,
  second: Choice,
  probes: readonly StatId[],
): CareerCard {
  coreCardCounter += 1;
  const nextCard: CareerCard = {
    id: cardId(`core_${coreCardCounter}`),
    prompt,
    choices: [first, second],
    probes,
  };
  return nextCard;
}

export const CORE_DECK: readonly CareerCard[] = [
  coreCard(
    "A funder offers a large grant if you promise results on their fast timeline.",
    choice("Take the money and the deadline", [
      effect("cash", "up", "large"),
      effect("care", "down", "small"),
    ]),
    choice("Decline and keep your own pace", [
      effect("cash", "down", "small"),
      effect("care", "up", "medium"),
    ]),
    ["cash", "care"],
  ),
  coreCard(
    "Your data quietly contradict the hypothesis your whole project is built on.",
    choice("Report the contradiction openly", [
      effect("credibility", "up", "large"),
      effect("cash", "down", "small"),
    ]),
    choice("Set the odd data aside for now", [
      effect("credibility", "down", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    ["credibility", "curiosity"],
  ),
  coreCard(
    "A senior colleague wants first authorship on work you led.",
    choice("Insist on fair credit", [
      effect("credibility", "up", "medium"),
      effect("care", "down", "small"),
    ]),
    choice("Concede to keep the peace", [
      effect("care", "up", "medium"),
      effect("credibility", "down", "medium"),
    ]),
    ["credibility", "care"],
  ),
  coreCard(
    "A risky experiment could be a breakthrough or a dead end with months lost.",
    choice("Run the risky experiment", [
      effect("curiosity", "up", "large"),
      effect("cash", "down", "medium"),
    ]),
    choice("Choose the safe, fundable study", [
      effect("cash", "up", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    ["curiosity", "cash"],
  ),
  coreCard(
    "A popular talk invitation would eat a week of lab time but reach thousands.",
    choice("Give the public talk", [
      effect("care", "up", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    choice("Stay at the bench", [
      effect("curiosity", "up", "medium"),
      effect("care", "down", "small"),
    ]),
    ["care", "curiosity"],
  ),
  coreCard(
    "A rival team may publish the same finding within weeks.",
    choice("Rush a thinner paper out first", [
      effect("cash", "up", "small"),
      effect("credibility", "down", "medium"),
    ]),
    choice("Hold for the careful version", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    ["credibility", "cash"],
  ),
  coreCard(
    "A struggling junior researcher needs hours of mentoring you do not have.",
    choice("Make the time to mentor them", [
      effect("care", "up", "large"),
      effect("curiosity", "down", "small"),
    ]),
    choice("Protect your own deadlines", [
      effect("curiosity", "up", "small"),
      effect("care", "down", "medium"),
    ]),
    ["care", "curiosity"],
  ),
  coreCard(
    "A flashy result would impress reviewers, but one control is still missing.",
    choice("Add the slow control first", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    choice("Submit now and add it later", [
      effect("cash", "up", "medium"),
      effect("credibility", "down", "medium"),
    ]),
    ["credibility", "cash"],
  ),
  coreCard(
    "An odd side observation has nothing to do with your funded goal.",
    choice("Chase the curious tangent", [
      effect("curiosity", "up", "large"),
      effect("cash", "down", "small"),
    ]),
    choice("Stay focused on the deliverable", [
      effect("cash", "up", "small"),
      effect("curiosity", "down", "medium"),
    ]),
    ["curiosity", "cash"],
  ),
  coreCard(
    "A company will fund your lab if you keep the method confidential.",
    choice("Take the deal and stay quiet", [
      effect("cash", "up", "large"),
      effect("care", "down", "medium"),
    ]),
    choice("Keep the method open to all", [
      effect("care", "up", "medium"),
      effect("cash", "down", "medium"),
    ]),
    ["cash", "care"],
  ),
  coreCard(
    "A reporter wants a bold quote that overstates what your study shows.",
    choice("Correct the overstatement", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    choice("Give the headline they want", [
      effect("cash", "up", "medium"),
      effect("credibility", "down", "large"),
    ]),
    ["credibility", "cash"],
  ),
  coreCard(
    "Faster lab shortcuts would skip some safety checks.",
    choice("Keep every safety check", [
      effect("care", "up", "large"),
      effect("cash", "down", "small"),
    ]),
    choice("Cut checks to move faster", [
      effect("cash", "up", "medium"),
      effect("care", "down", "large"),
    ]),
    ["care", "cash"],
  ),
  coreCard(
    "A reviewer demands months of extra experiments you doubt are needed.",
    choice("Do the extra work thoroughly", [
      effect("credibility", "up", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    choice("Push back and defend the paper", [
      effect("curiosity", "up", "small"),
      effect("credibility", "down", "small"),
    ]),
    ["credibility", "curiosity"],
  ),
  coreCard(
    "A collaboration offer would share credit but double your reach.",
    choice("Join forces and share credit", [
      effect("care", "up", "medium"),
      effect("credibility", "down", "small"),
    ]),
    choice("Keep the project solely yours", [
      effect("credibility", "up", "medium"),
      effect("care", "down", "small"),
    ]),
    ["care", "credibility"],
  ),
  coreCard(
    "A boring but solid dataset sits next to a wild, uncertain idea.",
    choice("Dig into the wild idea", [
      effect("curiosity", "up", "large"),
      effect("credibility", "down", "small"),
    ]),
    choice("Build on the solid dataset", [
      effect("credibility", "up", "medium"),
      effect("curiosity", "down", "medium"),
    ]),
    ["curiosity", "credibility"],
  ),
  coreCard(
    "Equipment failed and a costly repair would drain this year's budget.",
    choice("Pay for the proper repair", [
      effect("care", "up", "small"),
      effect("cash", "down", "large"),
    ]),
    choice("Improvise a cheap workaround", [
      effect("cash", "up", "medium"),
      effect("care", "down", "medium"),
    ]),
    ["care", "cash"],
  ),
  coreCard(
    "A volunteer outreach program wants you to teach kids on weekends.",
    choice("Commit to the outreach", [
      effect("care", "up", "large"),
      effect("cash", "down", "small"),
    ]),
    choice("Reserve weekends for research", [
      effect("curiosity", "up", "medium"),
      effect("care", "down", "small"),
    ]),
    ["care", "curiosity"],
  ),
  coreCard(
    "Your bold preliminary claim is getting attention before it is confirmed.",
    choice("Walk it back until confirmed", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    choice("Ride the buzz while it lasts", [
      effect("cash", "up", "large"),
      effect("credibility", "down", "medium"),
    ]),
    ["credibility", "cash"],
  ),
  coreCard(
    "A grant rewards quantity of papers over depth of any single study.",
    choice("Split the work into many papers", [
      effect("cash", "up", "medium"),
      effect("credibility", "down", "small"),
    ]),
    choice("Write one deep, careful paper", [
      effect("credibility", "up", "large"),
      effect("cash", "down", "medium"),
    ]),
    ["cash", "credibility"],
  ),
  coreCard(
    "An unexpected anomaly tempts you away from a nearly finished project.",
    choice("Follow the anomaly now", [
      effect("curiosity", "up", "large"),
      effect("care", "down", "small"),
    ]),
    choice("Finish what you started first", [
      effect("care", "up", "medium"),
      effect("curiosity", "down", "medium"),
    ]),
    ["curiosity", "care"],
  ),
  coreCard(
    "A whistleblower role would expose sloppy data but burn key relationships.",
    choice("Report the bad data", [
      effect("credibility", "up", "large"),
      effect("care", "down", "medium"),
    ]),
    choice("Stay quiet to keep allies", [
      effect("care", "up", "small"),
      effect("credibility", "down", "large"),
    ]),
    ["credibility", "care"],
  ),
];

//============================================
// Scientist flavor pool
//============================================

// Flavor cards are retagged versions of the original scientist decks. They carry
// thematic flavor but must NOT name a scientist or use an instantly-identifying
// term (see the leak-term denylist enforced by content validation). Ids are
// branded as "flavor_<scientist>_<n>" so they never collide with core_* cards.
// Probes follow the subset rule.
function flavorCard(
  scientistId: ScientistId,
  index: number,
  prompt: string,
  first: Choice,
  second: Choice,
  probes: readonly StatId[],
): CareerCard {
  const nextCard: CareerCard = {
    id: cardId(`flavor_${scientistId}_${index}`),
    prompt,
    choices: [first, second],
    probes,
  };
  return nextCard;
}

// Flavor decks keyed by scientist. Prompts keep each scientist's underlying
// dilemma but drop the fingerprint: no surnames and no identifying nouns such as
// "mRNA", "radium", "Photo 51", "mold plate", "penicillin", or "CRISPR".
export const FLAVOR_POOL: Record<ScientistId, readonly CareerCard[]> = {
  jennifer_doudna: [
    flavorCard(
      "jennifer_doudna",
      1,
      "A student brings data from a microbial defense system that looks oddly programmable.",
      choice("Chase the strange, repurposable system", [
        effect("curiosity", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Return to safer, fundable structural work", [
        effect("cash", "up", "small"),
        effect("curiosity", "down", "small"),
      ]),
      ["curiosity", "cash"],
    ),
    flavorCard(
      "jennifer_doudna",
      2,
      "A powerful new editing tool could move faster than public trust in it.",
      choice("Call for shared guardrails first", [
        effect("care", "up", "large"),
        effect("curiosity", "down", "small"),
      ]),
      choice("Trust the field to sort it out later", [
        effect("curiosity", "up", "medium"),
        effect("care", "down", "small"),
      ]),
      ["care", "curiosity"],
    ),
    flavorCard(
      "jennifer_doudna",
      3,
      "A patent office wants a timeline far cleaner than the science actually felt.",
      choice("Document the messy real path", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Let lawyers smooth the story", [
        effect("cash", "up", "medium"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "cash"],
    ),
    flavorCard(
      "jennifer_doudna",
      4,
      "The public hears the scariest application before it hears the basic science.",
      choice("Step into the public debate", [
        effect("care", "up", "large"),
        effect("cash", "down", "small"),
      ]),
      choice("Stay quiet in the lab", [
        effect("credibility", "up", "small"),
        effect("care", "down", "medium"),
      ]),
      ["care", "credibility"],
    ),
  ],
  rosalind_franklin: [
    flavorCard(
      "rosalind_franklin",
      1,
      "An imaging pattern is almost clear enough to speak for itself.",
      choice("Collect cleaner data before claiming", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Publish the suggestive hint now", [
        effect("curiosity", "up", "medium"),
        effect("credibility", "down", "small"),
      ]),
      ["credibility", "curiosity"],
    ),
    flavorCard(
      "rosalind_franklin",
      2,
      "A colleague wants a quick model built from your partial evidence.",
      choice("Demand more measurements first", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Let the speculative model lead", [
        effect("cash", "up", "small"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "cash"],
    ),
    flavorCard(
      "rosalind_franklin",
      3,
      "A supervisor wants your data shared with no clear credit rules.",
      choice("Ask for written terms on credit", [
        effect("credibility", "up", "medium"),
        effect("care", "down", "small"),
      ]),
      choice("Keep the peace and hand it over", [
        effect("care", "up", "medium"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "care"],
    ),
    flavorCard(
      "rosalind_franklin",
      4,
      "A meeting reframes your caution as a personality flaw.",
      choice("Return calmly to the data", [
        effect("care", "up", "small"),
        effect("curiosity", "down", "small"),
      ]),
      choice("Fight the room to defend the standard", [
        effect("credibility", "up", "medium"),
        effect("care", "down", "medium"),
      ]),
      ["care", "credibility"],
    ),
  ],
  marie_curie: [
    flavorCard(
      "marie_curie",
      1,
      "Only a crude, drafty workspace is available, if you can call it a workspace.",
      choice("Start the work in the shed anyway", [
        effect("curiosity", "up", "large"),
        effect("care", "down", "small"),
      ]),
      choice("Wait for proper, safer space", [
        effect("care", "up", "medium"),
        effect("curiosity", "down", "small"),
      ]),
      ["curiosity", "care"],
    ),
    flavorCard(
      "marie_curie",
      2,
      "Processing the raw ore will take months of exhausting manual labor.",
      choice("Commit to the grinding work", [
        effect("curiosity", "up", "large"),
        effect("cash", "down", "medium"),
      ]),
      choice("Hunt for a cheaper shortcut", [
        effect("cash", "up", "medium"),
        effect("curiosity", "down", "small"),
      ]),
      ["curiosity", "cash"],
    ),
    flavorCard(
      "marie_curie",
      3,
      "A colleague says safety precautions will only slow the discovery down.",
      choice("Add the precautions anyway", [
        effect("care", "up", "large"),
        effect("curiosity", "down", "small"),
      ]),
      choice("Push through without them", [
        effect("curiosity", "up", "medium"),
        effect("care", "down", "large"),
      ]),
      ["care", "curiosity"],
    ),
    flavorCard(
      "marie_curie",
      4,
      "A newspaper wants the heroic, mythologized version of your work.",
      choice("Insist they mention the hard labor", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Feed the flattering myth", [
        effect("cash", "up", "medium"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "cash"],
    ),
  ],
  alexander_fleming: [
    flavorCard(
      "alexander_fleming",
      1,
      "An accidental contamination on a dish reveals something unexpected.",
      choice("Look closer at the strange clearing", [
        effect("curiosity", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Discard the spoiled dish and move on", [
        effect("care", "up", "small"),
        effect("curiosity", "down", "medium"),
      ]),
      ["curiosity", "care"],
    ),
    flavorCard(
      "alexander_fleming",
      2,
      "The promising substance is unstable and very hard to purify.",
      choice("Publish the clue for others to chase", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Hold it back until it becomes a product", [
        effect("cash", "up", "small"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "cash"],
    ),
    flavorCard(
      "alexander_fleming",
      3,
      "Turning the discovery into a real treatment needs outside chemists.",
      choice("Invite collaborators to scale it up", [
        effect("care", "up", "medium"),
        effect("credibility", "down", "small"),
      ]),
      choice("Guard the discovery as yours alone", [
        effect("credibility", "up", "large"),
        effect("care", "down", "medium"),
      ]),
      ["care", "credibility"],
    ),
    flavorCard(
      "alexander_fleming",
      4,
      "Wide use of the new treatment is growing fast, and so is misuse.",
      choice("Warn loudly about resistance", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Celebrate without the caveats", [
        effect("cash", "up", "large"),
        effect("credibility", "down", "medium"),
      ]),
      ["credibility", "cash"],
    ),
  ],
  katalin_kariko: [
    flavorCard(
      "katalin_kariko",
      1,
      "Another grant review calls your favored molecule unrealistic.",
      choice("Keep going on the unfashionable idea", [
        effect("curiosity", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      choice("Switch to a safer, fundable project", [
        effect("cash", "up", "small"),
        effect("curiosity", "down", "medium"),
      ]),
      ["curiosity", "cash"],
    ),
    flavorCard(
      "katalin_kariko",
      2,
      "A demotion threatens your title, your pay, and your morale.",
      choice("Separate your title from your purpose", [
        effect("curiosity", "up", "medium"),
        effect("cash", "down", "medium"),
      ]),
      choice("Take the hint and step back", [
        effect("care", "up", "small"),
        effect("curiosity", "down", "medium"),
      ]),
      ["curiosity", "cash"],
    ),
    flavorCard(
      "katalin_kariko",
      3,
      "Companies finally start noticing the platform you bet your career on.",
      choice("Move into translation and scale-up", [
        effect("cash", "up", "large"),
        effect("curiosity", "down", "small"),
      ]),
      choice("Stay purely academic and independent", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      ["cash", "credibility"],
    ),
    flavorCard(
      "katalin_kariko",
      4,
      "A worried public hears about an unfamiliar new technology.",
      choice("Patiently explain its long history", [
        effect("credibility", "up", "medium"),
        effect("care", "up", "small"),
      ]),
      choice("Dismiss the fear as ignorance", [
        effect("care", "down", "medium"),
        effect("credibility", "down", "small"),
      ]),
      ["credibility", "care"],
    ),
  ],
};

//============================================
// Source notes (preserved per scientist)
//============================================

function source(label: string, url: string): SourceNote {
  const note = { label, url };
  return note;
}

// Per-scientist educational source notes, read by the result reveal screen once
// the matched scientist's notes are unlocked.
export const SCIENTIST_SOURCE_NOTES: Record<ScientistId, readonly SourceNote[]> = {
  jennifer_doudna: [
    source("Nobel Prize facts", "https://www.nobelprize.org/prizes/chemistry/2020/doudna/facts/"),
    source(
      "Nobel biographical note",
      "https://www.nobelprize.org/prizes/chemistry/2020/doudna/biographical/",
    ),
    source("Britannica overview", "https://www.britannica.com/biography/Jennifer-Doudna"),
  ],
  rosalind_franklin: [
    source("King's College London profile", "https://www.kcl.ac.uk/people/rosalind-franklin"),
    source("Britannica overview", "https://www.britannica.com/biography/Rosalind-Franklin"),
    source(
      "Nature education DNA history",
      "https://www.nature.com/scitable/topicpage/discovery-of-dna-structure-and-function-watson-397/",
    ),
  ],
  marie_curie: [
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
  alexander_fleming: [
    source(
      "Nobel biographical note",
      "https://www.nobelprize.org/prizes/medicine/1945/fleming/biographical/",
    ),
    source("Nobel facts", "https://www.nobelprize.org/prizes/medicine/1945/fleming/facts/"),
    source("Britannica overview", "https://www.britannica.com/biography/Alexander-Fleming"),
  ],
  katalin_kariko: [
    source("Nobel facts", "https://www.nobelprize.org/prizes/medicine/2023/kariko/facts/"),
    source("Nobel press release", "https://www.nobelprize.org/prizes/medicine/2023/press-release/"),
    source(
      "University of Pennsylvania profile",
      "https://www.pennmedicine.org/news/news-releases/2023/october/katalin-kariko-and-drew-weissman-win-2023-nobel-prize-in-medicine",
    ),
  ],
};
