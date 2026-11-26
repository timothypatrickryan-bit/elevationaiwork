// Sector 5, Sentence Station: how sentences are built and marked.
//
// Rows are: the prompt, the right answer, then the wrong answers, unless a
// list says otherwise. The number in front of each group is its level.

// Whole thoughts. Each row is a complete sentence followed by two pieces that
// are not. A piece that starts with a verb always uses a form that cannot be
// read as an order ("Landed on the moon.", never "Land on the moon.").
export const COMPLETE = [
  ['The rocket landed.', 'The shiny rocket.', 'Landed on the moon.'],
  ['A comet zoomed by.', 'A bright comet.', 'Zoomed by fast.'],
  ['The crew ate lunch.', 'The hungry crew.', 'Ate lunch at noon.'],
  ['Stars twinkle at night.', 'The stars at night.', 'Twinkled all night.'],
  ['My dog barks loudly.', 'My noisy dog.', 'Barks loudly at cats.'],
  ['The robot fixed the door.', 'The helpful robot.', 'Fixed the door.'],
  ['We saw a blue planet.', 'A big blue planet.', 'Spotted a blue planet.'],
  ['The pilot waved.', 'The pilot and the crew.', 'Waved at the crowd.'],
  ['Aliens like pizza.', 'Aliens from Mars.', 'Likes pizza a lot.'],
  ['The engine roared.', 'The loud engine.', 'Roared like a lion.'],
  ['Blip sings funny songs.', 'Blip the robot.', 'Sings funny songs.'],
  ['The door opened slowly.', 'The heavy metal door.', 'Opened very slowly.'],
  ['She found the map.', 'The old torn map.', 'Found the map.'],
  ['The moon is bright.', 'The bright full moon.', 'Is very bright.'],
  ['Our ship needs fuel.', 'Our fast new ship.', 'Needs more fuel.'],
  ['He packed his bag.', 'His big green bag.', 'Packed his bag.'],
  ['The alarm rang twice.', 'The loud red alarm.', 'Rang two times.'],
  ['Two moons rose.', 'Two little moons.', 'Rose in the sky.'],
  ['The captain smiled.', 'The brave captain.', 'Smiled at us.'],
  ['Birds fly south.', 'Birds in the fall.', 'Flew south for winter.'],
  ['I love my helmet.', 'My shiny helmet.', 'Loves that helmet.'],
  ['The stars are far away.', 'The stars far away.', 'Are very far away.'],
  ['A storm shook the ship.', 'A terrible storm.', 'Shook the ship hard.'],
  ['The kids built a fort.', 'The kids next door.', 'Built a huge fort.'],
];

// End marks. Each sentence is shown without its last mark and sorted into
// period, question mark or exclamation point. Every exclamation here starts
// with a shout word or is a warning, so it cannot pass for a calm statement.
export const ENDMARKS = {
  '.': [
    'The moon has no air', 'Our ship has two engines', 'Saturn has rings', 'My helmet is in the locker', 'We eat lunch at noon', 'The crew is asleep',
    'Mars is called the red planet', 'A year has twelve months', 'The map is on the table', 'Blip is a small robot', 'I packed my bag last night', 'The sun is a star',
  ],
  '?': [
    'Where is my helmet', 'Can you see the comet', 'What time do we launch', 'Who fixed the engine', 'Are we there yet', 'How far is the moon',
    'Did you pack the map', 'Why is the alarm ringing', 'Is that a real alien', 'When does the show start', 'May I fly the ship', 'Which planet is the biggest',
  ],
  '!': [
    'Wow, that comet is huge', 'Watch out for that rock', 'Hooray, we won', 'Oh no, the engine is on fire', 'Yikes, a giant space slug', 'Help, I am stuck',
    'Look out below', 'Hurry, the ship is leaving', 'Ouch, that hurt', 'Three, two, one, blast off', 'Quick, grab my hand', 'Yay, we made it home',
  ],
};

// Capital letters. The sentence is shown in small letters; "up" lists the
// words that need a capital, written the right way.
export const CAPITALS = {
  1: [
    { s: 'we landed on mars.', up: 'We Mars' },
    { s: 'blip and i saw saturn.', up: 'Blip I Saturn' },
    { s: 'the launch is in july.', up: 'The July' },
    { s: 'my dog rex loves friday.', up: 'My Rex Friday' },
    { s: 'i think venus is hot.', up: 'I Venus' },
    { s: 'sam and i love pizza.', up: 'Sam I' },
    { s: 'did ben see the eclipse?', up: 'Did Ben' },
    { s: 'on sunday we fly to neptune.', up: 'On Sunday Neptune' },
    { s: 'can mia come on saturday?', up: 'Can Mia Saturday' },
  ],
  2: [
    { s: 'my friend ana lives in texas.', up: 'My Ana Texas' },
    { s: 'on monday i fly to mars.', up: 'On Monday I Mars' },
    { s: 'we visited canada in june.', up: 'We Canada June' },
    { s: 'is jupiter bigger than earth?', up: 'Is Jupiter Earth' },
    { s: 'last tuesday zed fixed the ship.', up: 'Last Tuesday Zed' },
    { s: 'we sail to japan in march.', up: 'We Japan March' },
    { s: 'school starts in september.', up: 'School September' },
    { s: 'thanksgiving is in november.', up: 'Thanksgiving November' },
    { s: 'last summer i met kai.', up: 'Last I Kai' },
  ],
  3: [
    { s: 'captain lee is from ohio.', up: 'Captain Lee Ohio' },
    { s: 'our teacher is mr. diaz.', up: 'Our Mr. Diaz' },
    { s: 'dr. kim works in boston.', up: 'Dr. Kim Boston' },
    { s: 'aunt rosa lives in mexico.', up: 'Aunt Rosa Mexico' },
    { s: 'my cousin lives in new york.', up: 'My New York' },
    { s: 'i live on maple street.', up: 'I Maple Street' },
    { s: 'mount everest is very tall.', up: 'Mount Everest' },
    { s: 'the pacific ocean is huge.', up: 'The Pacific Ocean' },
    { s: 'the nile is a long river.', up: 'The Nile' },
  ],
};

// Matching the verb to who is doing it.
export const AGREEMENT = {
  1: [
    ['The pilots ___ ready.', 'are', 'is', 'am'],
    ['The rocket ___ fast.', 'is', 'are', 'am'],
    ['I ___ a pilot.', 'am', 'is', 'are'],
    ['We ___ in space.', 'are', 'is', 'am'],
    ['She ___ my sister.', 'is', 'are', 'am'],
    ['The stars ___ bright.', 'are', 'is', 'am'],
    ['Blip ___ a robot.', 'is', 'are', 'am'],
    ['They ___ late.', 'are', 'is', 'am'],
    ['You ___ brave.', 'are', 'is', 'am'],
    ['The moon ___ full.', 'is', 'are', 'am'],
  ],
  2: [
    ['She ___ to the moon.', 'flies', 'fly', 'flying'],
    ['The dogs ___ loudly.', 'bark', 'barks', 'barking'],
    ['He ___ the ship.', 'fixes', 'fix', 'fixing'],
    ['Birds ___ south.', 'fly', 'flies', 'flying'],
    ['My sister ___ fast.', 'runs', 'run', 'running'],
    ['The captain ___ at noon.', 'eats', 'eat', 'eating'],
    ['The boys ___ the map.', 'read', 'reads', 'reading'],
    ['A comet ___ across the sky.', 'zooms', 'zoom', 'zooming'],
    ['We ___ our helmets.', 'wear', 'wears', 'wearing'],
    ['It ___ a lot here.', 'rains', 'rain', 'raining'],
    ['The robots ___ the floor.', 'clean', 'cleans', 'cleaning'],
    ['Ana ___ the stars.', 'watches', 'watch', 'watching'],
  ],
  3: [
    ['The ship ___ late yesterday.', 'was', 'were', 'are'],
    ['The ships ___ late yesterday.', 'were', 'was', 'is'],
    ['We ___ at the base last night.', 'were', 'was', 'is'],
    ['I ___ sleepy last night.', 'was', 'were', 'are'],
    ['She ___ a new helmet.', 'has', 'have', 'having'],
    ['They ___ two robots.', 'have', 'has', 'having'],
    ['He ___ not like peas.', 'does', 'do', 'doing'],
    ['We ___ not have a map.', 'do', 'does', 'doing'],
    ['The pilot and the crew ___ ready.', 'are', 'is', 'am'],
    ['One of the engines ___ broken.', 'is', 'are', 'am'],
    ['Everyone ___ here.', 'is', 'are', 'am'],
    ['There ___ three moons.', 'are', 'is', 'am'],
    ['There ___ one sun.', 'is', 'are', 'am'],
  ],
};

// Which one is written correctly? The right one comes first.
export const PUNCTUATION = {
  1: [
    ['We saw stars, moons, and comets.', 'We saw stars moons and comets.', 'We saw, stars moons and comets.'],
    ['Blip can sing, dance, and beep.', 'Blip can sing dance and beep.', 'Blip can, sing dance and beep.'],
    ['Ana, Leo, and Zed flew home.', 'Ana Leo and Zed flew home.', 'Ana, Leo and, Zed flew home.'],
    ['I packed a map, a hat, and a snack.', 'I packed a map a hat and a snack.', 'I packed, a map a hat and a snack.'],
    ['Red, green, and blue lights blinked.', 'Red green and blue lights blinked.', 'Red, green and, blue lights blinked.'],
    ['I live in Austin, Texas.', 'I live in Austin Texas.', 'I live, in Austin Texas.'],
    ['We launch on July 4, 2030.', 'We launch on July, 4 2030.', 'We launch on July 4 2030.'],
  ],
  2: [
    ["That is the pilot's helmet.", 'That is the pilots helmet.', "That is the pilots's helmet."],
    ["That robot's arm is stuck.", 'That robots arm is stuck.', "That robots' arm is stuck."],
    ["Ana's ship is fast.", 'Anas ship is fast.', "Anas' ship is fast."],
    ["I like Zed's new boots.", 'I like Zeds new boots.', "I like Zeds' new boots."],
    ["My dog's bowl is empty.", 'My dogs bowl is empty.', 'My dog,s bowl is empty.'],
    ["Blip's lights are blue.", 'Blips lights are blue.', "Blips' lights are blue."],
  ],
  3: [
    ['Blip said, “Hold on tight!”', 'Blip said, Hold on tight!', '“Blip said, Hold on tight!”'],
    ['“I see it!” shouted Ana.', 'I see it! shouted Ana.', '“I see it! shouted Ana.”'],
    ['Zed asked, “Are we lost?”', 'Zed asked, Are we lost?', '“Zed asked, Are we lost?”'],
    ['“Follow me,” said the captain.', 'Follow me, said the captain.', '“Follow me, said the captain.”'],
    ["The two pilots' helmets match.", "The two pilot's helmets match.", 'The two pilots helmets match.'],
  ],
};

// Joining words: and, but, or, so, because.
export const CONJUNCTIONS = [
  ['I was tired, ___ I went to bed.', 'so', 'but', 'or'],
  ['I brought a map ___ a compass.', 'and', 'but', 'because'],
  ['I wanted to fly, ___ my ship was broken.', 'but', 'so', 'or'],
  ['We can walk, ___ we can take the rover.', 'or', 'so', 'because'],
  ['We stayed inside ___ it was raining.', 'because', 'but', 'or'],
  ['It was raining, ___ we stayed inside.', 'so', 'but', 'or'],
  ['I like apples, ___ I do not like pears.', 'but', 'so', 'because'],
  ['Do you want milk ___ juice?', 'or', 'but', 'so'],
  ['She put on her helmet ___ her boots.', 'and', 'but', 'so'],
  ['The alarm rang, ___ nobody woke up.', 'but', 'so', 'because'],
  ['He studied hard, ___ he passed the test.', 'so', 'but', 'or'],
  ['I cannot see ___ it is too dark.', 'because', 'so', 'but'],
  ['Hurry up, ___ we will miss the launch!', 'or', 'and', 'so'],
  ['The ship is old, ___ it still flies fast.', 'but', 'so', 'or'],
  ['Ana laughed ___ the joke was funny.', 'because', 'but', 'or'],
  ['We were hungry, ___ we made tacos.', 'so', 'but', 'or'],
  ['The puppy is small, ___ it is very loud.', 'but', 'so', 'because'],
  ['Zed missed the bus ___ he woke up late.', 'because', 'so', 'but'],
  ['The door was locked, ___ we used the window.', 'so', 'but', 'or'],
  ['I wanted to stay up, ___ I was too sleepy.', 'but', 'so', 'or'],
  ['Wear a coat, ___ you will be cold.', 'or', 'so', 'and'],
  ['The engine is fixed, ___ we can leave now.', 'so', 'but', 'or'],
  ['She smiled ___ she won the race.', 'because', 'but', 'or'],
  ['I looked everywhere, ___ I could not find it.', 'but', 'so', 'because'],
];

// Build the sentence. Each row is a sentence already in order; the game
// shuffles the words. The capital letter and the end mark fix where the first
// and last words go, and every row has only one order that makes sense.
export const ORDER = {
  1: [
    ['The', 'ship', 'flew', 'fast.'],
    ['Blip', 'fixed', 'the', 'door.'],
    ['We', 'saw', 'a', 'comet.'],
    ['The', 'stars', 'are', 'bright.'],
    ['I', 'love', 'my', 'robot.'],
    ['She', 'found', 'the', 'map.'],
    ['The', 'crew', 'ate', 'lunch.'],
    ['Can', 'you', 'see', 'Mars?'],
  ],
  2: [
    ['A', 'robot', 'waved', 'at', 'me.'],
    ['Where', 'is', 'my', 'helmet?'],
    ['The', 'moon', 'is', 'very', 'far.'],
    ['We', 'will', 'launch', 'at', 'noon.'],
    ['He', 'put', 'on', 'his', 'boots.'],
    ['The', 'little', 'alien', 'smiled.'],
    ['My', 'ship', 'needs', 'more', 'fuel.'],
    ['Please', 'close', 'the', 'hatch.'],
  ],
  3: [
    ['Did', 'you', 'pack', 'the', 'snacks?'],
    ['The', 'pilot', 'landed', 'on', 'Mars.'],
    ['I', 'can', 'fix', 'the', 'engine.'],
    ['Two', 'moons', 'rose', 'over', 'the', 'hill.'],
    ['The', 'brave', 'captain', 'saved', 'us', 'all.'],
    ['Why', 'is', 'the', 'alarm', 'ringing?'],
    ['A', 'star', 'fell', 'out', 'of', 'the', 'sky.'],
    ['We', 'ate', 'pizza', 'on', 'the', 'moon.'],
  ],
};
