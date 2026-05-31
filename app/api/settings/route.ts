import { NextRequest } from "next/server";
import { getDataStore } from "@/lib/dataStore";
import { readJsonRequest, withApiError } from "@/lib/http";
import {
  DEFAULT_SETTINGS,
  removeSensitiveSettings,
  type ReaderSettings,
} from "@/lib/settings";

export async function GET() {
  return withApiError(async () => {
    const settings = await getDataStore().settings.getSettings();

    if (!settings || Object.keys(settings).length === 0) {
      return Response.json(removeSensitiveSettings(DEFAULT_SETTINGS));
    }

    return Response.json(removeSensitiveSettings(settings));
  }, "获取设置失败");
}

export async function PUT(request: NextRequest) {
  return withApiError(async () => {
    const json = await readJsonRequest<Partial<ReaderSettings>>(request);
    if (!json.ok) return json.response;

    const safeSettings = removeSensitiveSettings(json.body);

    await getDataStore().settings.updateSettings(safeSettings);

    return Response.json({ success: true });
  }, "保存设置失败");
}
