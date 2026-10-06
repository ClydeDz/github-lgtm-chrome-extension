import {
  DEFAULT_MESSAGES,
  getReviewMessage,
  initMessages,
  loadMessages,
  normalizeMessages,
  saveMessages,
} from "../scripts/util";

const createChromeMock = (storedData = {}) => {
  const listeners = [];

  return {
    listeners,
    chrome: {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue(storedData),
          set: jest.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: jest.fn((listener) => listeners.push(listener)),
        },
      },
    },
  };
};

describe("util - messages storage", () => {
  beforeEach(() => {
    delete global.chrome;
  });

  afterEach(() => {
    delete global.chrome;
    jest.restoreAllMocks();
  });

  describe("normalizeMessages", () => {
    test("should keep only non-empty strings and trim them", () => {
      expect(
        normalizeMessages([" LGTM ", "", "   ", 42, null, undefined, "Ship it"])
      ).toEqual(["LGTM", "Ship it"]);
    });

    test("should return an empty list for non-array values", () => {
      expect(normalizeMessages("LGTM")).toEqual([]);
      expect(normalizeMessages(undefined)).toEqual([]);
      expect(normalizeMessages({ messages: ["LGTM"] })).toEqual([]);
    });
  });

  describe("loadMessages", () => {
    test("should return the defaults when sync storage is unavailable", async () => {
      expect(await loadMessages()).toEqual(DEFAULT_MESSAGES);
    });

    test("should return the defaults when nothing is saved yet", async () => {
      global.chrome = createChromeMock({}).chrome;

      expect(await loadMessages()).toEqual(DEFAULT_MESSAGES);
    });

    test("should return the defaults when reading storage fails", async () => {
      const mock = createChromeMock();
      mock.chrome.storage.sync.get = jest
        .fn()
        .mockRejectedValue(new Error("Corrupt storage"));
      global.chrome = mock.chrome;

      expect(await loadMessages()).toEqual(DEFAULT_MESSAGES);
    });

    test("should return the saved, cleaned list", async () => {
      global.chrome = createChromeMock({ messages: ["Custom", "  "] }).chrome;

      expect(await loadMessages()).toEqual(["Custom"]);
    });
  });

  describe("saveMessages", () => {
    test("should write the cleaned list to chrome.storage.sync", async () => {
      const mock = createChromeMock();
      global.chrome = mock.chrome;

      const saved = await saveMessages([" LGTM ", "", "Ship it"]);

      expect(mock.chrome.storage.sync.set).toHaveBeenCalledWith({
        messages: ["LGTM", "Ship it"],
      });
      expect(saved).toEqual(["LGTM", "Ship it"]);
    });

    test("should reject when sync storage is unavailable", async () => {
      await expect(saveMessages(["LGTM"])).rejects.toThrow(
        "Chrome sync storage is not available."
      );
    });
  });

  describe("initMessages", () => {
    test("should pick a random message from the saved list", async () => {
      global.chrome = createChromeMock({
        messages: ["Custom A", "Custom B"],
      }).chrome;
      await initMessages();

      const randomSpy = jest.spyOn(Math, "random");
      randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.99);

      expect(getReviewMessage()).toBe("Custom A");
      expect(getReviewMessage()).toBe("Custom B");
    });

    test("should refresh the messages when they change in the options page", async () => {
      const mock = createChromeMock({ messages: ["Initial"] });
      global.chrome = mock.chrome;
      await initMessages();

      expect(mock.chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);

      const [listener] = mock.listeners;
      listener({ messages: { newValue: ["Updated", "Another"] } }, "local");
      expect(getReviewMessage()).toBe("Initial");

      listener({ messages: { newValue: ["Updated", "Another"] } }, "sync");
      jest.spyOn(Math, "random").mockReturnValue(0);
      expect(getReviewMessage()).toBe("Updated");

      listener({ messages: { newValue: undefined } }, "sync");
      expect(getReviewMessage()).toBe(DEFAULT_MESSAGES[0]);
    });

    test("should return an empty message when every message was removed", async () => {
      global.chrome = createChromeMock({ messages: [] }).chrome;
      await initMessages();

      expect(getReviewMessage()).toBe("");
    });

    test("should keep the loaded messages when the change listener fails", async () => {
      const mock = createChromeMock({ messages: ["Fresh"] });
      mock.chrome.storage.onChanged.addListener = jest.fn(() => {
        throw new Error("Listener rejected");
      });
      global.chrome = mock.chrome;

      await initMessages();

      expect(getReviewMessage()).toBe("Fresh");
    });
  });
});
