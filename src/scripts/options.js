import {
  AUTHOR_PLACEHOLDER,
  DEFAULT_MESSAGES,
  loadMessages,
  saveMessages,
} from "./util";

const SAVE_DEBOUNCE_MS = 1000;
const RETRY_DELAY_MS = 1000;
const MAX_SAVE_ATTEMPTS = 3;
const RESTORE_CONFIRM_MS = 5000;

const messagesList = document.getElementById("messages");
const emptyHint = document.getElementById("emptyHint");
const addMessageButton = document.getElementById("addMessage");
const insertAuthorButton = document.getElementById("insertAuthor");
const restoreDefaultsButton = document.getElementById("restoreDefaults");
const status = document.getElementById("status");

let statusTimer;
let saveTimer = null;
let dirty = false;
let lastFocusedInput = null;
let saveAttempts = 0;
let restoreArmed = false;
let restoreTimer = null;
let pendingWrite = null;

function showStatus(text, isError) {
  status.textContent = text;
  status.classList.toggle("error", Boolean(isError));

  clearTimeout(statusTimer);
  statusTimer = setTimeout(
    () => {
      status.textContent = "";
    },
    isError ? 5000 : 3000,
  );
}

function createRow(message) {
  const item = document.createElement("li");

  const input = document.createElement("input");
  input.type = "text";
  input.value = message;
  input.placeholder = "e.g. LGTM!";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    item.remove();
    emptyHint.hidden = messagesList.children.length > 0;
    saveNow();
  });

  item.appendChild(input);
  item.appendChild(removeButton);
  return item;
}

function render(messages) {
  lastFocusedInput = null;
  messagesList.textContent = "";
  messages.forEach((message) => messagesList.appendChild(createRow(message)));
  emptyHint.hidden = messagesList.children.length > 0;
}

function getMessagesFromForm() {
  return Array.from(messagesList.querySelectorAll("input")).map(
    (input) => input.value,
  );
}

// --- autosave -------------------------------------------------------------

// Typing is debounced so rapid keystrokes don't burn Chrome sync write
// quota (120 writes/hour); button actions save immediately, and a failed
// save is retried automatically up to MAX_SAVE_ATTEMPTS total tries.
function scheduleSave() {
  dirty = true;
  saveAttempts = 0;
  disarmRestore();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
}

// Writes are chained so overlapping saves can't land out of order: an older
// snapshot must never overwrite a newer one. With nothing in flight the
// write starts synchronously, so callers still see it immediately.
function queueSave(messages) {
  const start = pendingWrite
    ? pendingWrite.then(() => saveMessages(messages))
    : saveMessages(messages);

  pendingWrite = start.then(
    () => undefined,
    () => undefined,
  );
  return start;
}

async function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;

  if (!dirty) return;
  dirty = false;

  try {
    const saved = await queueSave(getMessagesFromForm());
    saveAttempts = 0;
    showStatus(
      `Saved ${saved.length} message${saved.length === 1 ? "" : "s"}.`,
      false,
    );
  } catch (error) {
    dirty = true;
    saveAttempts += 1;
    console.info("⚠️ GitHub LGTM: Could not save messages.", error);

    if (saveAttempts < MAX_SAVE_ATTEMPTS) {
      showStatus(
        `Couldn't save yet — retrying (${saveAttempts + 1}/${MAX_SAVE_ATTEMPTS})…`,
        true,
      );
      saveTimer = setTimeout(flushSave, RETRY_DELAY_MS);
    } else {
      showStatus(
        `Couldn't save your changes after ${MAX_SAVE_ATTEMPTS} attempts.`,
        true,
      );
    }
  }
}

function saveNow() {
  disarmRestore();
  dirty = true;
  saveAttempts = 0;
  clearTimeout(saveTimer);
  saveTimer = null;
  flushSave();
}

// --- actions ----------------------------------------------------------------

messagesList.addEventListener("focusin", (event) => {
  if (event.target && event.target.tagName === "INPUT") {
    lastFocusedInput = event.target;
  }
});

messagesList.addEventListener("input", (event) => {
  if (event.target && event.target.tagName === "INPUT") {
    scheduleSave();
  }
});

addMessageButton.addEventListener("click", () => {
  const row = createRow("");
  messagesList.appendChild(row);
  emptyHint.hidden = true;
  row.querySelector("input").focus();
  saveNow();
});

insertAuthorButton.addEventListener("click", () => {
  const tracked =
    lastFocusedInput && lastFocusedInput.isConnected ? lastFocusedInput : null;

  let input = tracked;
  if (!input) {
    const lastRow = messagesList.querySelector("li:last-child");
    input = lastRow ? lastRow.querySelector("input") : null;

    if (!input) {
      const row = createRow("");
      messagesList.appendChild(row);
      emptyHint.hidden = true;
      input = row.querySelector("input");
    }
  }

  const value = input.value;
  const useSelection = input === tracked;
  const clamp = (position) =>
    Math.min(
      Math.max(typeof position === "number" ? position : value.length, 0),
      value.length,
    );
  const start = useSelection ? clamp(input.selectionStart) : value.length;
  const end = useSelection ? clamp(input.selectionEnd) : start;

  input.value = value.slice(0, start) + AUTHOR_PLACEHOLDER + value.slice(end);
  input.focus();

  if (typeof input.setSelectionRange === "function") {
    const caret = start + AUTHOR_PLACEHOLDER.length;
    input.setSelectionRange(caret, caret);
  }

  lastFocusedInput = input;
  saveNow();
});

// Cancels a pending restore confirmation; safe to call when nothing is armed.
function disarmRestore() {
  if (!restoreArmed) return;

  restoreArmed = false;
  clearTimeout(restoreTimer);
  restoreTimer = null;
  restoreDefaultsButton.textContent = "Restore defaults";
}

// Restore is destructive and the page is already a dialog, so instead of
// another modal the first click arms the button ("Click again to confirm")
// and only a second click restores. Arming cancels itself after
// RESTORE_CONFIRM_MS, or as soon as the list is edited or saved again.
restoreDefaultsButton.addEventListener("click", () => {
  if (!restoreArmed) {
    restoreArmed = true;
    restoreDefaultsButton.textContent = "Click again to confirm";
    restoreTimer = setTimeout(disarmRestore, RESTORE_CONFIRM_MS);
    return;
  }

  disarmRestore();
  render([...DEFAULT_MESSAGES]);
  saveNow();
});

// Flush pending edits if the popup is closed before the debounce fires.
window.addEventListener("pagehide", () => {
  if (dirty) flushSave();
});

// --- start ------------------------------------------------------------------

loadMessages()
  .then(render)
  .catch((error) => {
    console.info("⚠️ GitHub LGTM: Could not load messages.", error);
    showStatus("Could not load your messages.", true);
  });
