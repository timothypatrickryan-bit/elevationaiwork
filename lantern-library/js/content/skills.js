// The reading skills every question is tagged with. The grown-ups' page reports
// accuracy for each one, so keep ids stable: saved progress refers to them.

export const SKILLS = [
  {
    id: 'details',
    name: 'Key Details',
    kid: 'Finding facts',
    about: 'Locating facts and details that the text states directly.',
    tip: 'Ask “where does it say that?” and have her point to the sentence.',
  },
  {
    id: 'evidence',
    name: 'Text Evidence',
    kid: 'Proving it',
    about: 'Choosing the exact sentence that supports an idea or answer.',
    tip: 'After any answer, ask “what in the story makes you think so?”',
  },
  {
    id: 'main',
    name: 'Main Idea & Summary',
    kid: 'The big idea',
    about: 'Telling what a text is mostly about and summarizing it without small details.',
    tip: 'Ask for a two-sentence summary of a chapter, a show, or her day.',
  },
  {
    id: 'inference',
    name: 'Inference',
    kid: 'Reading between the lines',
    about: 'Using clues in the text plus what you already know to figure out what is not stated.',
    tip: 'Pause while reading together and ask “how do you think she feels? What tells you?”',
  },
  {
    id: 'vocab',
    name: 'Words in Context',
    kid: 'Word detective',
    about: 'Working out what a word means from the sentences around it.',
    tip: 'When she meets a new word, have her guess from the sentence before looking it up.',
  },
  {
    id: 'figurative',
    name: 'Figurative Language',
    kid: 'Word pictures',
    about: 'Understanding similes, metaphors, personification and idioms.',
    tip: 'Collect fun comparisons you hear (“quiet as a mouse”) and invent new ones together.',
  },
  {
    id: 'sequence',
    name: 'Sequence',
    kid: 'What happened when',
    about: 'Keeping track of the order of events or steps.',
    tip: 'Ask her to retell a story using “first, then, after that, finally.”',
  },
  {
    id: 'cause',
    name: 'Cause & Effect',
    kid: 'Why it happened',
    about: 'Connecting what happened with why it happened.',
    tip: 'Use “because” and “so” questions: “Why did that happen? What happened because of it?”',
  },
  {
    id: 'structure',
    name: 'Text Structure & Comparing',
    kid: 'How it’s built',
    about: 'Seeing how a text is organized and comparing people, ideas, or two texts.',
    tip: 'Compare two characters, two animals, or a book and its movie: what’s the same? Different?',
  },
  {
    id: 'character',
    name: 'Characters & Point of View',
    kid: 'Who’s who',
    about: 'Describing characters, how they change, and who is telling the story.',
    tip: 'Ask how the story would change if a different character told it.',
  },
  {
    id: 'theme',
    name: 'Theme',
    kid: 'The lesson',
    about: 'Finding the message or lesson a story or poem leaves you with.',
    tip: 'After a story, ask “what did the character learn? What could a reader learn?”',
  },
  {
    id: 'purpose',
    name: 'Author’s Purpose & Reasons',
    kid: 'Why the author wrote it',
    about: 'Telling fact from opinion and spotting the reasons and evidence an author gives.',
    tip: 'With ads or articles, ask “what does the writer want you to think? What proof do they give?”',
  },
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

export function skillById(id) {
  return SKILLS.find((s) => s.id === id);
}
