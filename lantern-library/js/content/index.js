// The library: every book, in shelf order, plus lookups the game needs.

import keeper from './book-keeper.js';
import wild from './book-wild.js';
import mapmaker from './book-mapmaker.js';
import sparks from './book-sparks.js';
import tales from './book-tales.js';
import skystone from './book-skystone.js';

export const BOOKS = [keeper, wild, mapmaker, sparks, tales, skystone];

// Lanterns that must be lit (anywhere) before each book opens.
export const UNLOCK_AT = [0, 0, 3, 6, 10, 14];

// Every chapter, flat, with a link back to its book.
export const CHAPTERS = [];
BOOKS.forEach((book, bookIndex) => {
  book.chapters.forEach((chapter, index) => {
    CHAPTERS.push({ chapter, book, bookIndex, index });
  });
});

const chapterMap = new Map(CHAPTERS.map((c) => [c.chapter.id, c]));

export function findChapter(id) {
  return chapterMap.get(id) || null;
}

export function findBook(id) {
  return BOOKS.find((b) => b.id === id) || null;
}

// Every power word, keyed by its lowercase dictionary form. If two chapters
// teach the same word, the first one wins.
export const WORDS = new Map();
for (const { chapter, book } of CHAPTERS) {
  for (const w of chapter.words) {
    const key = w.word.toLowerCase();
    if (!WORDS.has(key)) WORDS.set(key, { ...w, key, chapterId: chapter.id, chapterTitle: chapter.title, bookTitle: book.title });
  }
}

export const TOTAL_LANTERNS = CHAPTERS.length;
