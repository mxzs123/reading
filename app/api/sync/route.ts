import { NextRequest } from "next/server";
import { parseSyncOptions, syncDataStores } from "@/lib/dataStore/sync";
import { errorResponse, readJsonRequest, withApiError } from "@/lib/http";

export async function POST(request: NextRequest): Promise<Response> {
  return withApiError(async () => {
    const json = await readJsonRequest<unknown>(request);
    if (!json.ok) return json.response;

    const syncOptions = parseSyncOptions(json.body);
    if (!syncOptions.ok) return errorResponse(syncOptions.error, 400);

    const result = await syncDataStores(syncOptions.options);

    return Response.json(result);
  }, "同步失败");
}
