// The lines Blip says that are not part of a skill: cheers, coaching and a few
// words for the screens between missions. tools/voice-list.mjs gathers these
// (and everything else that is spoken) for the recordings.

export const LINES = {
  praise: ['Nice shot!', 'Great reading!', 'You are on fire!', 'Direct hit!', 'Excellent, Cadet!', 'Now that is flying!', 'Bullseye!', 'What a pilot!'],
  coach: [
    'Tap the ship that carries the right word.',
    'Miss, or wait too long, and they shoot back. Slide your ship to dodge!',
    'Stuck? Tap SCAN to clear away a wrong answer.',
    'Now a convoy. Zap only the animals. Let the others fly by!',
    'Only zap the ships that fit.',
  ],
  medal: ['Mission complete!', 'A gold medal! Perfect flying.', 'A silver medal! So close to gold.', 'A bronze medal. You made it through!'],
  down: ['Emergency warp! We got out just in time. Let us try that one again.'],
  hangar: ['Welcome to the hangar. Spend your crystals here.'],
  patrol: ['Time for the daily patrol. Let us see what you remember!'],
  boss: ['Watch out! A boss ship is coming. Every right answer breaks its shield.'],
  ready: ['Ready, Cadet? Launch!'],
  trained: ['Flight school complete. Welcome to Quill Squadron!'],
};
