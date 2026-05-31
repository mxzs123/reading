import { NextRequest } from "next/server";
import {
  syncDataStores,
  type SyncDirection,
  type SyncScope,
} from "@/lib/dataStore/sync";

const DIRECTIONS: SyncDirection[] = ["local-to-cloud", "cloud-to-local"];
const SCOPES: SyncScope[] = ["articles", "settings"];

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as {
      direction?: SyncDirection;
      scopes?: SyncScope[];
      articleIds?: string[];
    };

    if (!body.direction || !DIRECTIONS.includes(body.direction)) {
      return Response.json({ error: "同步方向无效" }, { status: 400 });
    }

    const scopes = (body.scopes ?? []).filter((scope) =>
      SCOPES.includes(scope)
    );
    if (scopes.length === 0) {
      return Response.json({ error: "请选择同步范围" }, { status: 400 });
    }

    const result = await syncDataStores({
      direction: body.direction,
      scopes,
      articleIds: body.articleIds,
    });

    return Response.json(result);
  } catch (error) {
    console.error("同步失败", error);
    return Response.json({ error: "同步失败" }, { status: 500 });
  }
}
