// Sector 1, the Noun Nebula: kinds of words.
//
// The three big lists are used together. A "zap the nouns" wave takes its
// targets from NOUNS and its decoys from VERBS and ADJECTIVES, and so on.
// Every word here has to be clearly ONE kind of word for an eight-year-old:
// no "play", "paint" or "fish", which are a thing and an action at once, and
// no colors, which are nouns as often as they are adjectives.

export const NOUNS = {
  person: ['pilot', 'teacher', 'doctor', 'farmer', 'sister', 'brother', 'baby', 'king', 'queen', 'captain', 'astronaut', 'uncle', 'artist', 'dentist', 'child', 'wizard', 'pirate', 'friend'],
  place: ['school', 'kitchen', 'meadow', 'city', 'beach', 'forest', 'valley', 'island', 'castle', 'library', 'bedroom', 'zoo', 'mountain', 'river', 'ocean', 'cave', 'village', 'museum', 'airport', 'jungle'],
  animal: ['tiger', 'rabbit', 'turtle', 'kitten', 'puppy', 'monkey', 'spider', 'dragon', 'eagle', 'dolphin', 'penguin', 'giraffe', 'zebra', 'lizard', 'otter', 'parrot', 'pony', 'owl', 'shark', 'whale'],
  thing: ['rocket', 'pencil', 'backpack', 'blanket', 'pillow', 'window', 'spoon', 'sandwich', 'apple', 'cookie', 'bicycle', 'helmet', 'guitar', 'jacket', 'candle', 'ladder', 'basket', 'robot', 'comet', 'telescope', 'engine', 'crystal', 'compass', 'lantern', 'umbrella', 'pumpkin', 'feather', 'carrot'],
};

export const VERBS = [
  'eat', 'sing', 'write', 'read', 'listen', 'carry', 'bring', 'grab', 'sit', 'build', 'dig', 'chew', 'pour', 'stir', 'bake', 'learn',
  'teach', 'think', 'forget', 'remember', 'begin', 'grow', 'arrive', 'enter', 'follow', 'lose', 'choose', 'send', 'keep', 'give', 'take', 'speak',
  'tell', 'ask', 'explore', 'discover', 'invent', 'collect', 'protect', 'wander', 'soar', 'gather', 'enjoy', 'borrow', 'become', 'decide', 'explain', 'imagine',
  'pretend', 'scrub', 'agree', 'gobble', 'belong', 'kneel', 'obey', 'buy', 'wear', 'mend',
];

export const ADJECTIVES = [
  'tiny', 'huge', 'shiny', 'fluffy', 'brave', 'sleepy', 'hungry', 'noisy', 'soft', 'bumpy', 'slimy', 'spooky', 'gentle', 'clever', 'silly', 'grumpy',
  'cheerful', 'tall', 'sharp', 'sticky', 'crunchy', 'icy', 'chilly', 'dusty', 'rusty', 'lazy', 'proud', 'shy', 'friendly', 'curly', 'heavy', 'wooden',
  'golden', 'ancient', 'enormous', 'delicious', 'dangerous', 'curious', 'nervous', 'famous', 'beautiful', 'careful', 'powerful', 'fearless', 'fuzzy', 'cozy', 'muddy', 'stormy',
  'funny', 'lucky', 'lonely', 'silent', 'strong', 'narrow', 'steep', 'juicy', 'fierce', 'polite', 'honest', 'gloomy',
];

// Sentences with exactly one verb and one adjective, and one or two nouns.
// Only "the", "a" and "an" are used as little words, so nothing else in the
// sentence could be argued to be an adjective. n = nouns, v = verb, a = adjective.
export const SPOT = [
  { s: 'The brave pilot fixed the engine.', n: 'pilot engine', v: 'fixed', a: 'brave' },
  { s: 'A tiny robot carried the map.', n: 'robot map', v: 'carried', a: 'tiny' },
  { s: 'The hungry tiger chased a rabbit.', n: 'tiger rabbit', v: 'chased', a: 'hungry' },
  { s: 'The shiny comet crossed the sky.', n: 'comet sky', v: 'crossed', a: 'shiny' },
  { s: 'A sleepy owl sat on the branch.', n: 'owl branch', v: 'sat', a: 'sleepy' },
  { s: 'The clever fox found a tunnel.', n: 'fox tunnel', v: 'found', a: 'clever' },
  { s: 'A huge wave hit the ship.', n: 'wave ship', v: 'hit', a: 'huge' },
  { s: 'The noisy rocket shook the ground.', n: 'rocket ground', v: 'shook', a: 'noisy' },
  { s: 'A friendly alien waved at the crew.', n: 'alien crew', v: 'waved', a: 'friendly' },
  { s: 'The old wizard opened the gate.', n: 'wizard gate', v: 'opened', a: 'old' },
  { s: 'A fluffy kitten chased the ball.', n: 'kitten ball', v: 'chased', a: 'fluffy' },
  { s: 'The captain grabbed the heavy bag.', n: 'captain bag', v: 'grabbed', a: 'heavy' },
  { s: 'The crew ate a delicious dinner.', n: 'crew dinner', v: 'ate', a: 'delicious' },
  { s: 'The girl wore a purple helmet.', n: 'girl helmet', v: 'wore', a: 'purple' },
  { s: 'A cold wind rattled the windows.', n: 'wind windows', v: 'rattled', a: 'cold' },
  { s: 'The farmer planted yellow corn.', n: 'farmer corn', v: 'planted', a: 'yellow' },
  { s: 'The red laser melted the rock.', n: 'laser rock', v: 'melted', a: 'red' },
  { s: 'The brave knight climbed the tower.', n: 'knight tower', v: 'climbed', a: 'brave' },
  { s: 'A curious monkey opened the box.', n: 'monkey box', v: 'opened', a: 'curious' },
  { s: 'The tired astronaut closed the hatch.', n: 'astronaut hatch', v: 'closed', a: 'tired' },
  { s: 'The baby dropped a sticky spoon.', n: 'baby spoon', v: 'dropped', a: 'sticky' },
  { s: 'A bright star guided the sailors.', n: 'star sailors', v: 'guided', a: 'bright' },
  { s: 'The teacher read a funny story.', n: 'teacher story', v: 'read', a: 'funny' },
  { s: 'The loud alarm woke the pilot.', n: 'alarm pilot', v: 'woke', a: 'loud' },
  { s: 'A strong robot lifted the crate.', n: 'robot crate', v: 'lifted', a: 'strong' },
  { s: 'The doctor helped the sick puppy.', n: 'doctor puppy', v: 'helped', a: 'sick' },
  { s: 'The gentle giant carried the children.', n: 'giant children', v: 'carried', a: 'gentle' },
  { s: 'The pilot landed on a rocky moon.', n: 'pilot moon', v: 'landed', a: 'rocky' },
  { s: 'A long tunnel led to the cave.', n: 'tunnel cave', v: 'led', a: 'long' },
  { s: 'The dragon guarded a golden egg.', n: 'dragon egg', v: 'guarded', a: 'golden' },
  { s: 'The little alien hugged the robot.', n: 'alien robot', v: 'hugged', a: 'little' },
  { s: 'A slimy squid grabbed the anchor.', n: 'squid anchor', v: 'grabbed', a: 'slimy' },
];

// Pronouns. The words in [brackets] glow, and the question is which one word
// can stand in for them. People are named or shown so that he / she is clear.
// Rows are: sentence, answer, wrong, wrong.
export const PRONOUNS = {
  1: [
    ['[The boy] found a map.', 'He', 'She', 'They'],
    ['[My grandma] baked bread.', 'She', 'He', 'It'],
    ['[The rocket] is fast.', 'It', 'He', 'They'],
    ['[The pilots] are ready.', 'They', 'He', 'It'],
    ['[The queen] smiled.', 'She', 'He', 'They'],
    ['[The king] laughed.', 'He', 'She', 'It'],
    ['[The stars] are bright.', 'They', 'It', 'She'],
    ['[My brother] is tall.', 'He', 'She', 'They'],
    ['[The cookie] is warm.', 'It', 'They', 'She'],
    ['[The engine] is loud.', 'It', 'He', 'They'],
    ['[My sister] can sing.', 'She', 'He', 'It'],
    ['[The robots] beeped.', 'They', 'It', 'He'],
  ],
  2: [
    ['[Zed and I] flew home.', 'We', 'They', 'He'],
    ['[Ana and I] like space.', 'We', 'She', 'They'],
    ['[Mom and Dad] cheered.', 'They', 'We', 'He'],
    ['[You and I] make a good team.', 'We', 'They', 'He'],
    ['[The girl and her dad] waved.', 'They', 'She', 'He'],
    ['[The map and the compass] are lost.', 'They', 'It', 'We'],
  ],
  3: [
    ['Blip helped [the pilots].', 'them', 'they', 'it'],
    ['I saw [the comet].', 'it', 'them', 'he'],
    ['Give the map to [Ana and me].', 'us', 'we', 'them'],
    ['We called [the king].', 'him', 'he', 'her'],
    ['I thanked [my sister].', 'her', 'she', 'him'],
    ['Blip waved at [Zed and me].', 'us', 'we', 'them'],
    ['The crew cheered for [the queen].', 'her', 'she', 'them'],
    ['Please fix [the engines].', 'them', 'it', 'they'],
  ],
};
