import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DEFAULT_SETTINGS, ReaderSettings } from "@/lib/settings";

const SETTINGS_KEY = "settings:global";

// 不同步到云端的敏感字段
const SENSITIVE_FIELDS = ["azureApiKey", "elevenApiKey", "geminiApiKey"] as const;

type SafeSettings = Omit<ReaderSettings, (typeof SENSITIVE_FIELDS)[number]>;

function removeSensitiveFields(settings: Partial<ReaderSettings>): SafeSettings {
  const safe = { ...settings };
  for (const field of SENSITIVE_FIELDS) {
    delete safe[field];
  }
  return safe as SafeSettings;
}

// GET /api/settings - 获取设置
export async function GET() {
  try {
    const settings = await kv.hgetall(SETTINGS_KEY);

    if (!settings || Object.keys(settings).length === 0) {
      // 返回默认设置（不含敏感字段）
      return Response.json(removeSensitiveFields(DEFAULT_SETTINGS));
    }

    return Response.json(settings);
  } catch (error) {
    console.error("获取设置失败:", error);
    return Response.json({ error: "获取设置失败" }, { status: 500 });
  }
}

// PUT /api/settings - 更新设置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 移除敏感字段后保存
    const safeSettings = removeSensitiveFields(body);

    await kv.hset(SETTINGS_KEY, safeSettings);

    return Response.json({ success: true });
  } catch (error) {
    console.error("保存设置失败:", error);
    return Response.json({ error: "保存设置失败" }, { status: 500 });
  }
}
