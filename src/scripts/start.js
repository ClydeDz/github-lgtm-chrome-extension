import * as utilModule from "./util";

const runOldGitHubUi = (doc, approveButton) => {
  if (!approveButton) return;

  approveButton.addEventListener("click", function () {
    const reviewCommentsTextArea = doc.getElementById(
      "pull_request_review_body"
    );

    if (!reviewCommentsTextArea) return;

    reviewCommentsTextArea.value = utilModule.getReviewMessage();
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

        reviewCommentsTextArea.value = utilModule.getReviewMessage();
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
