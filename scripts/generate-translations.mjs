import * as deepl from "deepl-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const germanPath = path.join(rootDir, "public/locales/de/common.json");

const targetLanguages = [
  { code: "en", deeplCode: "en-GB", name: "English" },
  { code: "tr", deeplCode: "tr", name: "Turkish" },
  { code: "sq", deeplCode: "sq", name: "Albanian" },
];

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

loadEnvFile(".env.local");
loadEnvFile(".env");

const DEEPL_API_KEY = process.env.DEEPL_API_KEY?.trim();

const germanStrings = JSON.parse(fs.readFileSync(germanPath, "utf8"));

function loadEnvFile(filename) {
  const envPath = path.join(rootDir, filename);
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function protectPlaceholders(text) {
  const placeholders = [];

  const protectedText = text.replace(PLACEHOLDER_REGEX, (match) => {
    const token = `NOORPH${placeholders.length}NOOR`;
    placeholders.push(match);
    return token;
  });

  return { text: protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return placeholders.reduce((result, placeholder, index) => {
    return result.replaceAll(`NOORPH${index}NOOR`, placeholder);
  }, text);
}

function createTranslator(authKey) {
  const options = {};

  if (process.env.DEEPL_SERVER_URL) {
    options.serverUrl = process.env.DEEPL_SERVER_URL;
  } else if (
    process.env.DEEPL_API_FREE === "1" ||
    process.env.DEEPL_API_FREE === "true"
  ) {
    options.serverUrl = "https://api-free.deepl.com";
  } else if (authKey.endsWith(":fx")) {
    options.serverUrl = "https://api-free.deepl.com";
  }

  return new deepl.Translator(authKey, options);
}

function validateAuthKey(authKey) {
  if (!authKey) {
    console.error(
      [
        "DEEPL_API_KEY is missing.",
        "",
        "Option A — inline:",
        "  DEEPL_API_KEY=your-key node scripts/generate-translations.mjs",
        "",
        "Option B — .env.local in project root:",
        "  DEEPL_API_KEY=your-key",
        "",
        "Get a free key at https://www.deepl.com/pro-api",
      ].join("\n"),
    );
    process.exit(1);
  }

  if (/your_.*key|placeholder|example\.com|replace[-_]?me/i.test(authKey)) {
    console.error(
      "DEEPL_API_KEY looks like a placeholder. Paste your real key from https://www.deepl.com/pro-api",
    );
    process.exit(1);
  }
}

async function verifyTranslator(translator, authKey) {
  try {
    const usage = await translator.getUsage();
    const used = usage.character?.count ?? "?";
    const limit = usage.character?.limit ?? "?";
    const endpoint =
      authKey.endsWith(":fx") ||
      process.env.DEEPL_API_FREE === "1" ||
      process.env.DEEPL_API_FREE === "true" ||
      process.env.DEEPL_SERVER_URL?.includes("api-free")
        ? "api-free.deepl.com"
        : "api.deepl.com";

    console.log(`DeepL OK (${endpoint}) — ${used} / ${limit} characters used this period.`);
  } catch (error) {
    if (error?.name === "AuthorizationError") {
      console.error(
        [
          "DeepL authorization failed (403 Forbidden).",
          "",
          "Checklist:",
          "1. Use the exact API key from DeepL → Account → API keys",
          "2. Free-plan keys usually end with ':fx'",
          "3. If you have a free key without ':fx', run:",
          "     DEEPL_API_FREE=1 node scripts/generate-translations.mjs",
          "4. Do not wrap the key in quotes when exporting in zsh unless needed",
          "5. Create a new API key if the old one was revoked",
        ].join("\n"),
      );
      process.exit(1);
    }

    throw error;
  }
}

async function translateAll() {
  validateAuthKey(DEEPL_API_KEY);

  const translator = createTranslator(DEEPL_API_KEY);
  await verifyTranslator(translator, DEEPL_API_KEY);

  for (const lang of targetLanguages) {
    console.log(`Translating to ${lang.name}...`);

    const translated = {};
    const keys = Object.keys(germanStrings);
    const protectedEntries = Object.values(germanStrings).map(protectPlaceholders);
    const batchSize = 40;

    for (let start = 0; start < keys.length; start += batchSize) {
      const batchKeys = keys.slice(start, start + batchSize);
      const batchEntries = protectedEntries.slice(start, start + batchSize);
      const batchValues = batchEntries.map((entry) => entry.text);

      const results = await translator.translateText(
        batchValues,
        "de",
        lang.deeplCode,
        {
          preserveFormatting: true,
          context:
            "Noor is a healthcare app for patients and families. Dosen and Dosis mean medication doses, not tin containers.",
        },
      );

      batchKeys.forEach((key, index) => {
        translated[key] = restorePlaceholders(
          results[index].text,
          batchEntries[index].placeholders,
        );
      });

      process.stdout.write(
        `  ${Math.min(start + batchSize, keys.length)}/${keys.length}\r`,
      );
    }

    console.log(`  ${keys.length}/${keys.length}`);

    const dir = path.join(rootDir, "public/locales", lang.code);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(
      path.join(dir, "common.json"),
      `${JSON.stringify(translated, null, 2)}\n`,
    );

    console.log(`✓ ${lang.name} translation saved`);
  }

  console.log("All translations complete!");
}

translateAll().catch((error) => {
  console.error(error);
  process.exit(1);
});
