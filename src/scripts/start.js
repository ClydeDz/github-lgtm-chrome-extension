import * as utilModule from "./util";

const updateTextareaValue = (textarea, value) => {
  const prototype = typeof HTMLTextAreaElement !== "undefined" ? HTMLTextAreaElement.prototype : null;
  const nativeValueSetter = prototype ? Object.getOwnPropertyDescriptor(prototype, "value")?.set : null;
  
  let success = false;
  if (nativeValueSetter && typeof HTMLTextAreaElement !== "undefined" && textarea instanceof HTMLTextAreaElement) {
    try {
      nativeValueSetter.call(textarea, value);
      success = true;
    } catch (e) {
      // Fallback
    }
  }

  if (!success) {
    textarea.value = value;
  }

  if (typeof textarea.dispatchEvent === "function") {
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }
};

const runOldGitHubUi = (doc, approveButton) => {
  if (!approveButton) return;

  approveButton.addEventListener("click", function () {
    const reviewCommentsTextArea = doc.getElementById(
      "pull_request_review_body"
    );

    if (!reviewCommentsTextArea) return;

    updateTextareaValue(reviewCommentsTextArea, utilModule.getReviewMessage());
  });
};

const runNewGitHubUi = (doc, radios) => {
  if (!radios || radios.length < 1) return;

  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "approve") {
        const reviewCommentsTextArea = doc.querySelector(
          'textarea[placeholder="Leave a comment"]'
        );

        if (!reviewCommentsTextArea) return;

        updateTextareaValue(reviewCommentsTextArea, utilModule.getReviewMessage());
      }
    });
  });
};

export function start(injectedDocument) {
  const doc = injectedDocument;

  const approveButton = doc.getElementById(
    "pull_request_review[event]_approve"
  );

  runOldGitHubUi(doc, approveButton);

  const radios = doc.querySelectorAll('input[name="reviewEvent"]');

  runNewGitHubUi(doc, radios);
}

