import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new banned word or phrase for platform content moderation.
 *
 * Allows privileged admin users to insert a new banned word or phrase for
 * enforcement throughout the platform. Each banned word must have a unique
 * phrase and may be assigned a moderation category for reporting. Words can be
 * enabled or disabled for moderation, providing temporary control over
 * enforcement without database deletion.
 *
 * Applications include content moderation automation, report management, and
 * rapid ban/unban workflow. All entries are tracked for audit and enforcement.
 * Operation fails with a conflict if the phrase already exists in the system.
 * Closely related endpoints include listing, detail, update (enable/disable),
 * and delete for banned words.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (must be admin, verified
 *   upstack)
 * @param props.body - Data required to create a new banned word (phrase,
 *   category, enabled state)
 * @returns The newly created banned word entry with metadata
 * @throws {Error} When a banned word with the same phrase already exists (409
 *   Conflict)
 */
export async function post__communityPlatform_admin_bannedWords(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedWord.ICreate;
}): Promise<ICommunityPlatformBannedWord> {
  const { body } = props;
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.community_platform_banned_words.create({
        data: {
          id,
          phrase: body.phrase,
          category: body.category ?? null,
          enabled: body.enabled,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      phrase: created.phrase,
      category: created.category ?? null,
      enabled: created.enabled,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint violation on phrase
      const error = new Error("Conflict: phrase must be unique");
      // @ts-ignore
      error.status = 409;
      throw error;
    }
    throw err;
  }
}
