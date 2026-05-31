const REQUEST_JSON_ERROR = "请求格式错误";
const REQUEST_FORM_DATA_ERROR = "请求表单格式错误";
export const TTS_GENERATION_ERROR = "音频生成失败，请稍后重试";
export const TTS_AUDIO_MISSING_ERROR = "未收到音频数据";

const RESPONSE_MESSAGE_LIMIT = 300;

type JsonRequestInit = Omit<RequestInit, "body">;

export function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

export function jsonRequestInit(body: unknown, init: JsonRequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  };
}

export async function withApiError(
  action: () => Promise<Response>,
  message: string
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    console.error(message, error);
    return errorResponse(message, 500);
  }
}

export async function runApiStep<T>(
  action: () => Promise<T>,
  message: string,
  status: number
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: await action() };
  } catch (error) {
    console.error(message, error);
    return { ok: false, response: errorResponse(message, status) };
  }
}

export async function readJsonRequest<T>(
  request: Request
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: (await request.json()) as T };
  } catch {
    return { ok: false, response: errorResponse(REQUEST_JSON_ERROR, 400) };
  }
}

export async function readFormDataRequest(
  request: Request,
  error = REQUEST_FORM_DATA_ERROR
): Promise<{ ok: true; formData: FormData } | { ok: false; response: Response }> {
  try {
    return { ok: true, formData: await request.formData() };
  } catch {
    return { ok: false, response: errorResponse(error, 400) };
  }
}

export async function readResponseErrorMessage(
  response: Response,
  extract?: (payload: unknown) => string
): Promise<string> {
  const payload = await readResponsePayload(response);
  if (payload === null || payload === undefined) return "";

  if (typeof payload === "string") {
    return truncateResponseMessage(payload);
  }

  const extracted = extract?.(payload) || extractErrorMessage(payload);
  if (extracted) {
    return truncateResponseMessage(extracted);
  }

  const serialized = JSON.stringify(payload);
  return truncateResponseMessage(serialized);
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json().catch(() => null)
    : response.text().catch(() => "");
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : "";
}

function truncateResponseMessage(value: string | undefined): string {
  return value ? value.slice(0, RESPONSE_MESSAGE_LIMIT) : "";
}
