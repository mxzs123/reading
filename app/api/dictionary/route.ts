import { NextRequest } from "next/server";

// 尽量让词典查询在靠近日本/亚太的边缘节点执行，减少跨境延迟
export const runtime = "edge";
export const preferredRegion = ["hnd1", "icn1", "hkg1", "sin1"];

const YOUDAO_ENDPOINT = "https://dict.youdao.com/jsonapi";

interface DictionaryMeaning {
  pos?: string | null;
  translation: string;
}

interface DictionaryResult {
  phonetics?: {
    us?: string;
    uk?: string;
  };
  meanings: DictionaryMeaning[];
  webTranslations: Array<{
    key: string;
    translations: string[];
  }>;
}

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word");

  if (!word) {
    return Response.json({ error: "缺少 word 参数" }, { status: 400 });
  }

  const url = `${YOUDAO_ENDPOINT}?q=${encodeURIComponent(word)}&doctype=json`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
        Referer: "https://dict.youdao.com/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "词典服务暂时不可用" },
        { status: response.status }
      );
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const data = normalizeYoudaoResponse(raw);

    return Response.json({ word, ...data });
  } catch (error) {
    console.error("Youdao 查询失败", error);
    return Response.json({ error: "查询失败，请稍后重试" }, { status: 500 });
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toRecordArray(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is UnknownRecord => isRecord(item));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeYoudaoResponse(raw: Record<string, unknown>): DictionaryResult {
  const result: DictionaryResult = {
    meanings: [],
    webTranslations: [],
  };

  const ec = isRecord(raw.ec) ? raw.ec : undefined;
  const ecWordList = ec ? toRecordArray(ec.word) : [];
  const ecWord = ecWordList[0];

  if (ecWord) {
    const us = readString(ecWord.usphone);
    const uk = readString(ecWord.ukphone);

    if (us || uk) {
      result.phonetics = { us, uk };
    }

    const trs = toRecordArray(ecWord.trs);
    trs.forEach((entry) => {
      const pos = readString(entry.pos);
      const translations: string[] = [];

      const trItems = toRecordArray(entry.tr);
      trItems.forEach((trItem) => {
        const l = isRecord(trItem.l) ? trItem.l : undefined;
        const lines = l ? toStringArray(l.i) : [];
        lines.forEach((line) => {
          translations.push(line);
        });
      });

      translations
        .filter((text) => text.trim().length > 0)
        .forEach((text) => {
          result.meanings.push({
            pos,
            translation: text.replace(/\s+/g, " ").trim(),
          });
        });
    });
  }

  const webTransRoot = isRecord(raw.web_trans) ? raw.web_trans : undefined;
  const webTransArray = webTransRoot
    ? toRecordArray(webTransRoot["web-translation"])
    : [];

  if (webTransArray.length > 0) {
    webTransArray.forEach((item) => {
      const key = readString(item.key);
      const values: string[] = [];

      const translations = toRecordArray(item.trans);
      translations.forEach((subItem) => {
        const summary = isRecord(subItem.summary) ? subItem.summary : undefined;
        const summaryLines = summary ? toStringArray(summary.line) : [];
        summaryLines.forEach((line) => {
          values.push(line.replace(/<[^>]*>/g, ""));
        });

        const value = readString(subItem.value);
        if (value) {
          values.push(value);
        }
      });

      if (key && values.length > 0) {
        result.webTranslations.push({
          key,
          translations: Array.from(new Set(values.map((v) => v.trim()))),
        });
      }
    });
  }

  return result;
}
