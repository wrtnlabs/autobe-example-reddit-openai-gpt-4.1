import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a banned word or phrase from moderation list
 * (community_platform_banned_words table).
 *
 * This operation permanently removes a banned word or phrase from the system's
 * content moderation dictionary. It acts on the community_platform_banned_words
 * table, supporting soft deletion by setting the 'deleted_at' timestamp. This
 * ensures that the word or phrase is no longer considered during automatic
 * moderation, but retains an audit trail for compliance, reversibility, and
 * historical reporting. Only admin users can perform this operation. The action
 * is fully audited, and deleted phrases are excluded from future enforcement
 * until restored or recreated. This operation does NOT physically erase the
 * row, satisfying the requirement for reversibility and moderation history.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the soft delete
 * @param props.bannedWordId - Unique identifier of the banned word or phrase to
 *   remove
 * @returns Void
 * @throws {Error} When the banned word does not exist or is already soft
 *   deleted
 */
export async function delete__communityPlatform_admin_bannedWords_$bannedWordId(props: {
  admin: AdminPayload;
  bannedWordId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, bannedWordId } = props;

  // Verify banned word exists and is not already soft-deleted
  const bannedWord =
    await MyGlobal.prisma.community_platform_banned_words.findFirst({
      where: {
        id: bannedWordId,
        deleted_at: null,
      },
    });
  if (!bannedWord) {
    throw new Error("Banned word not found or already deleted");
  }

  // Soft-delete by setting deleted_at to current time ISO string
  await MyGlobal.prisma.community_platform_banned_words.update({
    where: { id: bannedWordId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Operation is void, nothing to return
}
