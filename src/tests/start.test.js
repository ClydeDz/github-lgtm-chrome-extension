import { start } from "../scripts/start";
import * as utilModule from "../scripts/util";

const getReviewMessageSpy = jest
  .spyOn(utilModule, "getReviewMessage")
  .mockImplementation(jest.fn());

const getElementByIdSpy = jest.fn();
const addEventListenerSpy = jest.fn();

const mockDocument = {
  getElementById: getElementByIdSpy,
};

describe("start", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should execute happy path", () => {
    addEventListenerSpy.mockImplementation((event, handler) => {
      handler();
    });
    getElementByIdSpy
      .mockReturnValueOnce({
        addEventListener: addEventListenerSpy,
      })
      .mockReturnValueOnce({ value: "" });

    start(mockDocument);

    expect(getElementByIdSpy).toHaveBeenCalledTimes(2);
    expect(getElementByIdSpy).toHaveBeenCalledWith(
      "pull_request_review[event]_approve"
    );
    expect(getElementByIdSpy).toHaveBeenCalledWith("pull_request_review_body");

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    expect(getReviewMessageSpy).toHaveBeenCalledTimes(1);
  });

  test("should not add event listener if approve button is missing", () => {
    getElementByIdSpy.mockReturnValueOnce(null);

    start(mockDocument);

    expect(getElementByIdSpy).toHaveBeenCalledTimes(1);
    expect(getElementByIdSpy).toHaveBeenCalledWith(
      "pull_request_review[event]_approve"
    );

    expect(getReviewMessageSpy).not.toHaveBeenCalled();
  });

  test("should set review comments value on click", () => {
    getReviewMessageSpy.mockReturnValue("LGTM!");
    addEventListenerSpy.mockImplementation((event, handler) => {
      handler();
    });
    const reviewCommentsTextAreaSpy = { value: "" };
    getElementByIdSpy
      .mockReturnValueOnce({ addEventListener: addEventListenerSpy })
      .mockReturnValueOnce(reviewCommentsTextAreaSpy);

    start(mockDocument);

    expect(getReviewMessageSpy).toHaveBeenCalledTimes(1);

    expect(reviewCommentsTextAreaSpy.value).toBe("LGTM!");
  });

  test("should not set value if review comments textarea is missing", () => {
    addEventListenerSpy.mockImplementation((event, handler) => {
      handler();
    });
    getElementByIdSpy
      .mockReturnValueOnce({
        addEventListener: addEventListenerSpy,
      })
      .mockReturnValueOnce(null);

    start(mockDocument);

    expect(getElementByIdSpy).toHaveBeenCalledWith("pull_request_review_body");

    expect(getReviewMessageSpy).not.toHaveBeenCalled();
  });
});
