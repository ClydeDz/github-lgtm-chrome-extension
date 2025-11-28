import { start } from "../scripts/start";
import * as utilModule from "../scripts/util";

const getReviewMessageSpy = jest
  .spyOn(utilModule, "getReviewMessage")
  .mockImplementation(jest.fn());

const getElementByIdSpy = jest.fn();
const querySelectorAllSpy = jest.fn();
const querySelectorSpy = jest.fn();
const addEventListenerSpy = jest.fn();

const mockDocument = {
  getElementById: getElementByIdSpy,
  querySelectorAll: querySelectorAllSpy,
  querySelector: querySelectorSpy,
};

describe("start - new github ui", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should execute happy path", () => {
    getElementByIdSpy.mockReturnValueOnce(null);
    let changeHandler;
    addEventListenerSpy.mockImplementation((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });
    querySelectorAllSpy.mockReturnValueOnce([
      {
        addEventListener: addEventListenerSpy,
      },
    ]);
    const reviewCommentsTextAreaSpy = { value: "" };
    querySelectorSpy.mockReturnValue(reviewCommentsTextAreaSpy);
    getReviewMessageSpy.mockReturnValue("LGTM!");

    start(mockDocument);

    changeHandler({ target: { value: "approve" } });

    expect(querySelectorAllSpy).toHaveBeenCalledWith(
      'input[name="reviewEvent"]'
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    expect(querySelectorSpy).toHaveBeenCalledWith(
      'textarea[placeholder="Leave a comment"]'
    );
    expect(getReviewMessageSpy).toHaveBeenCalledTimes(1);
    expect(reviewCommentsTextAreaSpy.value).toBe("LGTM!");
  });

  test("should not add event listener if radio buttons are missing", () => {
    getElementByIdSpy.mockReturnValueOnce(null);
    querySelectorAllSpy.mockReturnValueOnce([]);

    start(mockDocument);

    expect(querySelectorAllSpy).toHaveBeenCalledWith(
      'input[name="reviewEvent"]'
    );

    expect(getReviewMessageSpy).not.toHaveBeenCalled();
  });

  test("should not add comments if comment radio button is clicked", () => {
    getElementByIdSpy.mockReturnValueOnce(null);
    let changeHandler;
    addEventListenerSpy.mockImplementation((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });
    querySelectorAllSpy.mockReturnValueOnce([
      {
        addEventListener: addEventListenerSpy,
      },
    ]);

    start(mockDocument);

    changeHandler({ target: { value: "comment" } });

    expect(querySelectorAllSpy).toHaveBeenCalledWith(
      'input[name="reviewEvent"]'
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    expect(querySelectorSpy).not.toHaveBeenCalledWith(
      'textarea[placeholder="Leave a comment"]'
    );
    expect(getReviewMessageSpy).not.toHaveBeenCalled();
  });

  test("should not set value if review comments textarea is missing", () => {
    getElementByIdSpy.mockReturnValueOnce(null);
    let changeHandler;
    addEventListenerSpy.mockImplementation((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });
    querySelectorAllSpy.mockReturnValueOnce([
      {
        addEventListener: addEventListenerSpy,
      },
    ]);
    querySelectorSpy.mockReturnValue(null);
    getReviewMessageSpy.mockReturnValue("LGTM!");

    start(mockDocument);

    changeHandler({ target: { value: "approve" } });

    expect(querySelectorSpy).toHaveBeenCalledWith(
      'textarea[placeholder="Leave a comment"]'
    );

    expect(getReviewMessageSpy).not.toHaveBeenCalled();
  });
});
