import { getReviewMessage } from "../scripts/util";

describe("util", () => {
  describe("getReviewMessage", () => {
    test("should return a review message", () => {
      const message = getReviewMessage();
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThanOrEqual(1);
    });
  });
});
