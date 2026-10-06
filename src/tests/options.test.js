import fs from "fs";
import path from "path";
import { DEFAULT_MESSAGES } from "../scripts/util";

const readOptionsBody = () => {
  const html = fs.readFileSync(
    path.resolve(__dirname, "../options.html"),
    "utf8"
  );
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match[1];
};

const createChromeMock = (storedData = {}) => ({
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue(storedData),
      set: jest.fn().mockResolvedValue(undefined),
    },
    onChanged: { addListener: jest.fn() },
  },
});

const loadOptionsPage = (chromeMock) => {
  document.body.innerHTML = readOptionsBody();

  if (chromeMock) {
    global.chrome = chromeMock;
  }

  jest.isolateModules(() => {
    require("../scripts/options");
  });
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const getInputs = () => document.querySelectorAll("#messages input");

describe("options page", () => {
  afterEach(() => {
    jest.useRealTimers();
    delete global.chrome;
    document.body.innerHTML = "";
  });

  test("should render the default messages when nothing is saved", async () => {
    loadOptionsPage();
    await flush();

    expect(getInputs()).toHaveLength(DEFAULT_MESSAGES.length);
    expect(Array.from(getInputs()).map((input) => input.value)).toEqual(
      DEFAULT_MESSAGES
    );
    expect(document.getElementById("emptyHint").hidden).toBe(true);
  });

  test("should render the saved messages", async () => {
    loadOptionsPage(createChromeMock({ messages: ["First", "Second"] }));
    await flush();

    expect(Array.from(getInputs()).map((input) => input.value)).toEqual([
      "First",
      "Second",
    ]);
  });

  test("should add and remove messages", async () => {
    loadOptionsPage(createChromeMock());
    await flush();

    document.getElementById("addMessage").click();
    expect(getInputs()).toHaveLength(DEFAULT_MESSAGES.length + 1);

    document.querySelector("#messages li button").click();
    expect(getInputs()).toHaveLength(DEFAULT_MESSAGES.length);
  });

  test("should show the empty hint when the last message is removed", async () => {
    loadOptionsPage(createChromeMock({ messages: ["Only one"] }));
    await flush();

    document.querySelector("#messages li button").click();

    expect(getInputs()).toHaveLength(0);
    expect(document.getElementById("emptyHint").hidden).toBe(false);
  });

  test("should autosave once typing stops", async () => {
    const chromeMock = createChromeMock({ messages: ["First", "Second"] });
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "  Updated  ";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      messages: ["Updated", "Second"],
    });
    expect(document.getElementById("status").textContent).toContain(
      "Saved 2 messages."
    );
  });

  test("should show an error when autosaving fails", async () => {
    const chromeMock = createChromeMock({ messages: ["First"] });
    chromeMock.storage.sync.set = jest
      .fn()
      .mockRejectedValue(new Error("Quota exceeded"));
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "Nope";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(1000);

    expect(document.getElementById("status").textContent).toContain(
      "Couldn't save"
    );
    expect(document.getElementById("status").classList.contains("error")).toBe(
      true
    );
  });

  test("should retry a failed save up to 3 attempts, then give up", async () => {
    const chromeMock = createChromeMock({ messages: ["First"] });
    chromeMock.storage.sync.set = jest
      .fn()
      .mockRejectedValue(new Error("Quota exceeded"));
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "Nope";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await jest.advanceTimersByTimeAsync(1000); // first attempt fails
    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(1);
    expect(document.getElementById("status").textContent).toContain("retrying");

    await jest.advanceTimersByTimeAsync(1000); // second attempt fails
    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1000); // third attempt fails
    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(3);
    expect(document.getElementById("status").textContent).toContain(
      "after 3 attempts"
    );

    await jest.advanceTimersByTimeAsync(5000);
    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(3); // gives up
  });

  test("should stop retrying once a save succeeds", async () => {
    const chromeMock = createChromeMock({ messages: ["First"] });
    chromeMock.storage.sync.set = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue(undefined);
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "Edited";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await jest.advanceTimersByTimeAsync(3000);

    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(3);
    expect(document.getElementById("status").textContent).toContain(
      "Saved 1 message."
    );
  });

  test("should restart the retry budget after a fresh edit", async () => {
    const chromeMock = createChromeMock({ messages: ["First"] });
    chromeMock.storage.sync.set = jest
      .fn()
      .mockRejectedValue(new Error("Quota exceeded"));
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "One";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(3000);

    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(3);

    input.value = "Two";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await jest.advanceTimersByTimeAsync(1000);

    expect(chromeMock.storage.sync.set).toHaveBeenCalledTimes(4);
  });

  test("should flush pending edits when the popup closes", async () => {
    const chromeMock = createChromeMock({ messages: ["First"] });
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const input = getInputs()[0];
    input.value = "Edited";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pagehide"));

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      messages: ["Edited"],
    });
  });

  test("should insert the author tag at the cursor", async () => {
    const chromeMock = createChromeMock({ messages: ["Nice work"] });
    loadOptionsPage(chromeMock);
    await flush();

    const input = getInputs()[0];
    input.focus();
    input.setSelectionRange(4, 4);

    document.getElementById("insertAuthor").click();

    expect(input.value).toBe("Nice<AUTHOR> work");
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      messages: ["Nice<AUTHOR> work"],
    });
  });

  test("should append the author tag to the last message when nothing is focused", async () => {
    const chromeMock = createChromeMock({ messages: ["First", "Second"] });
    loadOptionsPage(chromeMock);
    await flush();

    document.getElementById("insertAuthor").click();

    expect(getInputs()[1].value).toBe("Second<AUTHOR>");
  });

  test("should add a row with the author tag when the list is empty", async () => {
    const chromeMock = createChromeMock({ messages: [] });
    loadOptionsPage(chromeMock);
    await flush();

    expect(getInputs()).toHaveLength(0);

    document.getElementById("insertAuthor").click();

    const inputs = getInputs();
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe("<AUTHOR>");
  });

  test("should restore the default messages on the second click", async () => {
    const chromeMock = createChromeMock({ messages: ["Custom one"] });
    loadOptionsPage(chromeMock);
    await flush();

    expect(getInputs()).toHaveLength(1);

    const restoreButton = document.getElementById("restoreDefaults");
    restoreButton.click();

    // The first click only arms the confirmation.
    expect(restoreButton.textContent).toContain("confirm");
    expect(getInputs()).toHaveLength(1);
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();

    restoreButton.click();

    expect(getInputs()).toHaveLength(DEFAULT_MESSAGES.length);
    expect(Array.from(getInputs()).map((input) => input.value)).toEqual(
      DEFAULT_MESSAGES
    );
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      messages: DEFAULT_MESSAGES,
    });
    expect(restoreButton.textContent).toBe("Restore defaults");
  });

  test("should cancel an armed restore after a few seconds", async () => {
    const chromeMock = createChromeMock({ messages: ["Custom one"] });
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const restoreButton = document.getElementById("restoreDefaults");
    restoreButton.click();
    expect(restoreButton.textContent).toContain("confirm");

    jest.advanceTimersByTime(5000);

    expect(restoreButton.textContent).toBe("Restore defaults");

    restoreButton.click(); // only re-arms, since the confirmation expired
    expect(restoreButton.textContent).toContain("confirm");
    expect(getInputs()).toHaveLength(1);
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();
  });

  test("should cancel an armed restore when the list is edited", async () => {
    const chromeMock = createChromeMock({ messages: ["Custom one"] });
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const restoreButton = document.getElementById("restoreDefaults");
    restoreButton.click();
    expect(restoreButton.textContent).toContain("confirm");

    const input = getInputs()[0];
    input.value = "Edited";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(restoreButton.textContent).toBe("Restore defaults");

    restoreButton.click(); // only re-arms, since editing cancelled it
    expect(getInputs()).toHaveLength(1);
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();
  });

  test("should cancel an armed restore when another button saves", async () => {
    const chromeMock = createChromeMock({ messages: ["Custom one"] });
    loadOptionsPage(chromeMock);
    await flush();

    jest.useFakeTimers();
    const restoreButton = document.getElementById("restoreDefaults");
    restoreButton.click();
    expect(restoreButton.textContent).toContain("confirm");

    document.getElementById("addMessage").click();

    expect(restoreButton.textContent).toBe("Restore defaults");

    restoreButton.click(); // only re-arms, since saving cancelled it
    expect(getInputs()).toHaveLength(2);
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalledWith({
      messages: DEFAULT_MESSAGES,
    });
  });
});
