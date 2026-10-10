export const DEFAULT_MESSAGES = [
  "Ship it! 🚢",
  "Zero notes — approved!",
  "You nailed it, <AUTHOR> 🎯",
  "Looks good to me, nice work! ✅",
  "Merge-tastic!",
  "<AUTHOR>, approved with style 😎",
  "Gold star ⭐",
  "Go go go! 🏎️",
  "Great instincts — nice work!",
  "Clean, clever, approved!",
  "Approved before my coffee cooled ☕",
  "Nice work, <AUTHOR>",
  "Green light from me 🟢",
  "Approved. Onward! 🧭",
  "Reads beautifully. Good to go!",
  "Strong work. Ship it whenever you're ready!",
];

// Placeholder that applyPlaceholders() expands to the PR author's @username.
export const AUTHOR_PLACEHOLDER = "<AUTHOR>";

// Matches AUTHOR_PLACEHOLDER case-insensitively; derived from the exported
// constant so its spelling only ever changes in one place. Regex-special
// characters are escaped so the match stays literal.
const AUTHOR_PLACEHOLDER_PATTERN = new RegExp(
  AUTHOR_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  "gi",
);

const STORAGE_KEY = "messages";

// Cache of the messages currently configured by the user. It starts as the
// defaults and is refreshed from chrome.storage.sync by initMessages().
let currentMessages = [...DEFAULT_MESSAGES];

export function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message) => typeof message === "string")
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
}

function hasSyncStorage() {
  return (
    typeof chrome !== "undefined" &&
    Boolean(chrome.storage) &&
    Boolean(chrome.storage.sync)
  );
}

// Reads the saved message list, falling back to the built-in defaults when
// nothing has been saved (or when sync storage is unavailable).
export async function loadMessages() {
  if (!hasSyncStorage()) return [...DEFAULT_MESSAGES];

  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const stored = data ? data[STORAGE_KEY] : undefined;
    return Array.isArray(stored)
      ? normalizeMessages(stored)
      : [...DEFAULT_MESSAGES];
  } catch (error) {
    console.info("⚠️ GitHub LGTM: Could not load saved messages.", error);
    return [...DEFAULT_MESSAGES];
  }
}

// Persists the message list to chrome.storage.sync, the extension's only
// persistent storage. Returns the cleaned list that was actually saved.
export async function saveMessages(messages) {
  const cleaned = normalizeMessages(messages);

  if (!hasSyncStorage()) {
    throw new Error("Chrome sync storage is not available.");
  }

  await chrome.storage.sync.set({ [STORAGE_KEY]: cleaned });
  return cleaned;
}

// Loads the saved messages into the in-memory cache and keeps it in sync
// when the user edits them from the options page (in any tab).
export async function initMessages() {
  try {
    currentMessages = await loadMessages();

    if (hasSyncStorage() && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync" || !changes[STORAGE_KEY]) return;

        const newValue = changes[STORAGE_KEY].newValue;
        currentMessages = Array.isArray(newValue)
          ? normalizeMessages(newValue)
          : [...DEFAULT_MESSAGES];
      });
    }
  } catch (error) {
    console.info("⚠️ GitHub LGTM: Could not initialise messages.", error);
  }
}
export function getReviewMessage() {
  // An empty list means the user removed every message, so nothing is added.
  if (!Array.isArray(currentMessages) || currentMessages.length === 0)
    return "";

  var index = Math.floor(Math.random() * currentMessages.length);
  return currentMessages[index];
}

// Replaces the <AUTHOR> placeholder with the PR author's tagged username,
// e.g. "Nice work, <AUTHOR>" becomes "Nice work, @john-paul". When the
// author is unknown the placeholder is left untouched so the user can see
// it and fill it in before submitting.
export function applyPlaceholders(message, author) {
  if (typeof message !== "string") return message;
  if (!author) return message;

  const login = String(author).replace(/^@/, "");
  if (!login) return message;

  return message.replace(AUTHOR_PLACEHOLDER_PATTERN, `@${login}`);
}
