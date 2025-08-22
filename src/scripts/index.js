import * as startModule from "./start";

const intervalId = setInterval(async function () {
  try {
    startModule.start(document);
  } catch {
    clearInterval(intervalId);
    console.info(
      "⚠️ GitHub LGTM:",
      "Please reload the page since the extension was reloaded"
    );
  }
}, 1000);
