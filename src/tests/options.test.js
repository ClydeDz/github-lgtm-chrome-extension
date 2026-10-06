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
    loadOptionsPage();
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

  test("should save the cleaned list to chrome.storage.sync", async () => {
    const chromeMock = createChromeMock({
      messages: ["First", "Second", "Third"],
    });
    loadOptionsPage(chromeMock);
    await flush();

    const inputs = getInputs();
    inputs[0].value = "  Updated  ";
    inputs[1].value = "   ";

    document.getElementById("save").click();
    await flush();

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      messages: ["Updated", "Third"],
    });
    expect(document.getElementById("status").textContent).toContain(
      "Saved 2 messages."
    );
    expect(Array.from(getInputs()).map((input) => input.value)).toEqual([
      "Updated",
      "Third",
    ]);
  });

  test("should show an error when saving fails", async () => {
    const chromeMock = createChromeMock();
    chromeMock.storage.sync.set = jest
      .fn()
      .mockRejectedValue(new Error("Quota exceeded"));
    loadOptionsPage(chromeMock);
    await flush();

    document.getElementById("save").click();
    await flush();

    expect(document.getElementById("status").textContent).toContain(
      "Could not save"
    );
    expect(document.getElementById("status").classList.contains("error")).toBe(
      true
    );
  });
});
