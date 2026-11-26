// Sector 6, the Story Galaxy: reading for meaning.

// Short passages. Each has a few questions, and each question has a kind:
//   main   what the passage is mostly about
//   detail something the passage says outright
//   order  what happened first, next or last
//   cause  why something happened
//   infer  something the passage shows but does not say
// A question is: kind, the question, the right answer, two wrong answers, and
// a note for Blip to say if it is missed.
//
// The true-to-life passages were written to be accurate and simple. Names such
// as Zed, Ana, Mira and the rover Spark are made up.
export const PASSAGES = [
  {
    id: 'leak',
    title: 'The Leaky Ship',
    text: 'Zed heard a hiss. Air was leaking from the ship! First, Zed put on his helmet. Next, he found the tiny hole. Then he covered it with sticky tape. At last, the hissing stopped. Zed smiled and gave a thumbs-up.',
    qs: [
      ['order', 'What did Zed do first?', 'put on his helmet', 'found the hole', 'used sticky tape', 'The story says: First, Zed put on his helmet.'],
      ['cause', 'Why did Zed hear a hiss?', 'air was leaking out', 'a snake was on board', 'the engine was hot', 'The hiss was air leaking from the ship.'],
      ['infer', 'How did Zed feel at the end?', 'glad it was fixed', 'angry at the ship', 'ready for a nap', 'He smiled and gave a thumbs-up. The danger was over.'],
      ['main', 'What is this story mostly about?', 'Zed fixes a leak', 'Zed loses his helmet', 'Zed buys some tape', 'Every part of the story is about finding and fixing the leak.'],
    ],
  },
  {
    id: 'dust',
    title: 'Moon Dust',
    text: 'The moon is covered in gray dust. There is no wind or rain on the moon. That means footprints stay for a very long time. The boot prints from the first astronauts are still there today!',
    qs: [
      ['detail', 'What covers the moon?', 'gray dust', 'green grass', 'deep water', 'The first sentence says the moon is covered in gray dust.'],
      ['cause', 'Why do footprints stay on the moon?', 'there is no wind or rain', 'the dust is sticky', 'robots guard them', 'With no wind or rain, nothing brushes the prints away.'],
      ['main', 'What is this mostly about?', 'why moon footprints last', 'how to make a boot', 'rain on the moon', 'It explains why footprints on the moon do not go away.'],
      ['infer', 'What happens to a footprint on a windy beach?', 'it soon disappears', 'it stays for years', 'it turns to stone', 'On Earth, wind and water wipe footprints away.'],
    ],
  },
  {
    id: 'party',
    title: "Blip's Birthday",
    text: "It was Blip's birthday. The crew hid behind the crates. When Blip rolled in, everyone jumped out and yelled, “Surprise!” Blip's lights flashed pink. He spun in circles and beeped a happy song.",
    qs: [
      ['infer', 'How did Blip feel?', 'very happy', 'very angry', 'very sleepy', 'He spun in circles and beeped a happy song.'],
      ['detail', 'Where did the crew hide?', 'behind the crates', 'under the table', 'inside the engine', 'The story says the crew hid behind the crates.'],
      ['order', 'What happened right after Blip rolled in?', 'everyone yelled “Surprise!”', 'the crew hid', 'Blip went to sleep', 'When Blip rolled in, everyone jumped out and yelled.'],
      ['cause', 'Why did the crew hide?', 'to surprise Blip', 'to play tag', 'they were afraid', 'It was a surprise party for Blip.'],
    ],
  },
  {
    id: 'plant',
    title: 'The Thirsty Plant',
    text: 'Ana planted a seed in a cup on the ship. It grew into a little plant. Then she forgot to water it for a week. The plant drooped and turned yellow. Ana gave it water and put it by the window. Two days later, it stood tall and green again.',
    qs: [
      ['cause', 'Why did the plant droop?', 'it had no water', 'it was too cold', 'it was too old', 'Ana forgot to water it for a week.'],
      ['order', 'What did Ana do after the plant turned yellow?', 'gave it water', 'planted a seed', 'forgot about it', 'After it turned yellow, Ana gave it water and light.'],
      ['infer', 'What does this story show about plants?', 'they need water and light', 'they like the dark', 'they never change', 'With water and a sunny window, the plant got better.'],
      ['detail', 'What color was the plant at the end?', 'green', 'yellow', 'brown', 'At the end it stood tall and green again.'],
    ],
  },
  {
    id: 'octopus',
    title: 'The Amazing Octopus',
    text: 'An octopus has eight arms and three hearts. It can squeeze through a tiny hole because it has no bones. When danger is near, it squirts dark ink and zooms away.',
    qs: [
      ['detail', 'How many hearts does an octopus have?', 'three', 'one', 'eight', 'It has eight arms and three hearts.'],
      ['cause', 'Why can an octopus fit through a tiny hole?', 'it has no bones', 'it has eight arms', 'it has dark ink', 'With no bones, its soft body can squeeze through.'],
      ['main', 'What is this mostly about?', 'amazing facts about an octopus', 'how to catch a fish', 'why ink is dark', 'Every sentence tells something amazing about an octopus.'],
      ['infer', 'Why does an octopus squirt ink?', 'to get away safely', 'to find food', 'to play a game', 'It squirts ink when danger is near, then zooms away.'],
    ],
  },
  {
    id: 'map',
    title: 'The Lost Map',
    text: 'Captain Mira could not find her star map. She looked under her seat. She looked in the cargo room. At last, she asked Blip. Blip pointed at her hand. She had been holding the map the whole time!',
    qs: [
      ['order', 'Where did Mira look first?', 'under her seat', 'in the cargo room', 'in her hand', 'She looked under her seat, and then in the cargo room.'],
      ['infer', 'How did Mira most likely feel at the end?', 'a little silly', 'very proud', 'very hungry', 'She had been holding the map the whole time!'],
      ['detail', 'Who showed Mira where the map was?', 'Blip', 'Ana', 'Zed', 'Blip pointed at her hand.'],
      ['main', 'What is this story mostly about?', 'a captain hunts for her map', 'a robot gets lost', 'someone draws a star map', 'The whole story is Mira looking for her map.'],
    ],
  },
  {
    id: 'spin',
    title: 'Day and Night',
    text: 'Earth spins like a top. It takes one day to spin all the way around. When your side of Earth faces the sun, you have daytime. When your side turns away from the sun, it is night.',
    qs: [
      ['cause', 'Why do we have night?', 'our side turns away from the sun', 'the sun switches off', 'clouds cover the sun', 'Night comes when our side of Earth faces away from the sun.'],
      ['detail', 'How long does one full spin take?', 'one day', 'one hour', 'one year', 'It takes one day to spin all the way around.'],
      ['main', 'What is this mostly about?', 'why we have day and night', 'how to spin a top', 'why the sun is hot', 'It explains what makes day and night.'],
      ['infer', 'When it is night for you, what is it on the other side of Earth?', 'daytime', 'night too', 'winter', 'The other side is facing the sun, so it has daytime.'],
    ],
  },
  {
    id: 'salt',
    title: 'Garble Trouble',
    text: 'A Garbler sneaked into the kitchen. It scrambled every label. The salt jar said SUGAR. The sugar jar said SALT. At breakfast, Zed put two spoons of “sugar” on his cereal. He took one bite and made a terrible face.',
    qs: [
      ['infer', 'Why did Zed make a terrible face?', 'his cereal was salty', 'his cereal was cold', 'he saw the Garbler', 'The jar that said SUGAR was really full of salt.'],
      ['cause', 'Why were the labels wrong?', 'a Garbler scrambled them', 'Zed mixed them up', 'the jars were old', 'A Garbler sneaked in and scrambled every label.'],
      ['order', 'What happened before breakfast?', 'the labels were scrambled', 'Zed tasted his cereal', 'Zed made a face', 'First the Garbler scrambled the labels. Breakfast came later.'],
      ['detail', 'What did the salt jar say?', 'SUGAR', 'SALT', 'CEREAL', 'The salt jar said SUGAR.'],
    ],
  },
  {
    id: 'hummer',
    title: 'Tiny Flier',
    text: 'A hummingbird is tiny, but it is a mighty flier. Its wings beat so fast that they hum. It can hover in one spot like a helicopter. It can even fly backward! It drinks sweet nectar from flowers to get energy.',
    qs: [
      ['detail', 'What makes the humming sound?', 'its fast wings', 'its long beak', 'its tiny feet', 'Its wings beat so fast that they hum.'],
      ['main', 'What is this mostly about?', 'what a hummingbird can do', 'how flowers grow', 'why helicopters are loud', 'It tells about the amazing ways a hummingbird flies.'],
      ['infer', 'Why does a hummingbird need so much energy?', 'its wings beat very fast', 'it sleeps all day', 'it is very big', 'Beating wings that fast is hard work.'],
      ['detail', 'What does a hummingbird drink?', 'nectar', 'milk', 'pond water', 'It drinks sweet nectar from flowers.'],
    ],
  },
  {
    id: 'race',
    title: 'The Rover Race',
    text: 'Leo and Ana raced their rovers across the red sand. Leo zoomed ahead and waved at the crowd. He did not see the big rock. Crunch! His rover stopped. Ana drove slowly and steadily past him and won.',
    qs: [
      ['cause', "Why did Leo's rover stop?", 'it hit a rock', 'it ran out of power', 'Ana bumped it', 'Leo did not see the big rock. Crunch!'],
      ['infer', 'What lesson does this story teach?', 'watch where you are going', 'always go as fast as you can', 'never race a friend', 'Leo was waving at the crowd instead of watching the road.'],
      ['order', "What happened after Leo's rover stopped?", 'Ana passed him and won', 'Leo waved at the crowd', 'the race began', 'After the crunch, Ana drove past him and won.'],
      ['detail', 'Where did they race?', 'across red sand', 'across blue ice', 'through a dark cave', 'They raced across the red sand.'],
    ],
  },
  {
    id: 'crater',
    title: 'Make a Crater',
    text: 'You can make moon craters at home. First, fill a pan with flour. Next, sprinkle cocoa powder on top. Then drop a marble into the pan. Last, lift the marble out and look at your crater!',
    qs: [
      ['order', 'What do you do right after filling the pan with flour?', 'sprinkle cocoa on top', 'drop a marble', 'lift the marble out', 'First flour, next cocoa powder.'],
      ['order', 'What is the last step?', 'lift the marble out', 'fill the pan', 'sprinkle the cocoa', 'Last, lift the marble out and look at your crater.'],
      ['detail', 'What do you drop into the pan?', 'a marble', 'an egg', 'a spoon', 'Then drop a marble into the pan.'],
      ['infer', 'What is the marble pretending to be?', 'a space rock hitting the moon', 'the moon itself', 'an astronaut', 'Real craters are made when space rocks hit the moon.'],
    ],
  },
  {
    id: 'rover',
    title: 'The Little Rover',
    text: 'The rover Spark was built to explore a cold, dusty planet. Its mission was to last ninety days. But Spark kept rolling for many years! It climbed hills, took pictures, and sent them home. The scientists cheered each time.',
    qs: [
      ['detail', 'How long was the mission supposed to last?', 'ninety days', 'nine years', 'one week', 'Its mission was to last ninety days.'],
      ['infer', 'Why did the scientists cheer?', 'Spark was still working', 'Spark came home', 'Spark stopped rolling', 'Spark kept sending pictures long after ninety days.'],
      ['main', 'What is this mostly about?', 'a rover that lasted a long time', 'how to climb a hill', 'a planet made of pictures', 'It tells how Spark kept going for years.'],
      ['detail', 'What kind of planet did Spark explore?', 'cold and dusty', 'hot and wet', 'green and windy', 'Spark was built to explore a cold, dusty planet.'],
    ],
  },
  {
    id: 'bears',
    title: 'Sleepy Bears',
    text: 'In fall, bears eat as much as they can. They grow very fat. When winter comes, food is hard to find. So bears curl up in a den and sleep for months. Their fat keeps them alive until spring.',
    qs: [
      ['cause', 'Why do bears eat so much in fall?', 'to store fat for winter', 'to grow taller', 'to stay awake', 'Their fat keeps them alive through the winter.'],
      ['order', 'What do bears do when winter comes?', 'sleep in a den', 'eat all day', 'go for a swim', 'When winter comes, bears curl up in a den and sleep.'],
      ['detail', 'What keeps bears alive in winter?', 'their fat', 'fresh fish', 'warm sunshine', 'Their fat keeps them alive until spring.'],
      ['main', 'What is this mostly about?', 'how bears get through winter', 'why bears like honey', 'where bears swim', 'It tells how bears get ready for winter and sleep through it.'],
    ],
  },
  {
    id: 'trade',
    title: 'The Trade',
    text: "Zed wanted Ana's glowing rock. Ana wanted Zed's toy comet. “Let's trade,” said Zed. They swapped. That night, Zed's rock glowed by his bed, and Ana's comet spun on her shelf. Both friends fell asleep smiling.",
    qs: [
      ['infer', 'How did both friends feel about the trade?', 'happy', 'upset', 'worried', 'Both friends fell asleep smiling.'],
      ['detail', 'What did Ana get in the trade?', 'a toy comet', 'a glowing rock', 'a new shelf', "Ana wanted Zed's toy comet, and they swapped."],
      ['cause', 'Why did they trade?', 'each wanted what the other had', 'they were bored', 'Blip told them to', "Zed wanted Ana's rock, and Ana wanted Zed's comet."],
      ['order', 'What happened that night?', "the rock glowed by Zed's bed", 'Zed asked to trade', 'they swapped toys', "That night, Zed's rock glowed by his bed."],
    ],
  },
  {
    id: 'meteor',
    title: 'Shooting Stars',
    text: 'A shooting star is not really a star. It is a small rock from space. When it falls into the air around Earth, it gets so hot that it glows. We call that bright streak a meteor.',
    qs: [
      ['detail', 'What is a shooting star really?', 'a small space rock', 'a real star', 'a piece of the sun', 'It is a small rock from space, glowing as it falls.'],
      ['cause', 'Why does the falling rock glow?', 'it gets very hot', 'it is covered in ice', 'the sun paints it', 'It gets so hot that it glows.'],
      ['detail', 'What do we call the bright streak?', 'a meteor', 'a comet', 'a planet', 'We call that bright streak a meteor.'],
      ['main', 'What is this mostly about?', 'what shooting stars really are', 'how to wish on a star', 'why stars twinkle', 'It explains what a shooting star really is.'],
    ],
  },
  {
    id: 'nest',
    title: 'The Quiet Planet',
    text: 'The crew landed on a quiet green planet. Tiny footprints led from the ship to a cave. Inside, they found a nest made of soft moss. Three blue eggs sat in the nest, still warm.',
    qs: [
      ['infer', 'What do the warm eggs tell you?', 'a parent was just there', 'they are made of stone', 'they are very old', 'Eggs stay warm only if something was just sitting on them.'],
      ['infer', 'Who most likely made the tiny footprints?', 'a small animal', 'the captain', 'a giant', 'Tiny footprints come from tiny feet.'],
      ['detail', 'What was the nest made of?', 'soft moss', 'dry sticks', 'blue rocks', 'They found a nest made of soft moss.'],
      ['detail', 'How many eggs were in the nest?', 'three', 'two', 'five', 'Three blue eggs sat in the nest.'],
    ],
  },
];

// Fact or opinion. A fact can be checked and proven true. An opinion tells
// what someone thinks or feels, and has a judging word such as best or boring.
export const FACTS = [
  'The sun is a star.', 'A week has seven days.', 'Spiders have eight legs.', 'Earth has one moon.', 'Ice is frozen water.', 'A triangle has three sides.',
  'Fish live in water.', 'Mars is a planet.', 'Bees make honey.', 'A year has twelve months.', 'Owls can fly.', 'The moon goes around Earth.',
  'Dogs have four legs.', 'Cows give milk.', 'Trees have roots.', 'Saturn has rings.', 'A dime is worth ten cents.', 'Birds lay eggs.',
];
export const OPINIONS = [
  'Mars is the most exciting planet.', 'Pizza is the best dinner.', 'Dogs are better than cats.', 'Winter is too long.', 'Blue is the prettiest color.', 'Math is more fun than art.',
  'Robots are scary.', 'Everyone should have a pet.', 'Space movies are boring.', 'Summer is the best season.', 'Broccoli tastes yucky.', 'Saturn is the most beautiful planet.',
  'Mondays are the worst.', 'That was the funniest joke ever.', 'Soccer is easy.', 'Rain is annoying.', 'Night is nicer than day.', 'Ice cream is the best treat.',
];

// Star sayings: words that do not mean exactly what they say.
// Rows: the saying in a sentence, what it really means, two wrong meanings.
// The wrong meanings are often what the words would mean if taken exactly.
export const SAYINGS = {
  1: [
    ['The baby was as quiet as a mouse.', 'very quiet', 'very small', 'very hungry'],
    ['My backpack is as light as a feather.', 'very light', 'very soft', 'very pretty'],
    ['He ran as fast as lightning.', 'very fast', 'very bright', 'very loud'],
    ['She is as brave as a lion.', 'very brave', 'very loud', 'very hairy'],
    ['The floor was as cold as ice.', 'very cold', 'very shiny', 'very hard'],
    ['He is as busy as a bee.', 'very busy', 'very small', 'very sweet'],
    ['The pillow was as soft as a cloud.', 'very soft', 'very white', 'very high'],
    ['I slept like a log.', 'slept very deeply', 'slept on wood', 'slept outside'],
    ['He eats like a bird.', 'eats very little', 'eats only seeds', 'eats very fast'],
    ['The news spread like wildfire.', 'spread very fast', 'burned the town', 'was very hot'],
  ],
  2: [
    ['It is raining cats and dogs.', 'raining very hard', 'pets are falling', 'it is sunny'],
    ['That test was a piece of cake.', 'very easy', 'very tasty', 'very long'],
    ['I am feeling under the weather.', 'a little sick', 'soaking wet', 'very happy'],
    ['Time to hit the hay.', 'go to bed', 'feed the horse', 'clean the barn'],
    ['I have butterflies in my stomach.', 'I feel nervous', 'I ate bugs', 'I feel hungry'],
    ['Hold your horses!', 'wait a moment', 'grab the reins', 'run faster'],
    ['I am all ears.', 'I am listening', 'I have big ears', 'I cannot hear'],
    ['She let the cat out of the bag.', 'told a secret', 'lost her pet', 'opened her backpack'],
    ['That ride was out of this world!', 'amazing', 'very far away', 'very quiet'],
    ['He is in hot water.', 'in trouble', 'taking a bath', 'making soup'],
    ['Zip your lips.', 'be quiet', 'close your coat', 'smile'],
    ['Can you lend me a hand?', 'help me', 'shake hands', 'give me a glove'],
    ['Hang in there!', 'do not give up', 'swing on the bar', 'stay outside'],
  ],
  3: [
    ['It happens once in a blue moon.', 'almost never', 'every night', 'when the moon is blue'],
    ['She was over the moon.', 'very happy', 'lost in space', 'very sleepy'],
    ['Reach for the stars.', 'aim for big goals', 'jump very high', 'stay up late'],
    ['He got cold feet.', 'became too nervous', 'needed socks', 'stepped in snow'],
    ['It cost an arm and a leg.', 'it was very expensive', 'it hurt a lot', 'it was very cheap'],
    ['Break a leg!', 'good luck', 'be careful', 'run away'],
    ['I am on cloud nine.', 'very happy', 'very high up', 'very sleepy'],
    ['Do not spill the beans.', 'do not tell the secret', 'do not drop dinner', 'do not cook'],
    ['We see eye to eye.', 'we agree', 'we are the same height', 'we stare'],
    ['He has a heart of gold.', 'he is very kind', 'he is very rich', 'he is very heavy'],
    ['Time flies when you are having fun.', 'time seems to go fast', 'clocks have wings', 'fun takes forever'],
    ['I felt like a fish out of water.', 'out of place', 'very thirsty', 'ready to swim'],
  ],
};
