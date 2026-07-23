import * as deepl from "deepl-node";
import type { AppLanguage } from "@/lib/i18n/languages";

const DEEPL_TARGET: Record<AppLanguage, deepl.TargetLanguageCode> = {
  de: "de",
  en: "en-GB",
  tr: "tr",
  sq: "sq",
};

const DEEPL_SOURCE: Record<AppLanguage, deepl.SourceLanguageCode> = {
  de: "de",
  en: "en",
  tr: "tr",
  sq: "sq",
};

let translator: deepl.Translator | null = null;

function getDeepLApiKey() {
  return process.env.DEEPL_API_KEY?.trim() ?? "";
}

export function isDeepLConfigured() {
  return getDeepLApiKey().length > 0;
}

export function getDeepLTranslator() {
  const authKey = getDeepLApiKey();
  if (!authKey) {
    return null;
  }

  if (!translator) {
    const options: deepl.TranslatorOptions = {};

    if (process.env.DEEPL_SERVER_URL) {
      options.serverUrl = process.env.DEEPL_SERVER_URL;
    } else if (
      process.env.DEEPL_API_FREE === "1" ||
      process.env.DEEPL_API_FREE === "true" ||
      authKey.endsWith(":fx")
    ) {
      options.serverUrl = "https://api-free.deepl.com";
    }

    translator = new deepl.Translator(authKey, options);
  }

  return translator;
}

export async function translateHealthcareText(
  text: string,
  targetLanguage: AppLanguage,
  sourceLanguage?: AppLanguage,
) {
  const [translated] = await translateHealthcareTexts(
    [text],
    targetLanguage,
    sourceLanguage,
  );
  return translated;
}

export async function translateHealthcareTexts(
  texts: string[],
  targetLanguage: AppLanguage,
  sourceLanguage?: AppLanguage,
) {
  const deeplClient = getDeepLTranslator();
  if (!deeplClient) {
    throw new Error("DEEPL_NOT_CONFIGURED");
  }

  if (texts.length === 0) {
    return [];
  }

  const batchSize = 40;
  const translated: string[] = [];

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize);
    const results = await deeplClient.translateText(
      batch,
      sourceLanguage ? DEEPL_SOURCE[sourceLanguage] : null,
      DEEPL_TARGET[targetLanguage],
      {
        preserveFormatting: true,
        context:
          "Noor healthcare app lab result analysis for patients and families. Translate completely into the target language. Medical explanations must be fully translated.",
      },
    );

    const batchResults = Array.isArray(results) ? results : [results];
    translated.push(...batchResults.map((entry) => entry.text));
  }

  return translated;
}
