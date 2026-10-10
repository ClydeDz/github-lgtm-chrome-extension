import * as utilModule from "./util";

const updateTextareaValue = (textarea, value) => {
  const prototype =
    typeof HTMLTextAreaElement !== "undefined"
      ? HTMLTextAreaElement.prototype
      : null;
  const nativeValueSetter = prototype
    ? Object.getOwnPropertyDescriptor(prototype, "value")?.set
    : null;

  let success = false;
  if (
    nativeValueSetter &&
    typeof HTMLTextAreaElement !== "undefined" &&
    textarea instanceof HTMLTextAreaElement
  ) {
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

const querySafely = (doc, selector) => {
  if (!doc || typeof doc.querySelector !== "function") return null;

  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
};

const readLogin = (element) => {
  if (!element) return null;

  const text =
    typeof element.textContent === "string" ? element.textContent.trim() : "";
  if (text) return text.replace(/^@/, "");

  const href =
    typeof element.getAttribute === "function"
      ? element.getAttribute("href")
      : null;
  if (typeof href === "string" && href.startsWith("/")) {
    const login = href.slice(1).split("/")[0];
    return login || null;
  }

  return null;
};

const queryAllSafely = (doc, selector) => {
  if (!doc || typeof doc.querySelectorAll !== "function") return null;

  try {
    return doc.querySelectorAll(selector);
  } catch {
    return null;
  }
};

// Recursively looks for pullRequest.author.login in an embedded JSON payload.
const findPullRequestLogin = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 8) return null;

  const pullRequest = value.pullRequest;
  if (pullRequest && typeof pullRequest === "object") {
    const author = pullRequest.author;
    if (
      author &&
      typeof author === "object" &&
      typeof author.login === "string"
    ) {
      return author.login || null;
    }
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const found = findPullRequestLogin(child, depth + 1);
    if (found) return found;
  }

  return null;
};

// Reads the PR author from the page's embedded JSON (react-app.embeddedData),
// which is the authoritative source: pullRequest.author.login.
const readAuthorFromJson = (doc) => {
  const scripts = queryAllSafely(doc, 'script[type="application/json"]');
  if (!scripts || typeof scripts.length !== "number") return null;

  for (let i = 0; i < scripts.length; i++) {
    const text = scripts[i] ? scripts[i].textContent : null;
    if (typeof text !== "string" || text.indexOf('"pullRequest"') === -1)
      continue;

    try {
      const login = findPullRequestLogin(JSON.parse(text));
      if (login) return login;
    } catch {
      // Not every JSON script parses; fall through to the next one.
    }
  }

  return null;
};

// Finds the pull request author's username on the current page. Preference:
// 1. pullRequest.author.login from the page's embedded JSON payload.
// 2. The first a.author link (the PR description comment is always posted
//    by the author).
// 3. The alt text of an avatar inside a comment header (e.g. alt="@octocat").
// Returns null when none of them resolve.
export function getPullRequestAuthor(doc) {
  const authorFromJson = readAuthorFromJson(doc);
  if (authorFromJson) return authorFromJson;

  const authorFromLink = readLogin(querySafely(doc, "a.author"));
  if (authorFromLink) return authorFromLink;

  const avatar = querySafely(doc, '.timeline-comment-header img[alt^="@"]');
  const authorFromAvatar =
    avatar && typeof avatar.getAttribute === "function"
      ? avatar.getAttribute("alt")
      : null;

  return typeof authorFromAvatar === "string" && authorFromAvatar.length > 1
    ? authorFromAvatar.slice(1)
    : null;
}

const runOldGitHubUi = (doc, approveButton) => {
  if (!approveButton) return;

  approveButton.addEventListener("click", function () {
    const reviewCommentsTextArea = doc.getElementById(
      "pull_request_review_body",
    );

    if (!reviewCommentsTextArea) return;

    const message = utilModule.applyPlaceholders(
      utilModule.getReviewMessage(),
      getPullRequestAuthor(doc),
    );
    updateTextareaValue(reviewCommentsTextArea, message);
  });
};

const runNewGitHubUi = (doc, radios) => {
  if (!radios || radios.length < 1) return;

  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "approve") {
        const reviewCommentsTextArea = doc.querySelector(
          'textarea[placeholder="Leave a comment"]',
        );

        if (!reviewCommentsTextArea) return;

        const message = utilModule.applyPlaceholders(
          utilModule.getReviewMessage(),
          getPullRequestAuthor(doc),
        );
        updateTextareaValue(reviewCommentsTextArea, message);
      }
    });
  });
};

export function start(injectedDocument) {
  const doc = injectedDocument;

  const approveButton = doc.getElementById(
    "pull_request_review[event]_approve",
  );

  runOldGitHubUi(doc, approveButton);

  const radios = doc.querySelectorAll('input[name="reviewEvent"]');

  runNewGitHubUi(doc, radios);
}
