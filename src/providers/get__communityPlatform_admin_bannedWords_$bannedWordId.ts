import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves details for a specific banned word moderation entry by UUID.
 *
 * Returns full details for an individual banned word, including phrase,
 * moderation category, enabled/disabled flag, and all audit timestamps. Soft
 * deleted records are omitted from normal admin flows (deleted_at=null only).
 * Used for moderation UI and detailed audit/inspection. Admin authentication is
 * required.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.bannedWordId - The UUID of the banned word entry to retrieve
 * @returns Full information for a single banned word entity, including phrase,
 *   category, enabled flag, created/updated timestamps, and ID.
 * @throws {Error} When the banned word does not exist or has been soft deleted
 */
export async function get__communityPlatform_admin_bannedWords_$bannedWordId(props: {
  admin: AdminPayload;
  bannedWordId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBannedWord> {
  const { admin, bannedWordId } = props;
  // Admin authentication is required. Presence of 'admin' param enforces this boundary.
  const record =
    await MyGlobal.prisma.community_platform_banned_words.findFirst({
      where: {
        id: bannedWordId,
        deleted_at: null,
      },
    });
  if (!record) throw new Error("Banned word not found");
  return {
    id: record.id,
    phrase: record.phrase,
    category: record.category ?? null,
    enabled: record.enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
