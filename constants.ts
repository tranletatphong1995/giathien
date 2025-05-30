

export const TARGET_CHARS_PER_CHAPTER = 10000;
export const STORY_DOWNLOAD_FILENAME = "GiaThienKyTruyen.txt";
export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

export const CHAPTER_OPTIONS: number[] = [10, 50, 100];
export const ESTIMATED_TIME_PER_CHAPTER_RANGE_HOURS: [number, number] = [0.5, 1]; // 30 mins to 1 hour per chapter

export const DEFAULT_TARGET_CHAPTERS = CHAPTER_OPTIONS[0]; // Default to 10 chapters

export const MAX_KEY_EVENTS_IN_LOG = 15; // Max number of key events to store in localStorage
export const MAX_KEY_EVENTS_FOR_PROMPT = 5; // Max number of recent key events to include in the AI prompt
export const KEY_EVENTS_STORAGE_KEY = 'geminiGameKeyEvents_GTT'; // localStorage key for key events
