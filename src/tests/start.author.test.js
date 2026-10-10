import { getPullRequestAuthor, start } from "../scripts/start";
import * as utilModule from "../scripts/util";

const getReviewMessageSpy = jest
  .spyOn(utilModule, "getReviewMessage")
  .mockImplementation(jest.fn());

const createDoc = ({ authorLink, avatar, textarea, jsonScripts }) => {
  const addEventListenerSpy = jest.fn();
  let changeHandler;

  addEventListenerSpy.mockImplementation((event, handler) => {
    if (event === "change") {
      changeHandler = handler;
    }
  });

  const querySelectorSpy = jest.fn((selector) => {
    if (selector === "a.author") return authorLink || null;
    if (selector === '.timeline-comment-header img[alt^="@"]')
      return avatar || null;
    if (selector === 'textarea[placeholder="Leave a comment"]')
      return textarea || null;
    return null;
  });

  const querySelectorAllSpy = jest.fn((selector) => {
    if (selector === 'script[type="application/json"]')
      return jsonScripts || [];
    return [{ addEventListener: addEventListenerSpy }];
  });

  return {
    doc: {
      getElementById: jest.fn().mockReturnValue(null),
      querySelectorAll: querySelectorAllSpy,
      querySelector: querySelectorSpy,
    },
    getChangeHandler: () => changeHandler,
  };
};

describe("start - author placeholder", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should fill the message with the PR author's username", () => {
    const textarea = { value: "", dispatchEvent: jest.fn() };
    const { doc, getChangeHandler } = createDoc({
      authorLink: { textContent: "john-paul" },
      textarea,
    });
    getReviewMessageSpy.mockReturnValue("Nice work, <AUTHOR>");

    start(doc);
    getChangeHandler()({ target: { value: "approve" } });

    expect(textarea.value).toBe("Nice work, @john-paul");
  });

  test("should fall back to the comment avatar's alt text", () => {
    const textarea = { value: "", dispatchEvent: jest.fn() };
    const { doc, getChangeHandler } = createDoc({
      avatar: {
        getAttribute: (name) => (name === "alt" ? "@octo-cat" : null),
      },
      textarea,
    });
    getReviewMessageSpy.mockReturnValue("Nice work, <AUTHOR>");

    start(doc);
    getChangeHandler()({ target: { value: "approve" } });

    expect(textarea.value).toBe("Nice work, @octo-cat");
  });

  test("should leave the placeholder when the author cannot be found", () => {
    const textarea = { value: "", dispatchEvent: jest.fn() };
    const { doc, getChangeHandler } = createDoc({ textarea });
    getReviewMessageSpy.mockReturnValue("Nice work, <AUTHOR>");

    start(doc);
    getChangeHandler()({ target: { value: "approve" } });

    expect(textarea.value).toBe("Nice work, <AUTHOR>");
  });

  test("should prefer the author from the page's embedded JSON", () => {
    const textarea = { value: "", dispatchEvent: jest.fn() };
    const { doc, getChangeHandler } = createDoc({
      authorLink: { textContent: "someone-else" },
      jsonScripts: [
        {
          textContent: JSON.stringify({
            props: { pullRequest: { author: { login: "john-paul" } } },
          }),
        },
      ],
      textarea,
    });
    getReviewMessageSpy.mockReturnValue("Nice work, <AUTHOR>");

    start(doc);
    getChangeHandler()({ target: { value: "approve" } });

    expect(textarea.value).toBe("Nice work, @john-paul");
  });

  test("should fall back to the DOM when the embedded JSON is broken", () => {
    const textarea = { value: "", dispatchEvent: jest.fn() };
    const { doc, getChangeHandler } = createDoc({
      authorLink: { textContent: "fallback-user" },
      jsonScripts: [{ textContent: '{ "pullRequest": not-json' }],
      textarea,
    });
    getReviewMessageSpy.mockReturnValue("Nice work, <AUTHOR>");

    start(doc);
    getChangeHandler()({ target: { value: "approve" } });

    expect(textarea.value).toBe("Nice work, @fallback-user");
  });
});

describe("getPullRequestAuthor", () => {
  test("should return null when the document has no querySelector", () => {
    expect(getPullRequestAuthor({ getElementById: jest.fn() })).toBeNull();
  });

  test("should return null when no author is on the page", () => {
    expect(getPullRequestAuthor({ querySelector: () => null })).toBeNull();
  });

  test("should read the login from the author link's href when it has no text", () => {
    const doc = {
      querySelector: (selector) =>
        selector === "a.author"
          ? {
              getAttribute: (name) => (name === "href" ? "/john-paul" : null),
            }
          : null,
    };

    expect(getPullRequestAuthor(doc)).toBe("john-paul");
  });
});
