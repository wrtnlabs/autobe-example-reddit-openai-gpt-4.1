import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a banned word or phrase for moderation purposes
 * (community_platform_banned_words table)
 *
 * Update the details of an existing banned word or phrase as part of the
 * system's content moderation dictionary. This operation supports modifying the
 * phrase, toggling its enabled state, or updating its category. Strict
 * validation ensures phrase uniqueness and correct category association. Only
 * admin users can execute this operation, and all changes are audit logged for
 * moderation traceability. Modifications may take immediate effect, impacting
 * real-time content submissions and moderation sweeps. If the phrase is
 * updated, the new phrase is checked for duplicates before applying changes.
 * Related moderation features reference this data live. All activities are
 * recorded in the audit logs for review.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the update
 * @param props.bannedWordId - Unique identifier for the banned word or phrase
 *   to update
 * @param props.body - Update payload: phrase, category, or enabled fields (all
 *   optional)
 * @returns The updated banned word entity, with all details
 * @throws {Error} When not found, soft-deleted, or phrase uniqueness conflict
 *   occurs
 */
export async function put__communityPlatform_admin_bannedWords_$bannedWordId(props: {
  admin: AdminPayload;
  bannedWordId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBannedWord.IUpdate;
}): Promise<ICommunityPlatformBannedWord> {
  const { admin, bannedWordId, body } = props;

  // 1. Fetch banned word (only not soft-deleted)
  const row = await MyGlobal.prisma.community_platform_banned_words.findFirst({
    where: {
      id: bannedWordId,
      deleted_at: null,
    },
  });
  if (!row) throw new Error("Banned word not found");

  // 2. Enforce phrase uniqueness if changing phrase
  if (
    typeof body.phrase === "string" &&
    body.phrase.trim() !== "" &&
    body.phrase !== row.phrase
  ) {
    const exists =
      await MyGlobal.prisma.community_platform_banned_words.findFirst({
        where: {
          phrase: body.phrase,
          deleted_at: null,
          id: { not: bannedWordId },
        },
      });
    if (exists) throw new Error("Duplicate banned phrase not allowed");
  }

  // 3. Update specified fields (any of: phrase, category, enabled)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_banned_words.update({
    where: { id: bannedWordId },
    data: {
      phrase: body.phrase ?? undefined,
      category: body.category ?? undefined,
      enabled: body.enabled ?? undefined,
      updated_at: now,
    },
  });

  // 4. Return field-safe DTO, all dates as ISO strings, category always null if missing
  return {
    id: updated.id,
    phrase: updated.phrase,
    category: updated.category ?? null,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
