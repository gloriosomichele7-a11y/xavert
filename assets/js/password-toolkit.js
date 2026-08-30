"use strict";

const PASSPHRASE_WORDS = Object.freeze(
[
  "anchor", "apple", "apron", "arch", "arrow", "artist", "autumn", "badge", "baker", "bamboo", "basket", "beach",
  "beacon", "berry", "bird", "black", "blade", "bloom", "blue", "board", "boat", "bolt", "book", "bottle",
  "branch", "bread", "breeze", "brick", "bridge", "brook", "brush", "bucket", "cable", "cactus", "candle", "canyon",
  "carpet", "castle", "cedar", "chair", "chalk", "charm", "cherry", "circle", "cloud", "coast", "comet", "coral",
  "corner", "cotton", "crane", "creek", "crown", "crystal", "dawn", "desert", "diamond", "door", "dream", "drift",
  "eagle", "earth", "ember", "engine", "feather", "field", "flame", "flower", "forest", "frost", "garden", "gate",
  "glass", "globe", "grain", "grape", "grass", "green", "grove", "harbor", "heart", "hill", "honey", "horse",
  "island", "ivory", "jade", "lake", "lantern", "leaf", "lemon", "light", "lily", "maple", "meadow", "metal",
  "moon", "moss", "mountain", "ocean", "olive", "orange", "orbit", "owl", "paper", "peach", "pearl", "pine",
  "planet", "plum", "pond", "prism", "quartz", "rain", "raven", "reef", "river", "road", "rocket", "rose",
  "sand", "shadow", "shell", "shore", "silver", "sky", "smoke", "snow", "solar", "spark", "spring", "star",
  "stone", "storm", "stream", "summer", "sun", "sunset", "surf", "tiger", "timber", "trail", "tree", "valley",
  "velvet", "violet", "wave", "wheat", "willow", "wind", "winter", "wood", "world", "acorn", "amber", "angel",
  "antler", "basil", "birch", "blossom", "bronze", "cabin", "camel", "canvas", "cliff", "clover", "daisy", "delta",
  "dune", "elm", "falcon", "fern", "flint", "fog", "fox", "galaxy", "glacier", "gold", "hawk", "hazel",
  "horizon", "iris", "ivy", "jungle", "lagoon", "lark", "lava", "lotus", "marble", "meteor", "mint", "mist",
  "night", "oak", "oasis", "orchid", "pebble", "poppy", "reed", "ridge", "robin", "ruby", "sail", "sea",
  "slate", "sparrow", "steel", "swan", "thunder", "tide", "topaz", "tulip", "vine", "whale", "wolf", "wren",
  "able", "active", "agile", "alert", "alive", "ample", "ancient", "apt", "arctic", "basic", "bold", "brave",
  "bright", "brisk", "calm", "candid", "careful", "casual", "certain", "clever", "clear", "cool", "crisp", "curious",
  "daily", "deep", "eager", "early", "easy", "fair", "fast", "firm", "fresh", "gentle", "glad", "grand",
  "great", "happy", "hardy", "honest", "ideal", "keen", "kind", "lively", "lucid", "lucky", "major", "mellow",
  "mild", "modern", "neat", "noble", "open", "plain", "prime", "proud", "quick", "quiet", "rapid", "ready",
  "safe", "sharp", "simple", "smart", "solid", "steady", "still", "strong", "sunny", "swift", "tidy", "true",
  "vivid", "warm", "wise", "young", "adapt", "admire", "agree", "allow", "answer", "arrive", "assist", "avoid",
  "balance", "begin", "believe", "build", "carry", "change", "choose", "climb", "collect", "compare", "connect", "create",
  "dance", "decide", "design", "discover", "draw", "drive", "enjoy", "enter", "escape", "explore", "find", "finish",
  "follow", "gather", "give", "grow", "guide", "help", "imagine", "improve", "join", "jump", "keep", "learn",
  "listen", "make", "move", "notice", "paint", "plan", "play", "protect", "read", "relax", "remember", "repair",
  "rest", "ride", "run", "save", "seek", "share", "sing", "solve", "speak", "stand", "start", "study",
  "swim", "teach", "think", "travel", "trust", "turn", "use", "visit", "walk", "watch", "work", "write",
  "animal", "badger", "beaver", "bison", "cobra", "dolphin", "donkey", "ferret", "gecko", "heron", "koala", "leopard",
  "lion", "llama", "otter", "panda", "parrot", "rabbit", "salmon", "seal", "shark", "sheep", "sloth", "turtle",
  "zebra", "almond", "bean", "cocoa", "coffee", "cream", "mango", "melon", "onion", "pear", "pepper", "rice",
  "spice", "sugar", "vanilla", "aqua", "beige", "brown", "cyan", "gray", "indigo", "lilac", "lime", "maroon",
  "navy", "ochre", "pink", "purple", "red", "teal", "white", "yellow", "april", "august", "friday", "january",
  "july", "june", "march", "monday", "october", "saturday", "sunday", "thursday", "tuesday", "wednesday", "cone", "cube",
  "curve", "line", "oval", "point", "ring", "shape", "sphere", "square", "triangle", "airport", "avenue", "barn",
  "camp", "cellar", "city", "cottage", "court", "farm", "home", "hotel", "lane", "lodge", "market", "park",
  "plaza", "port", "ranch", "station", "street", "tower", "town", "village", "yard", "camera", "card", "clock",
  "compass", "drum", "flute", "frame", "guitar", "hammer", "helmet", "jacket", "key", "ladder", "lamp", "mirror",
  "needle", "pencil", "pillow", "radio", "rope", "saddle", "scarf", "shield", "spoon", "table", "tent", "torch",
  "wheel", "atom", "byte", "cache", "chip", "code", "data", "input", "logic", "matrix", "node", "pixel",
  "query", "signal", "stack", "token", "vector", "abacus", "absorb", "accent", "access", "account", "action", "adjust",
  "advice", "affair", "agency", "alarm", "album", "alley", "amount", "arena", "armor", "aspect", "atlas", "attic",
  "audio", "award", "axis", "bacon", "bagel", "balcony", "balloon", "banner", "barrel", "basin", "battery", "beaker",
  "blanket", "block", "blouse", "border", "bowl", "brake", "brass", "broom", "bubble", "button", "cabinet", "calendar",
  "canal", "canoe", "carton", "cement", "chain", "chamber", "channel", "chapel", "chart", "chest", "chimney", "cinema",
  "clamp", "clay", "clinic", "closet", "cloth", "coach", "column", "comic", "copper", "cord", "cork", "costume",
  "cradle", "craft", "crater", "crate", "curtain", "cushion", "dairy", "deck", "depot", "desk", "dial", "diary",
  "dish", "dock", "drawer", "drill", "driver", "envelope", "fabric", "faucet", "fence", "fiber", "flag", "folder",
  "fountain", "freezer", "funnel", "garage", "gauge", "gear", "glove", "handle", "hinge", "hook", "hose", "iron",
  "jar", "journal", "kettle", "keyboard", "kitchen", "label", "lens", "locker", "magnet", "map", "marker", "match",
  "medal", "menu", "model", "motor", "mug", "nail", "napkin", "notebook", "oven", "packet", "paddle", "panel",
  "parcel", "pedal", "pipe", "plate", "plug", "pocket", "poster", "pot", "pump", "rack", "rail", "razor",
  "receipt", "ribbon", "ruler", "scale", "screen", "screw", "shelf", "shovel", "sign", "sink", "soap", "socket",
  "sofa", "switch", "tape", "tile", "timer", "toolbox", "tray", "tube", "tunnel", "umbrella", "valve", "vase",
  "wallet", "whistle", "window", "zipper", "actor", "adult", "agent", "author", "barber", "brewer", "builder", "buyer",
  "caller", "captain", "chef", "clerk", "dancer", "dealer", "diver", "editor", "farmer", "guard", "hunter", "judge",
  "leader", "maker", "miner", "nurse", "owner", "painter", "pilot", "player", "poet", "porter", "reader", "rider",
  "sailor", "singer", "smith", "speaker", "teacher", "trader", "writer", "airplane", "bicycle", "bus", "cart", "ferry",
  "glider", "helicopter", "jet", "kayak", "scooter", "ship", "subway", "taxi", "train", "tram", "truck", "van",
  "wagon", "yacht", "ant", "bee", "beetle", "butterfly", "crab", "crow", "deer", "duck", "frog", "goat",
  "goose", "insect", "lobster", "moose", "mouse", "octopus", "penguin", "pigeon", "pony", "ram", "rat", "snail",
  "snake", "spider", "squid", "stork", "turkey", "ash", "aspen", "beech", "cypress", "fir", "palm", "poplar",
  "redwood", "spruce", "barley", "beet", "beetroot", "cabbage", "carrot", "celery", "corn", "garlic", "ginger", "herb",
  "kale", "lentil", "lettuce", "maize", "oat", "pea", "potato", "pumpkin", "radish", "rye", "spinach", "squash",
  "tomato", "biscuit", "brownie", "cake", "candy", "cereal", "cheese", "cookie", "cracker", "donut", "muffin", "noodle",
  "pasta", "pizza", "pudding", "sandwich", "soup", "toast", "waffle", "breakfast", "dinner", "lunch", "snack", "supper",
  "ballet", "blues", "choir", "jazz", "melody", "opera", "rhythm", "song", "tango", "baseball", "boxing", "cricket",
  "cycling", "football", "golf", "hockey", "racing", "rugby", "skiing", "soccer", "tennis", "volleyball", "alpine", "marsh",
  "prairie", "swamp", "volcano", "dusk", "evening", "morning", "noon", "blizzard", "drizzle", "hail", "shower", "sleet",
  "current", "energy", "force", "heat", "motion", "power", "pressure", "sound", "speed", "voltage", "acid", "carbon",
  "element", "gas", "helium", "oxygen", "plasma", "sodium", "zinc", "algebra", "angle", "area", "decimal", "equation",
  "formula", "graph", "integer", "number", "ratio", "sum", "total", "biology", "chemistry", "geology", "history", "language",
  "math", "music", "physics", "science", "browser", "domain", "email", "internet", "link", "network", "server", "website",
  "array", "boolean", "class", "constant", "function", "method", "object", "string", "variable", "backup", "commit", "debug",
  "deploy", "merge", "patch", "release", "source", "test", "version", "checkbox", "dialog", "dropdown", "footer", "header",
  "icon", "modal", "navbar", "sidebar", "tab", "privacy", "safety", "secure", "verify", "bargain", "budget", "coin",
  "finance", "fund", "money", "price", "profit", "sale", "value", "bond", "capital", "equity", "trade", "butter",
  "egg", "flour", "milk", "oil", "salt", "cup", "fork", "pan", "bed", "bench", "couch", "stool",
  "bathroom", "bedroom", "hallway", "office", "porch", "family", "friend", "guest", "neighbor", "parent", "partner", "sister",
  "brother", "baby", "child", "teen", "youth", "elder", "body", "brain", "ear", "eye", "face", "finger",
  "foot", "hair", "hand", "head", "knee", "leg", "mouth", "neck", "nose", "skin", "tooth", "health",
  "care", "diet", "fitness", "sleep", "sport", "chapter", "essay", "letter", "note", "page", "poem", "story",
  "text", "title", "color", "image",
]
);

const COMMON_PASSWORDS = Object.freeze(
  new Set([
    "123456",
    "123456789",
    "12345678",
    "12345",
    "1234567",
    "password",
    "password1",
    "password123",
    "qwerty",
    "qwerty123",
    "abc123",
    "111111",
    "123123",
    "admin",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
    "football",
    "iloveyou",
    "princess",
    "sunshine",
    "master",
    "login",
    "passw0rd",
    "p@ssword",
    "p@ssw0rd",
  ]),
);

const PASSWORD_SEQUENCE_SOURCES = Object.freeze([
  "0123456789",
  "9876543210",
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "qwertyuiop",
  "poiuytrewq",
  "asdfghjkl",
  "lkjhgfdsa",
  "zxcvbnm",
  "mnbvcxz",
]);


function initPasswordToolkit() {
  const toolSelector = document.getElementById("toolSelector");

  const panels = {
    generator: document.getElementById("generatorTool"),
    checker: document.getElementById("checkerTool"),
    passphrase: document.getElementById("passphraseTool"),
    hash: document.getElementById("hashTool"),
  };

  const passwordLength = document.getElementById("passwordLength");
  const passwordQuantity = document.getElementById("passwordQuantity");
  const includeUppercase = document.getElementById("includeUppercase");
  const includeLowercase = document.getElementById("includeLowercase");
  const includeNumbers = document.getElementById("includeNumbers");
  const includeSymbols = document.getElementById("includeSymbols");
  const excludeSimilar = document.getElementById("excludeSimilar");
  const pronounceablePassword = document.getElementById(
    "pronounceablePassword",
  );

  const generatePasswordBtn = document.getElementById("generatePasswordBtn");
  const clearGeneratorBtn = document.getElementById("clearGeneratorBtn");
  const generatorResult = document.getElementById("generatorResult");
  const generatedPasswords = document.getElementById("generatedPasswords");
  const passwordHistoryBox = document.getElementById("passwordHistoryBox");
  const passwordHistoryList = document.getElementById("passwordHistoryList");
  const copyGeneratedBtn = document.getElementById("copyGeneratedBtn");
  const copyHistoryBtn = document.getElementById("copyHistoryBtn");
  const downloadPasswordsBtn = document.getElementById("downloadPasswordsBtn");
  const downloadPasswordsCsvBtn = document.getElementById(
    "downloadPasswordsCsvBtn",
  );
  const generatorMessage = document.getElementById("generatorMessage");

  const checkPasswordInput = document.getElementById("checkPasswordInput");
  const showPasswordToggle = document.getElementById("showPasswordToggle");
  const checkStrengthBtn = document.getElementById("checkStrengthBtn");
  const clearCheckerBtn = document.getElementById("clearCheckerBtn");
  const strengthFill = document.getElementById("strengthFill");
  const checkerResult = document.getElementById("checkerResult");
  const strengthLevel = document.getElementById("strengthLevel");
  const strengthScore = document.getElementById("strengthScore");
  const entropyBits = document.getElementById("entropyBits");
  const checkerMessage = document.getElementById("checkerMessage");

  const wordCount = document.getElementById("wordCount");
  const wordSeparator = document.getElementById("wordSeparator");
  const generatePassphraseBtn = document.getElementById(
    "generatePassphraseBtn",
  );
  const clearPassphraseBtn = document.getElementById("clearPassphraseBtn");
  const passphraseResult = document.getElementById("passphraseResult");
  const copyPassphraseBtn = document.getElementById("copyPassphraseBtn");
  const passphraseMessage = document.getElementById("passphraseMessage");

  const hashAlgorithm = document.getElementById("hashAlgorithm");
  const hashInput = document.getElementById("hashInput");
  const generateHashBtn = document.getElementById("generateHashBtn");
  const clearHashBtn = document.getElementById("clearHashBtn");
  const hashResult = document.getElementById("hashResult");
  const copyHashBtn = document.getElementById("copyHashBtn");
  const hashMessage = document.getElementById("hashMessage");

  const required = [
    toolSelector,
    ...Object.values(panels),
    passwordLength,
    passwordQuantity,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    pronounceablePassword,
    generatePasswordBtn,
    clearGeneratorBtn,
    generatorResult,
    generatedPasswords,
    passwordHistoryBox,
    passwordHistoryList,
    copyGeneratedBtn,
    copyHistoryBtn,
    downloadPasswordsBtn,
    downloadPasswordsCsvBtn,
    generatorMessage,
    checkPasswordInput,
    showPasswordToggle,
    checkStrengthBtn,
    clearCheckerBtn,
    strengthFill,
    checkerResult,
    strengthLevel,
    strengthScore,
    entropyBits,
    checkerMessage,
    wordCount,
    wordSeparator,
    generatePassphraseBtn,
    clearPassphraseBtn,
    passphraseResult,
    copyPassphraseBtn,
    passphraseMessage,
    hashAlgorithm,
    hashInput,
    generateHashBtn,
    clearHashBtn,
    hashResult,
    copyHashBtn,
    hashMessage,
  ];

  if (required.some((element) => !element)) {
    console.error("Password Toolkit: HTML and JS do not match.");
    return;
  }

  const cryptoApi = window.crypto;
  const encoder = new TextEncoder();

  let currentGeneratedPasswords = [];
  let passwordHistory = [];
  let currentPassphrase = "";
  let currentHash = "";

  function setMessage(element, text = "", type = "info") {
    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

    element.textContent = text;
    element.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      element.classList.add(`message-${safeType}`);
    }
  }

  function notify(element, text, type = "info") {
    setMessage(element, text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function getSecureRandomIndex(max) {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error("Invalid random range.");
    }

    if (!cryptoApi?.getRandomValues) {
      throw new Error("Secure random generation is unavailable.");
    }

    const limit = Math.floor(0x100000000 / max) * max;
    const values = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % max;
  }

  function pickRandom(source) {
    return source[getSecureRandomIndex(source.length)];
  }

  function shuffleSecure(items) {
    const copy = items.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = getSecureRandomIndex(index + 1);
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function switchTool() {
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });

    setMessage(generatorMessage);
    setMessage(checkerMessage);
    setMessage(passphraseMessage);
    setMessage(hashMessage);
  }

  function renderPasswordList(container, passwords) {
    container.replaceChildren();

    passwords.forEach((password, index) => {
      const item = document.createElement("div");

      item.className = "password-result-item";
      item.textContent = `${index + 1}. ${password}`;

      container.append(item);
    });
  }

  function generatePronounceable(
    length,
    {
      uppercaseEnabled,
      lowercaseEnabled,
      numbersEnabled,
      symbolsEnabled,
      excludeSimilarEnabled,
    },
  ) {
    if (!uppercaseEnabled && !lowercaseEnabled) {
      throw new Error(
        "Pronounceable passwords require uppercase or lowercase letters.",
      );
    }

    const requiredExtras =
      Number(numbersEnabled) + Number(symbolsEnabled);
    const letterCount = length - requiredExtras;

    if (letterCount < 2) {
      throw new Error(
        "Increase the password length for the selected pronounceable options.",
      );
    }

    const vowels = excludeSimilarEnabled ? "aeu" : "aeiou";
    const consonants = excludeSimilarEnabled
      ? "bcdfghjkmnpqrstvwxyz"
      : "bcdfghjklmnpqrstvwxyz";

    const letters = [];

    for (let index = 0; index < letterCount; index += 1) {
      letters.push(
        index % 2 === 0 ? pickRandom(consonants) : pickRandom(vowels),
      );
    }

    if (uppercaseEnabled && lowercaseEnabled) {
      for (let index = 0; index < letters.length; index += 1) {
        if (getSecureRandomIndex(2) === 1) {
          letters[index] = letters[index].toUpperCase();
        }
      }

      const uppercaseIndex = getSecureRandomIndex(letters.length);
      let lowercaseIndex = getSecureRandomIndex(letters.length - 1);

      if (lowercaseIndex >= uppercaseIndex) {
        lowercaseIndex += 1;
      }

      letters[uppercaseIndex] = letters[uppercaseIndex].toUpperCase();
      letters[lowercaseIndex] = letters[lowercaseIndex].toLowerCase();
    } else if (uppercaseEnabled) {
      for (let index = 0; index < letters.length; index += 1) {
        letters[index] = letters[index].toUpperCase();
      }
    }

    const extras = [];

    if (numbersEnabled) {
      extras.push(
        pickRandom(excludeSimilarEnabled ? "23456789" : "0123456789"),
      );
    }

    if (symbolsEnabled) {
      extras.push(pickRandom("!@#$%^&*()_-+=<>?/{}[]"));
    }

    return `${letters.join("")}${shuffleSecure(extras).join("")}`;
  }

  function generatePasswords() {
    const length = Number(passwordLength.value);
    const quantity = Number(passwordQuantity.value);

    if (!Number.isInteger(length) || length < 6 || length > 128) {
      notify(
        generatorMessage,
        "Password length must be between 6 and 128.",
        "error",
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      notify(generatorMessage, "Quantity must be between 1 and 100.", "error");
      return;
    }

    const similarPattern = /[OIl01]/g;

    const sets = [];

    if (includeUppercase.checked) {
      sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace(similarPattern, ""));
    }

    if (includeLowercase.checked) {
      sets.push("abcdefghijklmnopqrstuvwxyz".replace(similarPattern, ""));
    }

    if (includeNumbers.checked) {
      sets.push("0123456789".replace(similarPattern, ""));
    }

    if (includeSymbols.checked) {
      sets.push("!@#$%^&*()_-+=<>?/{}[]");
    }

    if (!excludeSimilar.checked) {
      sets.length = 0;

      if (includeUppercase.checked) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (includeLowercase.checked) sets.push("abcdefghijklmnopqrstuvwxyz");
      if (includeNumbers.checked) sets.push("0123456789");
      if (includeSymbols.checked) sets.push("!@#$%^&*()_-+=<>?/{}[]");
    }

    if (sets.length === 0) {
      notify(generatorMessage, "Select at least one character type.", "error");
      return;
    }

    if (!pronounceablePassword.checked && length < sets.length) {
      notify(
        generatorMessage,
        `Password length must be at least ${sets.length} characters for the selected options.`,
        "error",
      );
      return;
    }

    const allCharacters = sets.join("");
    const results = [];

    try {
      for (let count = 0; count < quantity; count += 1) {
        if (pronounceablePassword.checked) {
          results.push(
            generatePronounceable(length, {
              uppercaseEnabled: includeUppercase.checked,
              lowercaseEnabled: includeLowercase.checked,
              numbersEnabled: includeNumbers.checked,
              symbolsEnabled: includeSymbols.checked,
              excludeSimilarEnabled: excludeSimilar.checked,
            }),
          );
          continue;
        }

        const characters = sets.map(pickRandom);

        while (characters.length < length) {
          characters.push(pickRandom(allCharacters));
        }

        results.push(shuffleSecure(characters).join(""));
      }
    } catch (error) {
      notify(
        generatorMessage,
        error instanceof Error ? error.message : "Password generation failed.",
        "error",
      );
      return;
    }

    currentGeneratedPasswords = results;

    passwordHistory = [...results, ...passwordHistory].slice(0, 20);

    renderPasswordList(generatedPasswords, currentGeneratedPasswords);

    renderPasswordList(passwordHistoryList, passwordHistory);

    generatorResult.hidden = false;
    passwordHistoryBox.hidden = false;

    copyGeneratedBtn.disabled = false;
    copyHistoryBtn.disabled = false;
    downloadPasswordsBtn.disabled = false;
    downloadPasswordsCsvBtn.disabled = false;

    notify(
      generatorMessage,
      quantity === 1
        ? "Password generated successfully."
        : `${quantity} passwords generated successfully.`,
      "success",
    );
  }

  function clearGenerator() {
    passwordLength.value = "16";
    passwordQuantity.value = "1";
    includeUppercase.checked = true;
    includeLowercase.checked = true;
    includeNumbers.checked = true;
    includeSymbols.checked = true;
    excludeSimilar.checked = false;
    pronounceablePassword.checked = false;

    currentGeneratedPasswords = [];
    passwordHistory = [];

    generatedPasswords.replaceChildren();
    passwordHistoryList.replaceChildren();

    generatorResult.hidden = true;
    passwordHistoryBox.hidden = true;

    copyGeneratedBtn.disabled = true;
    copyHistoryBtn.disabled = true;
    downloadPasswordsBtn.disabled = true;
    downloadPasswordsCsvBtn.disabled = true;

    setMessage(generatorMessage);
    passwordLength.focus();
  }

  async function copyTextValue(text, messageElement) {
    if (!text) {
      notify(messageElement, "Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify(messageElement, "Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(text);
  }

  function downloadPasswordsTxt() {
    if (!passwordHistory.length) {
      notify(generatorMessage, "Generate passwords first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify(generatorMessage, "Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-passwords.txt",
      passwordHistory.join("\n"),
      "text/plain;charset=utf-8",
    );
  }

  function downloadPasswordsCsv() {
    if (!passwordHistory.length) {
      notify(generatorMessage, "Generate passwords first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify(generatorMessage, "Download utility is unavailable.", "error");
      return;
    }

    const csv = [
      "Index,Password",
      ...passwordHistory.map(
        (password, index) => `${index + 1},"${password.replace(/"/g, '""')}"`,
      ),
    ].join("\n");

    window.downloadFile("xavert-passwords.csv", csv, "text/csv;charset=utf-8");
  }

  function togglePasswordVisibility() {
    checkPasswordInput.type = showPasswordToggle.checked ? "text" : "password";
  }

  function normalizePasswordPattern(password) {
    return password
      .toLowerCase()
      .replace(/[@4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[5$]/g, "s")
      .replace(/[7+]/g, "t");
  }

  function hasPredictableSequence(password, minimumLength = 4) {
    const compact = password.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (compact.length < minimumLength) {
      return false;
    }

    for (
      let start = 0;
      start <= compact.length - minimumLength;
      start += 1
    ) {
      const fragment = compact.slice(start, start + minimumLength);

      if (
        PASSWORD_SEQUENCE_SOURCES.some((source) => source.includes(fragment))
      ) {
        return true;
      }
    }

    return false;
  }

  function calculateObservedEntropy(password) {
    const counts = new Map();

    for (const character of password) {
      counts.set(character, (counts.get(character) ?? 0) + 1);
    }

    let entropyPerCharacter = 0;

    for (const count of counts.values()) {
      const probability = count / password.length;
      entropyPerCharacter -= probability * Math.log2(probability);
    }

    return entropyPerCharacter * password.length;
  }

  function estimatePasswordMetrics(password) {
    let charsetSize = 0;

    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;

    const poolEntropy =
      password.length * Math.log2(Math.max(charsetSize, 1));
    const observedEntropy = calculateObservedEntropy(password);

    /*
     * The pool calculation assumes every position was chosen independently
     * from the full detected character set. Real user-created passwords often
     * contain patterns, so keep the estimate deliberately conservative.
     */
    let estimatedEntropy = Math.min(poolEntropy, observedEntropy + 20);

    const lower = password.toLowerCase();
    const normalized = normalizePasswordPattern(password);
    const compactNormalized = normalized.replace(/[^a-z0-9]/g, "");

    /*
     * Detect common bases even when the user adds predictable digits or
     * punctuation around them (for example, P@ssw0rd123!).
     */
    const edgeStripped = lower
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
      .replace(/^\d+|\d+$/g, "");
    const normalizedBase = normalizePasswordPattern(edgeStripped).replace(
      /[^a-z]/g,
      "",
    );

    const commonBases = [
      "password",
      "qwerty",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "dragon",
      "football",
      "iloveyou",
      "princess",
      "sunshine",
      "master",
      "login",
      "abc",
    ];

    const commonMatch =
      COMMON_PASSWORDS.has(lower) ||
      COMMON_PASSWORDS.has(normalized) ||
      COMMON_PASSWORDS.has(compactNormalized) ||
      commonBases.includes(normalizedBase);

    if (commonMatch) {
      estimatedEntropy = Math.min(estimatedEntropy, 8);
    }

    if (/^(.)\1+$/.test(password)) {
      estimatedEntropy = Math.min(estimatedEntropy, 4);
    } else {
      if (/(.)\1{2,}/.test(password)) {
        estimatedEntropy -= 10;
      }

      if (/(.{2,6})\1{1,}/.test(password)) {
        estimatedEntropy -= 12;
      }

      if (hasPredictableSequence(password)) {
        estimatedEntropy -= 12;
      }

      if (/(?:19|20)\d{2}/.test(password)) {
        estimatedEntropy -= 6;
      }

      const uniqueRatio = new Set(password).size / password.length;

      if (password.length >= 6 && uniqueRatio < 0.45) {
        estimatedEntropy -= 10;
      } else if (password.length >= 6 && uniqueRatio < 0.6) {
        estimatedEntropy -= 5;
      }
    }

    estimatedEntropy = Math.max(0, Math.round(estimatedEntropy));

    let score = Math.min(100, Math.round((estimatedEntropy / 80) * 100));

    if (password.length < 8) {
      score = Math.min(score, 30);
    } else if (password.length < 10) {
      score = Math.min(score, 50);
    } else if (password.length < 12) {
      score = Math.min(score, 70);
    }

    if (commonMatch) {
      score = Math.min(score, 10);
    }

    let level = "Very Weak";

    if (score >= 85) level = "Strong";
    else if (score >= 65) level = "Good";
    else if (score >= 40) level = "Moderate";
    else if (score >= 20) level = "Weak";

    return {
      score,
      level,
      entropy: estimatedEntropy,
    };
  }

  function checkPasswordStrength() {
    const password = checkPasswordInput.value;

    if (!password) {
      checkerResult.hidden = true;

      notify(checkerMessage, "Please enter a password.", "error");

      checkPasswordInput.focus();
      return;
    }

    const metrics = estimatePasswordMetrics(password);

    strengthFill.style.width = `${metrics.score}%`;

    strengthLevel.textContent = metrics.level;
    strengthScore.textContent = `${metrics.score}/100`;
    entropyBits.textContent = String(metrics.entropy);

    checkerResult.hidden = false;

    notify(checkerMessage, "Analysis completed.", "success");
  }

  function clearChecker() {
    checkPasswordInput.value = "";
    checkPasswordInput.type = "password";
    showPasswordToggle.checked = false;

    strengthFill.style.width = "0%";
    strengthLevel.textContent = "—";
    strengthScore.textContent = "0/100";
    entropyBits.textContent = "0";

    checkerResult.hidden = true;
    setMessage(checkerMessage);

    checkPasswordInput.focus();
  }

  function generatePassphrase() {
    const count = Number(wordCount.value);

    if (!Number.isInteger(count) || count < 4 || count > 10) {
      notify(
        passphraseMessage,
        "Word count must be between 4 and 10.",
        "error",
      );
      return;
    }

    const separator = wordSeparator.value;

    try {
      currentPassphrase = Array.from({ length: count }, () =>
        pickRandom(PASSPHRASE_WORDS),
      ).join(separator);
    } catch (error) {
      notify(
        passphraseMessage,
        error instanceof Error
          ? error.message
          : "Passphrase generation failed.",
        "error",
      );
      return;
    }

    passphraseResult.textContent = currentPassphrase;
    passphraseResult.hidden = false;
    copyPassphraseBtn.disabled = false;

    notify(
      passphraseMessage,
      "Passphrase generated successfully.",
      "success",
    );
  }

  function clearPassphrase() {
    wordCount.value = "6";
    wordSeparator.value = "-";
    currentPassphrase = "";

    passphraseResult.textContent = "";
    passphraseResult.hidden = true;
    copyPassphraseBtn.disabled = true;

    setMessage(passphraseMessage);
    wordCount.focus();
  }

  async function generateHash() {
    const text = hashInput.value;

    if (!text) {
      hashResult.hidden = true;

      notify(hashMessage, "Please enter text.", "error");

      hashInput.focus();
      return;
    }

    if (!cryptoApi?.subtle) {
      notify(
        hashMessage,
        "Web Crypto is unavailable in this browser context.",
        "error",
      );
      return;
    }

    generateHashBtn.disabled = true;

    try {
      const buffer = encoder.encode(text);

      const hashBuffer = await cryptoApi.subtle.digest(
        hashAlgorithm.value,
        buffer,
      );

      currentHash = Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      hashResult.textContent = currentHash;
      hashResult.hidden = false;
      copyHashBtn.disabled = false;

      notify(hashMessage, `${hashAlgorithm.value} hash generated.`, "success");
    } catch (error) {
      currentHash = "";
      hashResult.textContent = "";
      hashResult.hidden = true;
      copyHashBtn.disabled = true;

      notify(
        hashMessage,
        error instanceof Error ? error.message : "Hash generation failed.",
        "error",
      );
    } finally {
      generateHashBtn.disabled = false;
    }
  }

  function clearHash() {
    hashInput.value = "";
    hashAlgorithm.value = "SHA-256";
    currentHash = "";

    hashResult.textContent = "";
    hashResult.hidden = true;
    copyHashBtn.disabled = true;

    setMessage(hashMessage);
    hashInput.focus();
  }

  function invalidateGenerator() {
    if (currentGeneratedPasswords.length || passwordHistory.length) {
      currentGeneratedPasswords = [];
      generatedPasswords.replaceChildren();
      generatorResult.hidden = true;
      copyGeneratedBtn.disabled = true;
      downloadPasswordsBtn.disabled = true;
      downloadPasswordsCsvBtn.disabled = true;
    }

    setMessage(generatorMessage);
  }

  function invalidateChecker() {
    strengthFill.style.width = "0%";
    strengthLevel.textContent = "—";
    strengthScore.textContent = "0/100";
    entropyBits.textContent = "0";
    checkerResult.hidden = true;
    setMessage(checkerMessage);
  }

  function invalidatePassphrase() {
    currentPassphrase = "";
    passphraseResult.textContent = "";
    passphraseResult.hidden = true;
    copyPassphraseBtn.disabled = true;
    setMessage(passphraseMessage);
  }

  function invalidateHash() {
    currentHash = "";
    hashResult.textContent = "";
    hashResult.hidden = true;
    copyHashBtn.disabled = true;
    setMessage(hashMessage);
  }

  toolSelector.addEventListener("change", switchTool);

  [
    passwordLength,
    passwordQuantity,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    pronounceablePassword,
  ].forEach((element) => {
    element.addEventListener(
      element.type === "checkbox" ? "change" : "input",
      invalidateGenerator,
    );
  });

  checkPasswordInput.addEventListener("input", invalidateChecker);

  wordCount.addEventListener("input", invalidatePassphrase);
  wordSeparator.addEventListener("input", invalidatePassphrase);

  hashAlgorithm.addEventListener("change", invalidateHash);
  hashInput.addEventListener("input", invalidateHash);

  generatePasswordBtn.addEventListener("click", generatePasswords);
  clearGeneratorBtn.addEventListener("click", clearGenerator);

  copyGeneratedBtn.addEventListener("click", () => {
    void copyTextValue(currentGeneratedPasswords.join("\n"), generatorMessage);
  });

  copyHistoryBtn.addEventListener("click", () => {
    void copyTextValue(passwordHistory.join("\n"), generatorMessage);
  });

  downloadPasswordsBtn.addEventListener("click", downloadPasswordsTxt);
  downloadPasswordsCsvBtn.addEventListener("click", downloadPasswordsCsv);

  showPasswordToggle.addEventListener("change", togglePasswordVisibility);
  checkStrengthBtn.addEventListener("click", checkPasswordStrength);
  clearCheckerBtn.addEventListener("click", clearChecker);

  generatePassphraseBtn.addEventListener("click", generatePassphrase);
  clearPassphraseBtn.addEventListener("click", clearPassphrase);

  copyPassphraseBtn.addEventListener("click", () => {
    void copyTextValue(currentPassphrase, passphraseMessage);
  });

  generateHashBtn.addEventListener("click", () => {
    void generateHash();
  });

  clearHashBtn.addEventListener("click", clearHash);

  copyHashBtn.addEventListener("click", () => {
    void copyTextValue(currentHash, hashMessage);
  });

  copyGeneratedBtn.disabled = true;
  copyHistoryBtn.disabled = true;
  downloadPasswordsBtn.disabled = true;
  downloadPasswordsCsvBtn.disabled = true;
  copyPassphraseBtn.disabled = true;
  copyHashBtn.disabled = true;

  switchTool();
}

initPasswordToolkit();
