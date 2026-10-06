import {
  applyPlaceholders,
  AUTHOR_PLACEHOLDER,
  getReviewMessage,
} from "../scripts/util";

describe("util", () => {
  describe("getReviewMessage", () => {
    test("should return a review message", () => {
      const message = getReviewMessage();
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("applyPlaceholders", () => {
    test("should replace the exported AUTHOR_PLACEHOLDER constant", () => {
      const message = `Nice work, ${AUTHOR_PLACEHOLDER}`;
      expect(applyPlaceholders(message, "john-paul")).toBe(
        "Nice work, @john-paul"
      );
    });

    test("should replace <AUTHOR> with the tagged username", () => {
      expect(applyPlaceholders("Nice work, <AUTHOR>", "john-paul")).toBe(
        "Nice work, @john-paul"
      );
    });

    test("should replace every occurrence, ignoring case", () => {
      expect(applyPlaceholders("<author> + <AUTHOR>", "octocat")).toBe(
        "@octocat + @octocat"
      );
    });

    test("should not double-tag an author that already has an @", () => {
      expect(applyPlaceholders("Hi <AUTHOR>", "@john-paul")).toBe(
        "Hi @john-paul"
      );
    });

    test("should leave the placeholder untouched when the author is unknown", () => {
      expect(applyPlaceholders("Nice work, <AUTHOR>", null)).toBe(
        "Nice work, <AUTHOR>"
      );
      expect(applyPlaceholders("Nice work, <AUTHOR>", "")).toBe(
        "Nice work, <AUTHOR>"
      );
    });

    test("should return messages without placeholders unchanged", () => {
      expect(applyPlaceholders("Ship it! 🚢", "john-paul")).toBe("Ship it! 🚢");
    });
  });
});
