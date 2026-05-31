import { jsonRequestInit, readResponseErrorMessage } from "./http";

type JsonRequestInit = Omit<RequestInit, "body" | "method">;
type JsonMethod = "POST" | "PUT" | "PATCH";

export class HttpRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

export async function request(
  input: RequestInfo | URL,
  init: RequestInit,
  errorMessage: string
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.ok) return response;

  const serverMessage = await readResponseErrorMessage(response);
  throw new HttpRequestError(serverMessage || errorMessage, response.status);
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  errorMessage: string
): Promise<T> {
  const response = await request(input, init, errorMessage);
  return response.json() as Promise<T>;
}

export async function requestVoid(
  input: RequestInfo | URL,
  init: RequestInit,
  errorMessage: string
): Promise<void> {
  await request(input, init, errorMessage);
}

export async function requestJsonBody<T>(
  input: RequestInfo | URL,
  method: JsonMethod,
  body: unknown,
  errorMessage: string,
  init: JsonRequestInit = {}
): Promise<T> {
  return requestJson<T>(
    input,
    buildJsonInit(method, body, init),
    errorMessage
  );
}

export async function postJson<T>(
  input: RequestInfo | URL,
  body: unknown,
  errorMessage: string,
  init: JsonRequestInit = {}
): Promise<T> {
  return requestJsonBody<T>(input, "POST", body, errorMessage, init);
}

export async function postJsonResponse(
  input: RequestInfo | URL,
  body: unknown,
  errorMessage: string,
  init: JsonRequestInit = {}
): Promise<Response> {
  return request(input, buildJsonInit("POST", body, init), errorMessage);
}

function buildJsonInit(
  method: JsonMethod,
  body: unknown,
  init: JsonRequestInit
): RequestInit {
  return jsonRequestInit(body, { ...init, method });
}
