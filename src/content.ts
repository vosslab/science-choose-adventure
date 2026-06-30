import { cardId, type CardId } from "./brands";
import {
  type EffectDirection,
  type EffectMagnitude,
  type ScientistId,
  type StatId,
} from "./config";

// A condition tested against the player's current (pre-effect) stats. The condition is
// satisfied when the named stat is at least `value`. Kept deliberately minimal: a single
// at-least threshold on one stat, not a general expression engine.
export type EffectCondition = {
  readonly stat: StatId;
  readonly value: number;
};

// The alternate direction and/or magnitude swapped in when an effect's condition is satisfied.
// Each field is optional: an omitted field falls back to the effect's base value, so a swap can
// change only the direction, only the magnitude, or both. The affected `stat` never changes.
export type EffectSwap = {
  readonly direction?: EffectDirection;
  readonly magnitude?: EffectMagnitude;
};

// One card effect on a single stat. The base direction/magnitude always apply unless an optional
// condition is present and satisfied by the pre-effect stats, in which case the engine swaps in
// the alternate from `then`. Because `then` can change only direction/magnitude (never the target
// stat) and every magnitude is a nonzero delta, the affected stat moves under every resolution.
// This keeps the probe-subset rule (every probed stat is affected by at least one choice) decidable
// from the static `stat` fields alone, independent of any condition.
export type Effect = {
  readonly stat: StatId;
  readonly direction: EffectDirection;
  readonly magnitude: EffectMagnitude;
  readonly whenStatAtLeast?: EffectCondition;
  readonly then?: EffectSwap;
};

export type Choice = {
  readonly label: string;
  readonly effects: readonly Effect[];
  // When this choice is picked, the engine enqueues this card id into the run's pending draw
  // queue (pendingCardIds), so the scheduler shows that follow-up card before the next normal
  // weighted draw. Optional: most choices unlock nothing. The target must be a real CORE_DECK
  // or EVENT_DECK card id (branch-target existence is checked by content validation). The
  // enqueue dedupes and skips ids already asked, so a branch never double-queues or replays a
  // card the run has already shown.
  readonly unlocks?: CardId;
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

// Sibling of effect() for authoring a conditional effect ergonomically. The base
// direction/magnitude apply normally; when `whenStatAtLeast` is satisfied by the pre-effect
// stats, the engine swaps in the alternate fields from `then`. Exported so card authors
// can build conditional effects from outside this module.
export function conditionalEffect(
  stat: StatId,
  direction: EffectDirection,
  magnitude: EffectMagnitude,
  whenStatAtLeast: EffectCondition,
  then: EffectSwap,
): Effect {
  const nextEffect = { stat, direction, magnitude, whenStatAtLeast, then };
  return nextEffect;
}

// Build one Choice. The optional third argument enqueues a follow-up card id (the branch
// link) when the choice is picked; omit it for the common case of a choice that unlocks
// nothing. Consumers check `unlocks !== undefined`, so an absent or undefined unlocks behave
// identically and a single construction path covers both.
function choice(label: string, effects: readonly Effect[], unlocks?: CardId): Choice {
  const nextChoice = { label, effects, unlocks };
  return nextChoice;
}

//============================================
// Scientist-neutral core deck
//============================================

// Built with a local helper (coreCard) so ids are neutral ("core_1".."core_NN").
// Each card carries probes (stats it is about); every probed stat is affected
// by at least one choice, per the probe-subset-of-effects rule enforced by
// content validation.
function coreCard(
  n: number,
  prompt: string,
  first: Choice,
  second: Choice,
  probes: readonly StatId[],
): CareerCard {
  const nextCard: CareerCard = {
    id: cardId(`core_${n}`),
    prompt,
    choices: [first, second],
    probes,
  };
  return nextCard;
}

export const CORE_DECK: readonly CareerCard[] = [
  coreCard(
    1,
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
    2,
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
    3,
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
    4,
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
    5,
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
    6,
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
    7,
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
    8,
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
    9,
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
    10,
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
    11,
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
    12,
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
    13,
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
    14,
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
    15,
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
    16,
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
    17,
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
    18,
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
    19,
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
    20,
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
    21,
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
  coreCard(
    22,
    "A long-delayed paper returns from review with conflicting referee comments.",
    // Choice A treats the critique as fuel for new experiments (curiosity path).
    // Choice B writes exhaustive responses to each concern (credibility path).
    choice("Use the reviewer feedback as fuel for new experiments", [
      effect("curiosity", "up", "medium"),
      effect("credibility", "down", "small"),
    ]),
    choice("Write careful responses to address every concern", [
      effect("credibility", "up", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    ["credibility", "curiosity"],
  ),
  coreCard(
    23,
    "A prestigious journal asks you to restrict dataset access after publication.",
    choice("Refuse and keep the data openly accessible", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    choice("Accept their terms to secure the venue", [
      effect("cash", "up", "medium"),
      effect("credibility", "down", "small"),
    ]),
    ["credibility", "cash"],
  ),
  coreCard(
    24,
    "A promising student needs your strongest letter for a fiercely competitive fellowship.",
    choice("Write an honest, thorough recommendation", [
      effect("care", "up", "small"),
      effect("credibility", "up", "small"),
    ]),
    choice("Inflate their record to improve their odds", [
      effect("credibility", "down", "medium"),
      effect("care", "down", "small"),
    ]),
    ["care", "credibility"],
  ),
  coreCard(
    25,
    "After a long drought in funding, your lab lands two major grants at once.",
    choice("Hire aggressively to use the full windfall", [
      // When cash is at or above the starting value the new hires get real support;
      // below that baseline only a small care boost is possible while money is still tight.
      conditionalEffect(
        "care",
        "up",
        "small",
        { stat: "cash", value: 50 },
        { magnitude: "medium" },
      ),
      effect("cash", "down", "small"),
    ]),
    choice("Build reserves before committing to new staff", [
      effect("cash", "up", "small"),
      effect("care", "down", "small"),
    ]),
    ["cash", "care"],
  ),
  coreCard(
    26,
    "A keynote invitation arrives during the most critical phase of your main experiment.",
    choice("Accept and give the talk", [
      effect("care", "up", "medium"),
      effect("credibility", "up", "small"),
    ]),
    choice("Decline and stay focused on the experiment", [
      effect("credibility", "up", "medium"),
      effect("care", "down", "small"),
    ]),
    ["credibility", "care"],
  ),
  coreCard(
    27,
    "A lab safety audit reveals several protocols have quietly drifted out of compliance.",
    // Picking the thorough overhaul unlocks a follow-up card about the ripple effects.
    choice(
      "Overhaul every issue and retrain the whole team",
      [effect("care", "up", "medium"), effect("cash", "down", "medium")],
      cardId("core_28"),
    ),
    choice("Fix only the critical points to keep moving", [
      effect("care", "up", "small"),
      effect("cash", "down", "small"),
    ]),
    ["care", "cash"],
  ),
  coreCard(
    28,
    "Word of your safety overhaul spreads and a partner lab wants to adopt your approach.",
    // This card is the branch follow-up to core_27 choice A. Probes credibility and cash
    // (not care) so the unlock chain does not double-stack care boosts when core_27 and
    // core_28 both appear in the same run -- knowledge-sharing rewards credibility instead.
    choice("Document the methods and share them openly", [
      effect("credibility", "up", "medium"),
      effect("cash", "down", "small"),
    ]),
    choice("Offer a paid consultation instead", [
      effect("cash", "up", "small"),
      effect("credibility", "up", "small"),
    ]),
    ["credibility", "cash"],
  ),
];

//============================================
// Extreme-gated event deck
//============================================

// Rare event cards the draw scheduler injects only while the player sits in the extreme band
// (some stat value strictly above STAT_NORMAL_MAX).
//
// Eligibility contract: an event card is eligible on a given turn iff at least one of its
// `probes` stats is currently extreme (value > STAT_NORMAL_MAX). So `probes` does double duty
// here -- it both names the stat the card is about AND gates which stat-extreme unlocks the card.
// An event card themed on runaway cash carries probes: ["cash"] and only appears once cash
// crosses the extreme threshold; a curiosity-extreme card carries probes: ["curiosity"]; and so
// on. Each event card is asked at most once per run (the scheduler excludes already-asked cards),
// so an event fires a single time while extreme.
//
// Event cards are full CareerCards: every probed stat must be affected by at least one choice,
// and prompts must avoid the leak-term denylist.
function eventCard(
  id: string,
  prompt: string,
  first: Choice,
  second: Choice,
  probes: readonly StatId[],
): CareerCard {
  const nextCard: CareerCard = {
    id: cardId(id),
    prompt,
    choices: [first, second],
    probes,
  };
  return nextCard;
}

export const EVENT_DECK: readonly CareerCard[] = [
  // Cash-extreme event: appears when cash > STAT_NORMAL_MAX.
  // The conditional in choice A fires every time this card is drawn (cash is already > 100),
  // so the "up large" path always activates -- a natural representation of compounding returns
  // when a lab is already flush far beyond the normal ceiling.
  eventCard(
    "event_cash_1",
    "A wave of capital has made your lab the center of an expanding commercial ecosystem.",
    choice("Keep expanding to capture more market share", [
      conditionalEffect(
        "cash",
        "up",
        "medium",
        { stat: "cash", value: 100 },
        { magnitude: "large" },
      ),
      effect("credibility", "down", "small"),
    ]),
    choice("Redirect the surplus toward independent research", [
      effect("cash", "down", "small"),
      effect("curiosity", "up", "medium"),
    ]),
    ["cash"],
  ),
  // Curiosity-extreme event: appears when curiosity > STAT_NORMAL_MAX.
  eventCard(
    "event_curiosity_1",
    "Your stream of surprising results is running well ahead of the field's ability to keep up.",
    choice("Keep publishing at full speed", [
      effect("curiosity", "up", "medium"),
      effect("credibility", "down", "medium"),
    ]),
    choice("Pause and write a careful synthesis for the field", [
      effect("credibility", "up", "medium"),
      effect("curiosity", "down", "small"),
    ]),
    ["curiosity"],
  ),
  // Care-extreme event: appears when care > STAT_NORMAL_MAX.
  eventCard(
    "event_care_1",
    "Your reputation for protecting participants has drawn applicants from vulnerable communities.",
    choice("Expand the study to welcome as many as possible", [
      effect("care", "up", "medium"),
      effect("cash", "down", "medium"),
    ]),
    choice("Maintain strict enrollment to preserve study quality", [
      effect("care", "down", "small"),
      effect("credibility", "up", "small"),
    ]),
    ["care"],
  ),
  // Credibility-extreme event: appears when credibility > STAT_NORMAL_MAX.
  eventCard(
    "event_credibility_1",
    "Your flawless track record has regulators proposing to approve your next study without a full review.",
    choice("Request the full review regardless", [
      effect("credibility", "up", "small"),
      effect("cash", "down", "small"),
    ]),
    choice("Accept the expedited path to move faster", [
      effect("cash", "up", "medium"),
      effect("credibility", "down", "large"),
    ]),
    ["credibility"],
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
  // Disgraced-pool flavor cards below are required for content coverage (FLAVOR_POOL must
  // have at least one card per ScientistId). They are never injected mid-run: flavorLeader
  // ranks only the celebrated pool, so no disgraced name can surface before the reveal. Do
  // not remove them as "dead code" -- the coverage check fails without them.
  andrew_wakefield: [
    flavorCard(
      "andrew_wakefield",
      1,
      "A lawyer offers steady funding if your study lands on the alarming conclusion they need.",
      choice("Shape the result to fit the paying client", [
        effect("cash", "up", "large"),
        effect("credibility", "down", "large"),
      ]),
      choice("Report only what the evidence actually shows", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      ["cash", "credibility"],
    ),
  ],
  hwang_woosuk: [
    flavorCard(
      "hwang_woosuk",
      1,
      "Volunteers for your samples were recruited in ways you would rather not examine.",
      choice("Use the samples and keep moving fast", [
        effect("curiosity", "up", "medium"),
        effect("care", "down", "large"),
      ]),
      choice("Pause and fix how people were recruited", [
        effect("care", "up", "large"),
        effect("curiosity", "down", "small"),
      ]),
      ["curiosity", "care"],
    ),
    flavorCard(
      "hwang_woosuk",
      2,
      "Your headline result is far shakier than the press release already going out.",
      choice("Let the bold claim stand for now", [
        effect("cash", "up", "large"),
        effect("credibility", "down", "large"),
      ]),
      choice("Pull the claim until the data hold up", [
        effect("credibility", "up", "large"),
        effect("cash", "down", "medium"),
      ]),
      ["cash", "credibility"],
    ),
  ],
  he_jiankui: [
    flavorCard(
      "he_jiankui",
      1,
      "You could be first to try a daring procedure on people, well ahead of any oversight.",
      choice("Race ahead of the rules to be first", [
        effect("curiosity", "up", "large"),
        effect("care", "down", "large"),
      ]),
      choice("Wait for review and real consent to catch up", [
        effect("care", "up", "large"),
        effect("curiosity", "down", "medium"),
      ]),
      ["curiosity", "care"],
    ),
  ],
  gary_strobel: [
    flavorCard(
      "gary_strobel",
      1,
      "You want to test a living agent out in the open before the permits clear.",
      choice("Release it now and ask forgiveness later", [
        effect("curiosity", "up", "medium"),
        effect("care", "down", "large"),
      ]),
      choice("Hold until the approvals come through", [
        effect("care", "up", "medium"),
        effect("curiosity", "down", "small"),
      ]),
      ["curiosity", "care"],
    ),
  ],
  purdue_sackler: [
    flavorCard(
      "purdue_sackler",
      1,
      "Sales would soar if you quietly downplay how risky the product can be.",
      choice("Soften the warnings to boost sales", [
        effect("cash", "up", "large"),
        effect("care", "down", "large"),
      ]),
      choice("Keep the warnings blunt and honest", [
        effect("care", "up", "large"),
        effect("cash", "down", "medium"),
      ]),
      ["cash", "care"],
    ),
  ],
  jan_hendrik_schon: [
    flavorCard(
      "jan_hendrik_schon",
      1,
      "One more spectacular figure would keep the funding and the fame rolling in.",
      choice("Polish the figure past what the data support", [
        effect("cash", "up", "large"),
        effect("credibility", "down", "large"),
      ]),
      choice("Show the unglamorous real measurement", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      ["cash", "credibility"],
    ),
  ],
  diederik_stapel: [
    flavorCard(
      "diederik_stapel",
      1,
      "A perfectly clean dataset would make a far better story than your messy one.",
      choice("Tidy the numbers until the story sings", [
        effect("cash", "up", "medium"),
        effect("credibility", "down", "large"),
      ]),
      choice("Publish the messy, honest results", [
        effect("credibility", "up", "medium"),
        effect("cash", "down", "small"),
      ]),
      ["cash", "credibility"],
    ),
  ],
  paolo_macchiarini: [
    flavorCard(
      "paolo_macchiarini",
      1,
      "A desperate patient asks for an unproven procedure you have never truly tested.",
      choice("Attempt the dramatic, untested fix", [
        effect("curiosity", "up", "large"),
        effect("care", "down", "large"),
      ]),
      choice("Refuse until it is shown to be safe", [
        effect("care", "up", "large"),
        effect("curiosity", "down", "medium"),
      ]),
      ["curiosity", "care"],
    ),
  ],
  haruko_obokata: [
    flavorCard(
      "haruko_obokata",
      1,
      "A simple, astonishing result would make you famous overnight if it holds.",
      choice("Announce the breakthrough before it is solid", [
        effect("cash", "up", "large"),
        effect("credibility", "down", "large"),
      ]),
      choice("Repeat the work until it is reproducible", [
        effect("credibility", "up", "large"),
        effect("cash", "down", "small"),
      ]),
      ["cash", "credibility"],
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
  andrew_wakefield: [
    source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Andrew_Wakefield"),
    source("BMJ: how the fraud was uncovered", "https://www.bmj.com/content/342/bmj.c5347"),
    source(
      "Retraction notice (The Lancet)",
      "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(10)60175-4/fulltext",
    ),
  ],
  hwang_woosuk: [source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Hwang_Woo-suk")],
  he_jiankui: [source("Wikipedia: the affair", "https://en.wikipedia.org/wiki/He_Jiankui_affair")],
  gary_strobel: [
    source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Gary_Strobel"),
    source(
      "NYT: unauthorized field release halted",
      "https://www.nytimes.com/1987/09/04/us/tearful-scientist-halts-gene-test.html",
    ),
  ],
  purdue_sackler: [
    source("Wikipedia: the company", "https://en.wikipedia.org/wiki/Purdue_Pharma"),
    source("Wikipedia: the family", "https://en.wikipedia.org/wiki/Sackler_family"),
  ],
  jan_hendrik_schon: [
    source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Jan_Hendrik_Sch%C3%B6n"),
  ],
  diederik_stapel: [source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Diederik_Stapel")],
  paolo_macchiarini: [
    source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Paolo_Macchiarini"),
  ],
  haruko_obokata: [source("Wikipedia: the case", "https://en.wikipedia.org/wiki/Haruko_Obokata")],
};
