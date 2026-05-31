import { NextRequest } from "next/server";
import {
  clampAiMaxTokens,
  normalizeAiExplainText,
  type AiExplainRequestBody,
} from "@/lib/aiExplain";
import { isAllowedDeepSeekModel } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = [
  "你是英文阅读助手。",
  "用简洁中文解释目标英文在上下文里的意思。",
  "优先覆盖语境义、关键搭配、自然中文表达。",
  "目标是单词时，给出词性、语境义和一个短例句。",
].join("");

interface DeepSeekStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function POST(request: NextRequest) {
  let body: Partial<AiExplainRequestBody>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const text =
    typeof body.text === "string" ? normalizeAiExplainText(body.text) : "";
  const paragraphText =
    typeof body.paragraphText === "string" ? body.paragraphText.trim() : "";
  const beforeContext =
    typeof body.beforeContext === "string" ? body.beforeContext.trim() : "";
  const afterContext =
    typeof body.afterContext === "string" ? body.afterContext.trim() : "";
  const model = isAllowedDeepSeekModel(body.model) ? body.model : null;
  const maxTokens = clampAiMaxTokens(
    typeof body.maxTokens === "number" ? body.maxTokens : 900
  );

  if (!apiKey) {
    return Response.json({ error: "缺少 DeepSeek API Key" }, { status: 400 });
  }

  if (!text) {
    return Response.json({ error: "缺少要解释的文本" }, { status: 400 });
  }

  if (!model) {
    return Response.json({ error: "模型参数错误" }, { status: 400 });
  }

  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildPrompt({
          text,
          paragraphText,
          beforeContext,
          afterContext,
        }),
      },
    ],
    thinking: { type: "disabled" },
    temperature: 0.2,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: false },
  };

  try {
    const upstream = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok) {
      console.warn("DeepSeek explain failed", { status: upstream.status });
      return Response.json(
        { error: `DeepSeek 请求失败（状态码 ${upstream.status}）` },
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return Response.json({ error: "模型响应为空" }, { status: 502 });
    }

    return new Response(createTextStream(upstream.body), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return Response.json({ error: "请求已取消" }, { status: 499 });
    }
    console.error("DeepSeek explain request failed", error);
    return Response.json({ error: "模型请求失败" }, { status: 500 });
  }
}

function buildPrompt(target: {
  text: string;
  paragraphText: string;
  beforeContext: string;
  afterContext: string;
}): string {
  const contextChars = 1800;
  return [
    `目标英文：\n${target.text}`,
    `当前段落：\n${limitBlock(target.paragraphText, 3200) || "（空）"}`,
    `前文：\n${limitBlock(target.beforeContext, contextChars) || "（空）"}`,
    `后文：\n${limitBlock(target.afterContext, contextChars) || "（空）"}`,
  ].join("\n\n");
}

function limitBlock(value: string, maxLength: number): string {
  return value.replace(/\s+\n/g, "\n").trim().slice(0, maxLength);
}

function createTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      reader = body.getReader();
      let buffer = "";
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const result = readStreamLine(line);
            if (result.done) {
              close();
              await reader.cancel();
              return;
            }
            if (result.text) {
              controller.enqueue(encoder.encode(result.text));
            }
          }
        }

        const tail = decoder.decode();
        if (tail) {
          buffer += tail;
        }
        if (buffer.trim()) {
          const result = readStreamLine(buffer);
          if (result.text) {
            controller.enqueue(encoder.encode(result.text));
          }
        }
        close();
      } catch (error) {
        if (closed) return;
        controller.error(error);
      } finally {
        reader?.releaseLock();
        reader = null;
      }
    },
    cancel() {
      return reader?.cancel();
    },
  });
}

function readStreamLine(line: string): { done: boolean; text?: string } {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return { done: false };
  if (!trimmed.startsWith("data:")) return { done: false };

  const data = trimmed.slice("data:".length).trim();
  if (data === "[DONE]") return { done: true };

  let chunk: DeepSeekStreamChunk;
  try {
    chunk = JSON.parse(data) as DeepSeekStreamChunk;
  } catch {
    throw new Error("模型响应解析失败");
  }

  if (chunk.error?.message) {
    throw new Error(chunk.error.message);
  }

  const text = chunk.choices?.[0]?.delta?.content;
  return { done: false, text: text || undefined };
}
