/**
 * The curated word list. Common, child-appropriate words, hand-tagged where the
 * decoder needs help. A word must be in this list (or be an inflection of a word in
 * it: -s, -es, 's, -ed, -ing) before the validator lets it reach a child.
 *
 * Notation inside the lists:
 *   word*      irregular: does not sound the way it is spelled (sight words, son, cold)
 *   word@c     ow as in cow (taught at rung 37)
 *   word@s     ow as in snow (taught at rung 32)
 *   word^      hard g before e or i (get, gift, girl)
 *   syl|lable  two-syllable word with its split; only needed where the split is not
 *              obvious (lem|on) or for compounds (cup|cake)
 */

export interface LexEntry {
  word: string;
  irregular?: boolean;
  ow?: "cow" | "snow";
  hardG?: boolean;
  /** Syllable split for two-syllable words, e.g. ["lem", "on"]. */
  syl?: [string, string];
  name?: boolean;
}

const WORDS = `
am an as at bad bag ban bat cab can cap cat dad fan fat gap gas had ham has hat jab jam lap mad man map
mat nap pad pal pan pat rag ram ran rap rat sad sap sat tag tan tap van vat wag wax yam yap zap
bed beg bet den fed get^ hem hen jet keg led leg let men met net peg pen pet red set ten vet web wed wet
yes yet
bid big bin bit did dig dim dip fig fin fit fix hid him hip his hit if in is it its jig kid kit lid lip mix
nip pig pin pit quit quiz rib rid rip sip sit six tin tip wig win wit yip zip
bog box cod cot dog dot fog fox got hop hot job jog jot log lot mom mop nod not on ox pop pot rob rod rot
top tot
bud bug bun bus but cub cup cut dug fun gum hug hum hut jug mud mug nut pup rub rug run sum sun tub tug up
us yum

add odd egg bell sell tell well yell fell bill hill fill will mill doll gull hull kiss miss boss moss toss
fuss mess less pass puff off buzz fizz back pack sack jack deck neck peck kick pick sick dock lock rock sock
duck luck quack quick all ball call fall hall tall wall

ant and band bend camp damp dent end fond hand hint hunt jump lamp land limp mend pond pump ramp sand send
tent tint went wind bump dump lump hump mint bent sent
ask mask task desk disk best nest rest test vest west fast last past mast list mist must dust bust just lost
cost gift^ lift left raft soft belt felt melt quilt milk silk help self elf held kept next

black blot bled blip blunt block bless clap class cliff clip clock club clump cluck flag flap flat fled flip
flock glad glass plan plant plum slap sled slid slip slept
brick crab crack crib crop cross drip drop drum dress frog from grab grass grin press trap trek trick trip
trot truck trust track
skin skip skill smell snack snap sniff snip snug spin spot spell spill spun stack stamp stand step stem stick
stiff still stop stuck swam swim swing twin twig split strap strip scrub squid small stall span

ship shop shed shell shelf shut shot shack shall fish dish wish rush brush crash splash dash mash mesh hush
fresh
chin chip chop chap check chess chest chick chum much such rich lunch bench inch branch catch match patch
pitch fetch
that then them than this thin thick thud thrush bath math path moth with when whip whisk which
bang sang hang rang king ring sing wing thing sting bring spring string long song strong rung bank tank thank
sank pink sink think wink drink ink junk skunk trunk

ate bake cake lake make take wake shake snake game came name same cane mane plane cape tape grape shape gate
late plate hate made shade safe gave cave wave save brave tale whale
bike like kite white time dime line pine fine mine nine shine ride hide side wide slide five hive smile while
ripe wise prize fire
home hope rope note bone stone joke smoke woke broke hole those nose rose close stove globe rode store shore
more cube cute mule tube tune rule flute use these

see bee tree free three feet meet sweet green queen sheep sleep deep keep seed feed need weed week cheek wheel
feel cheese geese^ breeze deer teeth beet
sea tea pea eat heat meat treat wheat beak read team dream cream steam bean clean teach peach leaf seal please
east ear hear near dear year
rain train main paint plain wait mail nail pail sail snail tail trail rail paid air hair chair
day play say way may bay hay pay ray stay tray gray clay pray jay
boat coat goat float oat road toad soap oak cloak coal foal toast coast oar
snow@s grow@s slow@s show@s low@s row@s bowl@s crow@s blow@s glow@s throw@s own@s

car far jar star arm farm harm barn art cart part start dart park dark bark mark sharp harp card hard yard
or for fork corn horn born sort short fort port sport storm north porch torch cord horse
her fern herd bird girl^ first third shirt dirt stir chirp fur burn turn hurt curl church

moon soon noon spoon food room broom tool pool cool boot root shoot hoop scoop roof goose tooth zoo too moo
book look cook took hook brook good hood wood stood foot wool hoof bloom
out shout loud cloud proud round found sound pound ground count house mouse mouth south our flour
cow@c how@c now@c owl@c growl@c town@c down@c brown@c crown@c clown@c frown@c crowd@c bow
oil boil soil coin join point noise boy toy joy

jumped landed hopped planted rested asked played singing sitting running baking shining hoping fishing
rabbit napkin sunset basket muffin pumpkin picnic kitten mitten garden problem insect pitcher button ticket
pocket jacket bucket chicken kitchen blanket helmet trumpet lantern winter sister after under number summer
dinner supper letter better butter ladder farmer market corner thunder until popcorn bathtub lesson happen
sandwich gallop harvest compass cricket armor children
lem|on rob|in wag|on cab|in sev|en nev|er riv|er vis|it plan|et com|et drag|on fin|ish for|est up|on in|side
out|side sun|shine bed|time cup|cake pan|cake rain|bow sail|boat sea|shell bee|hive snow|man en|joy

said* of* you* your* put* pull* push* full* come* some* have* give* live* love* one* could* would* should*
been* says* heard* word* work* done*
son* won* front* mother* father* brother* other* nothing* kind* find* mind* wild* child* most* both* roll*
sure* four* pour* hour* bear* pear* wear* great* break* head* bread* dead* soup* touch* bull* bush* wolf*
move* gone* none* talk* salt* worm* world*
`;

/** Decodable first names a passage may use (the child's own name is always allowed). */
const NAMES = `
Pat Sam Nan Ben Ned Meg Kim Ken Peg Len Jim Jen Rob Ron Tom Tim Max Liz Jack Bess Glen Brad Stan Josh Pam
Mitch Seth Hank Jane Dave Mike Kate June Pete Dean Ray Gail Joan Carl Norm Fern Roy Dan Ted Tess Nell Jill
Fred Beth Matt Nat Rex Gus Lee Jake Luke Cole Jean Neal Kay Mark Kurt Rose
`;

function parseEntry(token: string, name = false): LexEntry {
  let t = token.trim();
  const e: LexEntry = { word: "" };
  if (t.endsWith("*")) {
    e.irregular = true;
    t = t.slice(0, -1);
  }
  if (t.endsWith("^")) {
    e.hardG = true;
    t = t.slice(0, -1);
  }
  const ow = t.match(/@([cs])$/);
  if (ow) {
    e.ow = ow[1] === "c" ? "cow" : "snow";
    t = t.slice(0, -2);
  }
  if (t.includes("|")) {
    const [a, b] = t.split("|");
    e.syl = [a.toLowerCase(), b.toLowerCase()];
    t = a + b;
  }
  e.word = t.toLowerCase();
  if (name) e.name = true;
  return e;
}

const ENTRIES: LexEntry[] = [];
const BY_WORD = new Map<string, LexEntry>();
const NAME_SET = new Map<string, string>(); // lowercase -> display

for (const tok of WORDS.split(/\s+/).filter(Boolean)) {
  const e = parseEntry(tok);
  if (!BY_WORD.has(e.word)) {
    BY_WORD.set(e.word, e);
    ENTRIES.push(e);
  }
}
for (const tok of NAMES.split(/\s+/).filter(Boolean)) {
  const e = parseEntry(tok, true);
  NAME_SET.set(e.word, tok.trim());
}

/** Every common word in the list (names excluded), in curation order. */
export const LEXICON: readonly LexEntry[] = ENTRIES;

/** Names a generated passage may use, as displayed ("Ned"). */
export const LEXICON_NAMES: readonly string[] = [...NAME_SET.values()];

/** The entry for a word (case-insensitive), if it is in the list. Names are not entries. */
export function lexEntry(word: string): LexEntry | undefined {
  return BY_WORD.get(word.toLowerCase());
}

/** True for a word or a name in the list (exact form, case-insensitive). */
export function inLexicon(word: string): boolean {
  const w = word.toLowerCase();
  return BY_WORD.has(w) || NAME_SET.has(w);
}

export function isLexiconName(word: string): boolean {
  return NAME_SET.has(word.toLowerCase());
}

export function isIrregular(word: string): boolean {
  return BY_WORD.get(word.toLowerCase())?.irregular === true;
}

/**
 * Words that suit a child's interest. Used to steer generated passages toward the
 * topic; the bank still decides what is allowed.
 */
export const TOPIC_WORDS: Record<string, string[]> = {
  horse: ["horse", "trot", "mane", "tail", "hay", "barn", "farm", "foal", "oat", "ride", "stall", "hoof", "gallop", "path", "hill"],
  baking: ["bake", "cake", "bun", "jam", "milk", "egg", "flour", "dish", "pan", "muffin", "cupcake", "pancake", "sweet", "treat", "mix", "whisk", "cook", "plate", "cream", "butter"],
  bird: ["bird", "nest", "egg", "wing", "sing", "song", "tree", "crow", "hen", "duck", "owl", "jay", "robin", "chick", "peck", "beak", "twig", "branch", "seed", "thrush", "gull"],
  ship: ["ship", "sail", "boat", "sea", "mast", "deck", "raft", "float", "wave", "wind", "map", "dock", "rope", "oar", "sand", "shell", "fish", "coast", "port", "storm", "hull"],
  map: ["map", "path", "road", "hill", "river", "pond", "north", "south", "east", "west", "land", "trail", "mark", "star", "compass", "globe"],
  knight: ["king", "queen", "brave", "quest", "helmet", "armor", "dragon", "flag", "tent", "hill", "fort", "horse", "trumpet"],
  train: ["train", "track", "rail", "steam", "smoke", "car", "trip", "ticket", "stop", "coal", "bell", "wheel", "chug"],
  farm: ["farm", "cow", "pig", "hen", "duck", "goat", "sheep", "horse", "chick", "barn", "hay", "mud", "pen", "dog", "cat"],
  garden: ["garden", "seed", "plant", "dig", "rose", "bud", "stem", "root", "weed", "soil", "rain", "sun", "grow", "bloom", "pot", "mint", "bee", "corn", "grass", "tree", "leaf", "radish"],
  music: ["song", "sing", "drum", "bell", "horn", "harp", "note", "tune", "band", "clap", "hum", "trumpet", "play"],
  insect: ["bug", "ant", "bee", "moth", "web", "insect", "cricket", "wing", "hive", "sting", "buzz"],
  star: ["star", "moon", "dark", "shine", "far", "sun", "comet", "planet", "glow", "dim"],
  animal: ["cat", "dog", "pig", "hen", "fox", "duck", "goat", "sheep", "cow", "frog", "rabbit", "owl", "bird"],
};

/** The topic key for a free-text interest ("Horse riding" -> "horse"), if any. */
export function topicFor(interest: string): string | undefined {
  const s = interest.toLowerCase();
  if (/bak|cook|kitchen/.test(s)) return "baking";
  if (/farm|cow|pig|sheep|goat/.test(s)) return "farm";
  if (/horse|pony/.test(s)) return "horse";
  if (/bird|owl|duck|hen/.test(s)) return "bird";
  if (/ship|boat|sail|sea|ocean/.test(s)) return "ship";
  if (/map|explor|travel/.test(s)) return "map";
  if (/knight|castle|king|queen/.test(s)) return "knight";
  if (/train|rail/.test(s)) return "train";
  if (/garden|flower|plant/.test(s)) return "garden";
  if (/music|song|sing|piano|drum/.test(s)) return "music";
  if (/insect|bug|bee|ant|beetle|butterfl/.test(s)) return "insect";
  if (/star|space|moon|planet|sky/.test(s)) return "star";
  if (/animal|pet|dog|cat/.test(s)) return "animal";
  return undefined;
}
