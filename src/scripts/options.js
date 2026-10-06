import { loadMessages, saveMessages } from "./util";

const messagesList = document.getElementById("messages");
const emptyHint = document.getElementById("emptyHint");
const addMessageButton = document.getElementById("addMessage");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

let statusTimer;

function showStatus(text, isError) {
  status.textContent = text;
  status.classList.toggle("error", Boolean(isError));

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 3000);
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
  });

  item.appendChild(input);
  item.appendChild(removeButton);
  return item;
}

function render(messages) {
  messagesList.textContent = "";
  messages.forEach((message) => messagesList.appendChild(createRow(message)));
  emptyHint.hidden = messagesList.children.length > 0;
}

function getMessagesFromForm() {
  return Array.from(messagesList.querySelectorAll("input")).map(
    (input) => input.value
  );
}

addMessageButton.addEventListener("click", () => {
  const row = createRow("");
  messagesList.appendChild(row);
  emptyHint.hidden = true;
  row.querySelector("input").focus();
});

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;

  try {
    const saved = await saveMessages(getMessagesFromForm());
    render(saved);
    showStatus(
      `Saved ${saved.length} message${saved.length === 1 ? "" : "s"}.`,
      false
    );
  } catch (error) {
    console.info("⚠️ GitHub LGTM: Could not save messages.", error);
    showStatus("Could not save your messages. Please try again.", true);
  } finally {
    saveButton.disabled = false;
  }
});

loadMessages()
  .then(render)
  .catch((error) => {
    console.info("⚠️ GitHub LGTM: Could not load messages.", error);
    showStatus("Could not load your messages.", true);
  });
