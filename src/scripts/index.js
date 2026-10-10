import * as startModule from "./start";
import * as utilModule from "./util";

// Load the user's customised message list from chrome.storage.sync as soon
// as the content script runs. It stays fresh via chrome.storage.onChanged.
utilModule.initMessages();

const intervalId = setInterval(async function () {
  try {
    startModule.start(document);
  } catch {
    clearInterval(intervalId);
    console.info(
      "⚠️ GitHub LGTM:",
      "Please reload the page since the extension was reloaded",
    );
  }
}, 1000);
