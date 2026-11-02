import type { AgeBand, Rung, TutorRequest } from "./types";
import { getRung, RUNGS } from "./ladder/rungs";
import { passageFor } from "./ladder/corpus";
import { partsFor } from "./ladder/phonics";
import { canStretch } from "./ladder/stretch";
import { isAllowed } from "./ladder/validator";
import { isIrregular } from "./ladder/lexicon";
import { newWordsAt } from "./ladder/bank";
import { capForBand, normalizeTutorRequest } from "./persona";

/**
 * Mrs. Wren without a language model. This is a first-class path: when the gateway is
 * unavailable every reply comes from here, so it answers the common questions warmly,
 * varies its phrasing, and follows the same voice rules as the persona.
 */

/* ------------------------------------------------------------------------- */
/* Content                                                                    */
/* ------------------------------------------------------------------------- */

type Part = "adj" | "noun" | "verb";

/** Classical words from rungs.ts: how to praise with them, and a short example. */
const CLASSICAL: Record<string, { part: Part; example: string }> = {
  diligent: { part: "adj", example: "The little red hen was diligent. She kept working until the bread was baked." },
  patient: { part: "adj", example: "A patient farmer waits for the seeds to grow." },
  steadfast: { part: "adj", example: "The tortoise was steadfast. He kept going all the way to the end." },
  courage: { part: "noun", example: "The little mouse showed courage when she helped the great lion." },
  honest: { part: "adj", example: "An honest child tells the truth, even when it is hard." },
  humble: { part: "adj", example: "A humble winner says thank you and does not boast." },
  gentle: { part: "adj", example: "We are gentle with a baby bird in its nest." },
  generous: { part: "adj", example: "A generous friend shares her bread." },
  cheerful: { part: "adj", example: "A cheerful helper sings while she works." },
  orderly: { part: "adj", example: "An orderly desk has a place for every pencil." },
  truthful: { part: "adj", example: "The shepherd boy was not truthful, so no one came when the wolf was real." },
  attentive: { part: "adj", example: "An attentive reader looks at each letter and listens to each sound." },
  brave: { part: "adj", example: "It takes a brave heart to try a brand new word." },
  careful: { part: "adj", example: "A careful reader looks at every letter before saying the word." },
  persevere: { part: "verb", example: "When a word is hard, we persevere. We try again." },
  grateful: { part: "adj", example: "We are grateful for warm bread and good friends." },
  temperate: { part: "adj", example: "A temperate child eats one slice of cake, not five." },
  kind: { part: "adj", example: "The lion was kind to the little mouse, and the mouse was kind back." },
  wise: { part: "adj", example: "The wise ant saved food for the winter." },
  curious: { part: "adj", example: "A curious child asks how a bird builds its nest." },
  joyful: { part: "adj", example: "The birds sound joyful in the morning." },
  thankful: { part: "adj", example: "We say thank you at the table because we are thankful." },
  faithful: { part: "adj", example: "A faithful dog waits by the gate for its family." },
  content: { part: "adj", example: "The cat was content by the warm stove." },
  meek: { part: "adj", example: "The meek lamb stood quietly by the shepherd." },
  patience: { part: "noun", example: "With patience, the crow dropped in stone after stone." },
  loyal: { part: "adj", example: "A loyal friend stays by your side." },
  noble: { part: "adj", example: "The noble knight helped those who were weak." },
  fortitude: { part: "noun", example: "The ant worked with fortitude through the long, hot summer." },
  reverent: { part: "adj", example: "A reverent person speaks softly in a special place." },
  quiet: { part: "adj", example: "A quiet room is a good room for reading." },
  watchful: { part: "adj", example: "A watchful hen keeps an eye on her chicks." },
  thrifty: { part: "adj", example: "A thrifty family saves what it does not need today." },
  industrious: { part: "adj", example: "The industrious ant was busy all summer long." },
  resourceful: { part: "adj", example: "The resourceful crow used stones to raise the water." },
};

/** Glosses for the classical words, taken from the rungs so they always agree. */
const CLASSICAL_GLOSS: Record<string, string> = Object.fromEntries(
  RUNGS.flatMap((r) => (r.classicalWord ? [[r.classicalWord.word.toLowerCase(), r.classicalWord.gloss]] : [])),
);

/** Plain meanings for story words a child is likely to ask about. */
const GLOSSARY: Record<string, string> = {
  fable: "A fable is a short, old story, often about animals, that teaches a lesson.",
  moral: "The moral is the lesson a story teaches.",
  tortoise: "A tortoise is a slow animal with a hard shell on its back.",
  hare: "A hare is like a big rabbit with long legs, and it runs very fast.",
  grasshopper: "A grasshopper is a green insect with long legs that hops and chirps.",
  shepherd: "A shepherd is a person who takes care of sheep.",
  pitcher: "A pitcher is a tall jug for holding water or milk.",
  harvest: "The harvest is the time when the farmer gathers in the crops.",
  wheat: "Wheat is a tall grass with seeds that are ground into flour for bread.",
  flour: "Flour is a soft white powder made from wheat, and we use it to bake bread.",
  brook: "A brook is a small stream of water.",
  porch: "A porch is a covered place just outside the front door of a house.",
  torch: "A torch is a stick with a flame at the top, carried to give light.",
  herd: "A herd is a big group of animals, like cows, that stay together.",
  fern: "A fern is a green plant with soft, feathery leaves.",
  den: "A den is the home of a wild animal, like a fox or a bear.",
  cave: "A cave is a big hole in the side of a hill or under the ground.",
  mane: "A mane is the long hair on the neck of a horse or a lion.",
  sled: "A sled is a little cart with no wheels that slides over snow.",
  skunk: "A skunk is a black and white animal that can make a very bad smell.",
  moth: "A moth is an insect like a butterfly that flies at night.",
  chess: "Chess is a quiet game played with kings, queens and knights on a checked board.",
  napkin: "A napkin is a cloth you use at the table to wipe your hands and mouth.",
  stove: "A stove is where we cook food or make a warm fire.",
  barn: "A barn is a big farm building for animals and hay.",
  cart: "A cart is a wagon that a horse or a person can pull.",
  pond: "A pond is a small lake.",
  hut: "A hut is a small, plain house.",
  jug: "A jug is a pot with a handle for pouring water or milk.",
  keg: "A keg is a small barrel.",
  cub: "A cub is a baby bear, lion or fox.",
  cot: "A cot is a small, narrow bed.",
  mill: "A mill is a building where grain is ground into flour.",
  quilt: "A quilt is a warm blanket made of many pieces of cloth sewn together.",
  hen: "A hen is a mother chicken.",
  wren: "A wren is a small brown songbird with a tail that points up. That is where my name comes from.",
  thrush: "A thrush is a brown songbird with a speckled chest.",
  jay: "A jay is a noisy, bright blue bird.",
  robin: "A robin is a songbird with a red chest.",
  gull: "A gull is a gray and white bird that lives by the sea.",
  mast: "A mast is the tall pole that holds up the sails on a ship.",
  deck: "The deck is the floor of a ship.",
  raft: "A raft is a flat boat made of logs tied together.",
  hull: "The hull is the body of a ship, the part that sits in the water.",
  compass: "A compass is a tool with a needle that always points north, so you can find your way.",
  quest: "A quest is a long journey to find something or do something brave.",
  armor: "Armor is the metal suit a knight wears to stay safe.",
  helmet: "A helmet is a hard hat that keeps your head safe.",
  foal: "A foal is a baby horse.",
  hoof: "A hoof is the hard foot of a horse.",
  trot: "To trot is to go at a quick, bouncy pace, the way a horse does.",
  gallop: "To gallop is to run very fast, the way a horse does.",
  hive: "A hive is the home where bees live and make honey.",
  comet: "A comet is a ball of ice and dust that flies through space with a long, bright tail.",
  planet: "A planet is a great round world that travels around the sun, like our Earth.",
  lantern: "A lantern is a lamp with a handle, so you can carry the light with you.",
  plow: "A plow is a tool that a farmer uses to turn over the soil before planting.",
  chirp: "A chirp is the short, high sound a little bird makes.",
  splash: "A splash is the sound and spray when something hits the water.",
  shelf: "A shelf is a flat board on the wall to hold books and dishes.",
  sunset: "Sunset is the time in the evening when the sun goes down.",
  insect: "An insect is a small creature with six legs, like an ant or a bee.",
  phonics: "Phonics means learning the sounds that letters make, so you can read new words.",
  syllable: "A syllable is one beat in a word. Rabbit has two: rab, bit.",
  vowel: "The vowels are a, e, i, o and u. Every word needs at least one.",
  consonant: "A consonant is any letter that is not a vowel, like b, m or t.",
  valiant: "Valiant means very brave, the way a good knight is brave when danger comes.",
  virtue: "A virtue is a good habit of the heart, like honesty, kindness or courage.",
  virtues: "Virtues are good habits of the heart, like honesty, kindness and courage.",
  courage: "Courage is being brave even when you feel afraid.",
  wisdom: "Wisdom is knowing what is good and true, and choosing it.",
  humble: "Humble means you do not boast. You let your good work speak for you.",
  humility: "Humility is not boasting, and thinking of others before yourself.",
  mercy: "Mercy is being kind to someone when you could have been hard on them, like the lion who let the mouse go.",
  grace: "Grace is a gift of kindness that you did not have to earn.",
  honor: "Honor is being trusted because you always do what is right.",
  duty: "Your duty is the work you ought to do, even when no one is watching.",
  prudent: "Prudent means careful and wise about what you do next, like the ant who saved food for winter.",
  justice: "Justice means being fair, and giving each person what is right.",
  charity: "Charity is love that gives to others, like sharing your bread.",
  faith: "Faith is trusting in what is good and true, even before you can see it.",
  hope: "Hope is looking forward to something good that is coming.",
  truth: "The truth is what really happened, told plainly.",
  steadfast: "Steadfast means you keep going and do not give up, like the slow tortoise.",
  obedient: "Obedient means you listen and do what a good parent or teacher asks.",
  courteous: "Courteous means polite and kind, saying please and thank you.",
  compassion: "Compassion is feeling sorry for someone who is hurting, and wanting to help.",
  forgive: "To forgive is to let go of being cross with someone who has said sorry.",
  perseverance: "Perseverance is not giving up, even when something is hard.",
  character: "Your character is the kind of person you are inside, shown by what you do.",
  integrity: "Integrity means you do what is right, even when no one is looking.",
  respect: "Respect is treating others as if they matter, because they do.",
  knight: "A knight was a soldier long ago who rode a horse and promised to protect others.",
  castle: "A castle is a big stone building with high walls, where a king or a lord lived long ago.",
  kingdom: "A kingdom is a land ruled by a king or a queen.",
  primer: "A primer is a first book for learning to read.",
  alphabet: "The alphabet is all the letters, from a to z, in order.",
  sentence: "A sentence is a group of words that tells a whole thought. It starts with a capital letter and ends with a mark like a period.",
  narration: "Narration is telling back a story in your own words, after you hear or read it.",
  copywork: "Copywork is copying a good sentence carefully by hand, letter by letter.",
};

interface Fable {
  key: string;
  match: RegExp;
  topics: string[];
  short: string; // under 35 words: two sentences and the moral
  long: string; // under 50 words
}

const FABLES: Fable[] = [
  {
    key: "tortoise",
    match: /tortoise|hare|turtle|race/,
    topics: ["map", "train", "star", "horse"],
    short: "A proud hare raced a slow tortoise and stopped for a nap. The tortoise kept going, step by step, and won the race. The moral: slow and steady wins the race.",
    long: "A proud hare raced a slow tortoise, ran far ahead, and lay down for a nap. The tortoise kept going, step by step, and crossed the finish line first. The moral: slow and steady wins the race.",
  },
  {
    key: "hen",
    match: /red hen|little red|hen|wheat|bread/,
    topics: ["baking", "garden", "farm", "bird"],
    short: "The little red hen asked for help to plant and bake the wheat. No one helped, so she baked the bread and ate it herself. The moral: those who help, share.",
    long: "The little red hen asked her friends to help her plant, cut and bake the wheat, and each one said, not I. So she did all the work herself, and when the bread was warm, she ate it. The moral: those who help, share.",
  },
  {
    key: "wolf",
    match: /wolf|shepherd|cried/,
    topics: ["farm", "animal"],
    short: "A shepherd boy cried wolf to trick the villagers, again and again. When a real wolf came, no one believed him. The moral: tell the truth, and people will trust you.",
    long: "A shepherd boy cried wolf again and again, just to watch the villagers come running up the hill. When a real wolf came, he cried out, but no one believed him. The moral: tell the truth, and people will trust you.",
  },
  {
    key: "ant",
    match: /\bant\b|ants|grasshopper/,
    topics: ["insect", "music"],
    short: "All summer the ant stored food while the grasshopper sang and played. When winter came, the ant had plenty, and the grasshopper was hungry. The moral: work today for the days ahead.",
    long: "All summer long the ant carried grain to her nest, while the grasshopper sang in the sun and laughed at her. When the cold winter came, the ant had plenty to eat, and the grasshopper had nothing. The moral: work today, and you will be ready tomorrow.",
  },
  {
    key: "lion",
    match: /lion|mouse|mice/,
    topics: ["knight", "animal", "ship"],
    short: "A great lion let a tiny mouse go free. Later the lion was caught in a net, and the mouse chewed the ropes and set him free. The moral: no kindness is ever wasted.",
    long: "A great lion caught a tiny mouse, then laughed and let her go. Later the lion was trapped in a hunter's net, and the little mouse chewed through the ropes and set him free. The moral: little friends may prove great friends.",
  },
  {
    key: "crow",
    match: /crow|pitcher|thirsty/,
    topics: ["bird"],
    short: "A thirsty crow found a pitcher with a little water at the bottom. She dropped in stones, one by one, until the water rose. The moral: little by little does the trick.",
    long: "A thirsty crow found a pitcher with a little water at the bottom, too low for her beak to reach. So she dropped in stones, one by one, until the water rose high enough to drink. The moral: little by little does the trick.",
  },
];

/* ------------------------------------------------------------------------- */
/* Intents                                                                    */
/* ------------------------------------------------------------------------- */

const STOP = new Set(["this", "that", "it", "word", "words", "the", "a", "an", "story", "page", "me", "them", "again", "one", "here", "there", "please", "for", "to"]);

const SAFETY_FIRST_PERSON = /\b(i|i'm|im|i am|me|my|myself|mine)\b/;
const SAFETY_WORDS =
  /\b(hurt|hurts|hurting|hit me|hits me|hitting me|kick(ed|s)? me|scared|afraid|frightened|unsafe|not safe|sad|crying|cry|lonely|alone|bully|bullied|bleeding|bleed|sick|scary|nightmare|die|dying|kill|nobody loves|no one loves|hate myself|touched me)\b/;

/** True when a child's words suggest they are hurt, scared, unsafe or sad. */
export function isSafetyMessage(text: string): boolean {
  const t = text.toLowerCase().replace(/[’']/g, "'");
  if (!SAFETY_WORDS.test(t)) return false;
  if (/\b(hit|hurt|kick|touch)(s|ed|ing)? me\b|not safe|unsafe|nobody loves|no one loves|kill|die\b|dying|hate myself/.test(t)) return true;
  // "what does sad mean" or "the hen is sad" are about words and stories, not the child.
  if (/\bmean\b|\bspell\b|\bsay\b|\bread\b/.test(t)) return false;
  return SAFETY_FIRST_PERSON.test(t);
}

function extractSayWord(t: string): string | null {
  const pats = [
    /how (?:do|would|can|should|did) (?:you|i|we) (?:say|read|sound out|pronounce|spell)\s+(?:the word\s+)?["“']?([a-z']+)/,
    /what (?:does|do)\s+(?:the word\s+)?["“']?([a-z']+)["”']?\s+(?:say|sound like)\b/,
    /(?:can you |could you |please )?(?:say|read|sound out|help me (?:with|read|say)|spell)\s+(?:the word\s+)?["“']?([a-z']+)["”']?\s*(?:please|for me)?\s*\??$/,
    /i can'?t (?:read|say|sound out)\s+(?:the word\s+)?["“']?([a-z']+)/,
    /what(?:'s| is) (?:this|that|the) word[,:]?\s+["“']?([a-z']+)/,
    /what word is\s+["“']?([a-z']+)/,
    /^["“']?([a-z']+)["”']?\??$/,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m && m[1] && !STOP.has(m[1])) return m[1];
  }
  return null;
}

function extractMeaningWord(t: string): string | null {
  const pats = [
    /what (?:does|do|is|'s|s)\s+(?:the word\s+)?["“']?([a-z']+)["”']?\s+mean/,
    /meaning of\s+(?:the word\s+)?["“']?([a-z']+)/,
    /what(?:'s| is) (?:a |an |the )?["“']?([a-z']+)["”']?\s*\??$/,
    /(?:define|explain)\s+(?:the word\s+)?["“']?([a-z']+)/,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m && m[1] && !STOP.has(m[1])) return m[1];
  }
  return null;
}

type Intent =
  | "safety"
  | "personal"
  | "meaning"
  | "sayword"
  | "whatword"
  | "readstory"
  | "fable"
  | "today"
  | "who"
  | "praise"
  | "tired"
  | "hard"
  | "why"
  | "faith"
  | "thanks"
  | "bye"
  | "greet"
  | "offtopic"
  | "yes"
  | "no"
  | "other";

export function detectIntent(raw: string): { intent: Intent; word?: string } {
  const t = raw.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  if (!t) return { intent: "greet" };
  if (isSafetyMessage(t)) return { intent: "safety" };
  if (/\b(my (address|phone|password|last name|full name|school is|house is)|phone number|where i live|i live (at|on) )/.test(t)) return { intent: "personal" };

  if (/\bmean(s|ing)?\b|\bdefine\b|\bexplain\b/.test(t)) {
    const w = extractMeaningWord(t);
    if (w) return { intent: "meaning", word: w };
  }
  if (/\b(i did it|i read it|i finished|i'?m finished|i'?m done reading|done reading|i got it|i read the (story|page|whole)|did i do (it|good|well)|was that (right|good)|i can read)\b/.test(t)) return { intent: "praise" };
  if (/\b(read|tell) (me )?(the|our|this|today's) (story|passage|page)|read (it|that|this)( to me| for me| again| aloud| out loud)?\b|read to me|can you read|you read( it)?\b|read me the story|read the story/.test(t)) {
    if (!/\bhow\b/.test(t)) return { intent: "readstory" };
  }
  const say = /\b(say|sound|pronounce|spell|read)\b|what('s| is) (this|that|the) word|what word/.test(t) ? extractSayWord(t) : null;
  if (say) return { intent: "sayword", word: say };
  if (/what('s| is| does) (this|that|the) word|what does (this|that|it) say|what word is (this|that)|how do (you|i) (say|read) (this|that|it)\b/.test(t)) return { intent: "whatword" };
  if (/\b(tell|read|know) (me |us )?(a |another |one more |the |a new )?(story|fable|tale)|story time|once upon|\bfable\b|tortoise|grasshopper|red hen|cried wolf|lion and the mouse|crow and the pitcher/.test(t))
    return { intent: "fable" };
  if (/what (are|will|do) we (learning|learn|doing|do|reading|read|going to (learn|do|read))|what('s| is) (today'?s|the) lesson|what (is|are) (we|my) (lesson|learning)|what (is|are) today/.test(t)) return { intent: "today" };
  if (/who are you|what('s| is) your name|are you (real|a robot|a person|human|alive|a computer|a machine|a teacher)|what are you\b/.test(t)) return { intent: "who" };
  if (/\b(i did it|i read it|i finished|i'?m finished|i'?m done reading|done reading|i got it|i read the (story|page|whole)|did i do (it|good|well)|was that (right|good)|i can read)\b/.test(t)) return { intent: "praise" };
  if (/\b(tired|sleepy|need a break|take a break|can we stop|i want to stop|i'?m bored|my eyes hurt|i'?m hungry)\b/.test(t)) return { intent: "tired" };
  if (/\b(god|jesus|christ|lord|bible|scripture|pray|prayer|praying|church|heaven|angels?|psalms?|amen|creation|who made (the world|me|us|everything))\b/.test(t)) return { intent: "faith" };
  if (/\bwhy (do|should|must|have|would) (i|we|kids|children|people) (have to |need to |got to )?(read|learn)|why (is )?reading|what'?s the point|i don'?t (want|like) to read|reading is (boring|dumb|stupid|hard)|why do i need to read|why read/.test(t)) return { intent: "why" };
  if (/\b(i can'?t|i cannot|i can not|too hard|it'?s hard|this is hard|so hard|i don'?t know|dunno|i give up|i'?m stuck|help( me)?\b|difficult|i forgot|i don'?t get it|i'?m not good)/.test(t)) return { intent: "hard" };
  if (/\b(thank you|thanks|thank u|thankyou)\b/.test(t)) return { intent: "thanks" };
  if (/\b(bye|goodbye|good night|goodnight|see you|i have to go|gotta go|i'?m leaving|farewell)\b/.test(t)) return { intent: "bye" };
  if (/^(hi|hello|hey|hiya|howdy|greetings|good (morning|afternoon|evening|day))\b|^(mrs\.? )?wren\b|^hello mrs/.test(t)) return { intent: "greet" };
  if (/\b(video ?games?|minecraft|roblox|fortnite|youtube|tik ?tok|ipad|tablet|iphone|phone|tv|television|cartoons?|movies?|netflix|disney|pokemon|mario|barbie|lego|xbox|playstation|nintendo|app)\b/.test(t)) return { intent: "offtopic" };
  const w = extractMeaningWord(t);
  if (w && (GLOSSARY[w] || CLASSICAL_GLOSS[w])) return { intent: "meaning", word: w };
  if (/^(yes|yeah|yep|ok|okay|sure|ready|i'?m ready|let'?s go|let'?s read|go|start|begin|uh huh)\b/.test(t)) return { intent: "yes" };
  if (/^(no|nope|nah|not now|i don'?t want)\b/.test(t)) return { intent: "no" };
  return { intent: "other" };
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** Picks a variant that changes with each turn and never repeats the last reply. */
function choose(variants: string[], seed: number, last: string, vars: Record<string, string>): string {
  const filled = variants.map((v) => fill(v, vars).replace(/\s+/g, " ").trim());
  for (let k = 0; k < filled.length; k++) {
    const c = filled[(seed + k) % filled.length];
    if (c !== last) return c;
  }
  return filled[seed % filled.length];
}

function interestPhrase(interests: string[], seed: number): string | null {
  const list = interests.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return null;
  return list[seed % list.length];
}

/** Spoken description of what a rung teaches. */
export function spokenPattern(r: Rung): string {
  const g = r.graphemes;
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  switch (r.group) {
    case "vowels":
      return `the short ${r.short} sound, as in ${r.letterPages?.[0]?.keyword ?? r.short}`;
    case "consonants":
      return r.title.charAt(0).toLowerCase() + r.title.slice(1);
    case "doubles":
      return "double letters at the end of a word, like ll in bell and ck in duck";
    case "ending-blends":
      return `ending blends, like ${list(g.slice(0, 3))}`;
    case "onset-blends":
      return `${r.title.split(":")[0].toLowerCase()}, like ${list(g.slice(0, 3))}`;
    case "digraphs":
      return r.title.charAt(0).toLowerCase() + r.title.slice(1);
    case "silent-e": {
      const vs = g.map((x) => x[0]);
      return `silent e, which makes the ${list(vs)} say ${vs.length > 1 ? "their names" : "its name"}`;
    }
    case "vowel-teams":
      return `the vowel teams ${list(g)}`;
    case "r-controlled":
      return r.title.charAt(0).toLowerCase() + r.title.slice(1);
    case "endings":
      return "the endings ed and ing";
    case "syllables":
      return "words with two syllables, like rab, bit, rabbit";
    default:
      return r.title.toLowerCase();
  }
}

/**
 * A word sounded out the ladder way, ending on the whole word: "ha, a, at... hat". Speech plays it
 * from Mrs. Wren's own recording, so each vowel keeps its sound.
 */
function soundOut(word: string): string {
  return canStretch(word) ? `⟦${word}⟧` : `${partsFor(word).join(", ")}. ${cap1(word)}`;
}

/** A word to model for this rung: a pattern word from the story, else a practice word. */
function modelWord(rung: number, passage: { sentences: string[] } | undefined): string {
  const fresh = new Set(newWordsAt(rung));
  const tokens = (passage?.sentences ?? [])
    .join(" ")
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z']/g, ""))
    .filter((w) => w.length > 1 && !isIrregular(w));
  const pick = tokens.find((w) => fresh.has(w)) ?? tokens.find((w) => isAllowed(w, rung) && w.length > 2);
  if (pick) return pick;
  const r = RUNGS.find((x) => x.n === rung);
  return (r?.words[0] ?? r?.ladder?.right.find(Boolean) ?? "cat").toLowerCase();
}

function classicalFor(rung: number): { word: string; gloss: string } {
  const r = RUNGS.find((x) => x.n === rung);
  return r?.classicalWord ?? { word: "diligent", gloss: "you keep working, even when it is hard" };
}

/** "Diligent means you keep working, even when it is hard." */
function glossSentence(word: string, gloss: string): string {
  return `${cap1(word)} means ${gloss.replace(/\.$/, "")}.`;
}

function praiseLine(word: string): string {
  const part = CLASSICAL[word]?.part ?? "adj";
  if (part === "noun") return `That took ${word}.`;
  if (part === "verb") return `You chose to ${word}.`;
  return `That was ${word} reading.`;
}

/* ------------------------------------------------------------------------- */
/* Replies                                                                    */
/* ------------------------------------------------------------------------- */

export function scriptedReply(input: TutorRequest): string {
  try {
    return reply(normalizeTutorRequest(input));
  } catch {
    return "Let us read together. Put your finger under the first word.";
  }
}

function reply(req: TutorRequest): string {
  const { child } = req;
  const band: AgeBand = child.band;
  const name = child.name && child.name !== "friend" ? child.name : "my friend";
  const rung = getRung(req.rung);
  const passage = req.passage && req.passage.sentences.length ? req.passage : passageFor(req.rung);
  const tutorTurns = req.messages.filter((m) => m.role === "tutor");
  const lastTutor = tutorTurns[tutorTurns.length - 1]?.text ?? "";
  const history = tutorTurns.map((m) => m.text.toLowerCase()).join(" ");
  const lastChild = [...req.messages].reverse().find((m) => m.role === "child")?.text ?? "";
  const seed = tutorTurns.length + lastChild.length;
  const { intent, word } = detectIntent(lastChild);
  const classical = classicalFor(rung.n);
  const glossed = history.includes(classical.word.toLowerCase());
  const interest = interestPhrase(child.interests, tutorTurns.length);
  const title = passage?.title ?? "our story";
  const vars: Record<string, string> = { name, title, Name: name };
  const placement = req.context === "placement";
  const pick = (variants: string[]) => choose(variants, seed, lastTutor, vars);
  const fit = (text: string, max = 3) => capForBand(text, band, max);

  switch (intent) {
    case "safety":
      return fit(
        pick([
          "I am so sorry you feel that way, {name}. Please go and tell your mother or father, or another grown-up you trust, right now. They love you and they will help.",
          "Thank you for telling me, {name}. This is important, so please tell a parent or a grown-up you trust right away. They will want to help you.",
          "I care about you, {name}. Please find your parent or another grown-up you trust and tell them what you told me. You do not have to carry it alone.",
        ]),
      );

    case "personal":
      return fit(
        pick([
          "That is something to keep within your family, {name}, so we will leave it there. Let us go back to our reading.",
          "Let us keep that just for your family. Now, shall we read the next line?",
        ]),
      );

    case "meaning": {
      const w = (word ?? "").toLowerCase();
      if (CLASSICAL_GLOSS[w]) {
        const ex = CLASSICAL[w]?.example;
        return fit(`${glossSentence(w, CLASSICAL_GLOSS[w])} ${ex ?? ""}`.trim());
      }
      if (GLOSSARY[w]) return fit(GLOSSARY[w]);
      if (passage?.sentences.join(" ").toLowerCase().includes(w)) {
        return fit(
          pick([
            `That is a good word to wonder about. Read the sentence with ${w} again, and think about what would make sense.`,
            `Let us find out from the story. Look at the words around ${w}, and tell me what you think it means.`,
          ]),
        );
      }
      return fit(
        pick([
          "That is a fine question for your grown-up. Ask them tonight, and you will know a new word.",
          "What a good word to wonder about. Let us ask a grown-up later, and for now, back to our story.",
        ]),
      );
    }

    case "sayword": {
      const w = (word ?? "").toLowerCase();
      if (placement) {
        return fit(
          pick([
            "This part is for you to try on your own, {name}. Say what you can, and if a word is tricky, it is fine to skip it.",
            "Give it your best try. If it is tricky, skip it, and we will learn it together later.",
          ]),
        );
      }
      if (isIrregular(w) || partsFor(w).length <= 1) {
        return fit(
          pick([
            `That one is a heart word, so we learn it by sight. It says ${w}. Now you say it.`,
            `${cap1(w)} is a word we know by heart, not by its sounds. It says ${w}. Say it with me.`,
          ]),
        );
      }
      if (!isAllowed(w, rung.n)) {
        return fit(
          pick([
            `That word says ${w}. It has sounds we will learn on a higher rung, so for now, just listen: ${w}.`,
            `It says ${w}. We will learn all of its sounds a little later, and then you will read it yourself.`,
          ]),
        );
      }
      const parts = soundOut(w);
      return fit(
        pick([
          `Let us sound it out together. ${parts}. Now you say it.`,
          `Here are its sounds: ${parts}. Put them together, and it says ${w}. Your turn.`,
          `Listen closely, {name}: ${parts}. Say it with me.`,
        ]),
      );
    }

    case "whatword": {
      if (placement) return fit("This part is for you to try on your own. Say what you can, and skip any word that is too tricky.");
      const m = modelWord(rung.n, passage);
      return fit(
        pick([
          `Tap the word, and I will say each sound with you. Here is one from our story: ${soundOut(m)}.`,
          "Put your finger under the word and tap it. Then we will sound it out together, one sound at a time.",
        ]),
      );
    }

    case "readstory": {
      if (placement) return fit("In this part, you read to me, {name}. Do your best, and skip any word you do not know.");
      if (!passage) return fit("Let us open today's story first, and then I will read it with you.");
      const intro = pick([`Here is our story, ${title}.`, `Listen closely. ${title}.`, `I will read it, and you follow along. ${title}.`]);
      const outro = pick(["Now you read it to me, and I will listen.", "Now it is your turn to read it to me.", "Your turn now. Point to each word as you read."]);
      return `${intro} ${passage.sentences.join(" ")} ${outro}`.replace(/\s+/g, " ").trim();
    }

    case "fable": {
      const t = lastChild.toLowerCase();
      const told = FABLES.filter((f) => history.includes(f.short.slice(0, 24).toLowerCase()) || history.includes(f.long.slice(0, 24).toLowerCase()));
      let f = FABLES.find((x) => x.match.test(t) && !/another|one more|new|different/.test(t));
      if (!f) {
        const topicKeys = child.interests.map((s) => s.toLowerCase());
        const byInterest = FABLES.filter((x) => !told.includes(x) && x.topics.some((k) => topicKeys.some((i) => i.includes(k))));
        const rest = FABLES.filter((x) => !told.includes(x));
        f = byInterest[0] ?? rest[seed % Math.max(1, rest.length)] ?? FABLES[seed % FABLES.length];
      }
      const text = band === "A" ? f.short : f.long;
      return band === "C" ? `Here is an old fable. ${text}` : text;
    }

    case "today": {
      const what = spokenPattern(rung);
      return fit(
        pick([
          `Today we are learning ${what}. Our story is called ${title}.`,
          `We are on rung ${rung.n}, {name}, learning ${what}. Then we will read ${title} together.`,
          `Today's sounds are ${what}. When we know them, we will read ${title}.`,
        ]),
      );
    }

    case "who":
      return fit(
        pick([
          "I am Mrs. Wren, your reading teacher. I am not a real person, but I love reading with you, {name}.",
          "My name is Mrs. Wren, like the little brown songbird. I am a reading helper, not a person, and I am here to help you read.",
          "I am Mrs. Wren. I am not a real person, but I will listen to you read and help with every sound.",
        ]),
      );

    case "praise": {
      const lines = glossed
        ? [
            `Well done, {name}! ${praiseLine(classical.word)}`,
            "That was careful work. You looked at every letter, and it showed.",
            "Splendid! Your reading is growing stronger every day.",
          ]
        : [
            `Well done, {name}! ${praiseLine(classical.word)} ${glossSentence(classical.word, classical.gloss)}`,
            `You did it! ${praiseLine(classical.word)} ${glossSentence(classical.word, classical.gloss)}`,
          ];
      if (child.faithTrack) lines.push("Well done, good and faithful reader. Your careful work makes me glad.");
      return fit(pick(lines));
    }

    case "tired":
      return fit(
        pick([
          "You have worked hard today, {name}. Let us read one last line together, and then you may rest.",
          "Rest is good for readers too. Take a deep breath, and we will finish with one easy word.",
          "Thank you for telling me. We can stop after this page, and you can tell your grown-up you did careful work.",
        ]),
      );

    case "hard": {
      if (placement) {
        return fit(
          pick([
            "That is all right, {name}. Skip that one, and we will try the next.",
            "No trouble at all. Some words are for later. Let us go on to the next one.",
          ]),
        );
      }
      const m = word && !STOP.has(word) ? word : modelWord(rung.n, passage);
      const parts = soundOut(m);
      const variants = [
        `That is all right, {name}. Hard words grow easy one sound at a time. Listen: ${parts}. Now you try.`,
        `You can do hard things, a little at a time. My turn: ${m}. Your turn: say ${m}. We will come back to it.`,
        `Let us do it together. ${parts}. Say it with me, and we will try it again in a moment.`,
      ];
      if (child.faithTrack) variants.push(`Be strong and of good courage, {name}. Listen: ${parts}. Now you say it.`);
      return fit(pick(variants));
    }

    case "why": {
      const variants = interest
        ? [
            `Because there are wonderful books about ${interest}, {name}. When you can read, you can learn all about them yourself.`,
            `One day you will read a whole book about ${interest}, all by yourself. Every sound we learn today brings that day closer.`,
            `Reading lets you find out anything you wonder about, like ${interest}. Each word you learn opens another page.`,
          ]
        : [
            "Reading opens every book in the world to you, {name}. The more sounds you know, the more stories you can enjoy.",
            "When you can read, you never run out of stories. You can learn anything you wonder about.",
          ];
      if (child.faithTrack) variants.push(`Reading lets you read Scripture for yourself one day${interest ? `, and books about ${interest} too` : ""}.`);
      if (child.modernComparisons) variants.push("Grown-ups read all day long, from recipes to road signs to letters from friends. Reading helps with everything.");
      return fit(pick(variants));
    }

    case "faith": {
      if (!child.faithTrack) {
        return fit(
          pick([
            "That is a wonderful question to ask your family, {name}. Now, shall we read on?",
            "What a big question. Ask your mother or father about it tonight. For now, let us read our story.",
          ]),
        );
      }
      return fit(
        pick([
          "God gave us words, {name}. The Bible says, In the beginning was the Word. One day you will read it for yourself.",
          "The Bible is a book many families read together. Every sound you learn brings you closer to reading it yourself.",
          "That is a beautiful question. Ask your family to read a psalm with you tonight. For now, let us read our story.",
          "God made the birds, the sea and every good thing, {name}. Reading helps us learn about all of them.",
        ]),
      );
    }

    case "thanks":
      return fit(
        pick([
          "You are most welcome, {name}. It is a joy to read with you.",
          "You are welcome. Thank you for your careful work today.",
          "It is my pleasure, {name}. Shall we read a little more?",
        ]),
      );

    case "bye": {
      const variants = [
        `Goodbye, {name}. You did careful work today, and I will be here when you want to read again.`,
        glossed
          ? `Well done today, {name}. You were ${CLASSICAL[classical.word]?.part === "adj" ? classical.word : "diligent"}. Goodbye for now.`
          : `Goodbye, {name}. ${praiseLine(classical.word)} ${glossSentence(classical.word, classical.gloss)}`,
        "Farewell for now. Rest well, and we will climb another rung soon.",
      ];
      if (child.faithTrack) variants.push("Goodbye, {name}. God bless you, and we will read again soon.");
      return fit(pick(variants));
    }

    case "greet": {
      const variants =
        tutorTurns.length === 0
          ? [
              `Hello, {name}! I am so glad you are here. Our story today is ${title}, so shall we begin?`,
              `Good day, {name}. I am Mrs. Wren, and I have a story ready for you called ${title}.`,
              `Hello, {name}. Let us warm up with a few words, and then we will read ${title}.`,
            ]
          : [
              "Hello again, {name}. Shall we keep reading?",
              "There you are, {name}. Let us pick up where we left off.",
              "Hello, {name}. I am right here. Put your finger under the next word.",
            ];
      return fit(pick(variants));
    }

    case "offtopic":
      return fit(
        pick([
          "Let us leave that for another time, {name}. Right now, our story is waiting.",
          "That can wait for later. For now, let us keep our minds on our words.",
        ]),
      );

    case "yes":
      return fit(
        pick([
          "Wonderful. Put your finger under the first word, and read it to me.",
          "Good. Start with the first word, and take your time.",
          "Splendid, {name}. Read the first line to me, and I will listen.",
        ]),
      );

    case "no":
      return fit(
        pick([
          "That is all right. Let us try just one word together, and then you can decide.",
          "We can go slowly, {name}. How about one line, and then a rest?",
        ]),
      );

    default:
      return fit(
        pick([
          "That is a lovely thought, {name}. Now let us get back to our reading. Shall we start with the first word?",
          "I like how you think. Let us turn back to our story now.",
          `Let us keep our minds on our words for now. Would you like to read ${title}, or shall I read it first?`,
          "What a thing to wonder about. When you can read, books will tell you all about it. Let us read on.",
        ]),
      );
  }
}
