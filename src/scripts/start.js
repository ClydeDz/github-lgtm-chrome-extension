import * as utilModule from "./util";

export function start(injectedDocument) {
  const doc = injectedDocument;

  const approveButton = doc.getElementById(
    "pull_request_review[event]_approve"
  );

  if (!approveButton) return;

  approveButton.addEventListener("click", function () {
    const reviewCommentsTextArea = doc.getElementById(
      "pull_request_review_body"
    );

    if (!reviewCommentsTextArea) return;

    reviewCommentsTextArea.value = utilModule.getReviewMessage();
  });
}
