import { deleteR2Folder } from "@/lib/r2";

export async function deleteArticleAudioFiles(articleId: string): Promise<void> {
  try {
    await deleteR2Folder(`audio/${articleId}/`);
  } catch {
    console.warn("删除文章音频文件失败", { articleId });
  }
}
