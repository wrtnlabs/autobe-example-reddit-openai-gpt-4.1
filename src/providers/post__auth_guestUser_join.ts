import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

/**
 * Guest user registration—create a guest session and issue a temporary token
 * (community_platform_guestusers).
 *
 * This endpoint creates a new guest user session without requiring
 * authentication or PII. It generates a UUID, stores analytics metadata only
 * (no sensitive fields), and returns a temporary JWT token for platform
 * access.
 *
 * - Always creates a new guestusers row (never deduplicates by
 *   session_signature).
 * - Handles null/undefined session_signature per API specification (no error for
 *   duplicates).
 * - Provides access/refresh tokens using standard GuestuserPayload with correct
 *   issuer and expiry.
 * - All date/datetime values are string & tags.Format<'date-time'> (never Date),
 *   and UUIDs are string & tags.Format<'uuid'>.
 *
 * @param props - Object containing the request body for guest registration
 * @param props.body - Guest registration body, may include session_signature
 *   (opaque/non-PII)
 * @returns ICommunityPlatformGuestUser.IAuthorized (full guest record, token
 *   info)
 * @throws {Error} If database error occurs (should not occur barring
 *   infrastructure failures)
 */
export async function post__auth_guestUser_join(props: {
  body: ICommunityPlatformGuestUser.IJoin;
}): Promise<ICommunityPlatformGuestUser.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.community_platform_guestusers.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
      session_signature: props.body.session_signature ?? undefined,
      // deleted_at not set (defaults null)
    },
  });

  // Calculate access/refresh token expiry timestamps
  // Use date math, then always convert to string & tags.Format<'date-time'>
  const expiresAtObj = new Date();
  expiresAtObj.setHours(expiresAtObj.getHours() + 1);
  const refreshAtObj = new Date();
  refreshAtObj.setDate(refreshAtObj.getDate() + 7);
  const expired_at: string & tags.Format<"date-time"> =
    toISOStringSafe(expiresAtObj);
  const refreshable_until: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshAtObj);

  const payload = { id, type: "guestUser" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Build the return object (no PII, only analytics/session data)
  return {
    id,
    created_at: now,
    updated_at: now,
    // Echo deleted_at only if not null (always undefined on join)
    // (Do NOT include deleted_at property unless present)
    ...(created.session_signature !== undefined
      ? { session_signature: created.session_signature }
      : {}),
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
