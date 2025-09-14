import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

/**
 * Guest session token refresh—extend guest access with a new temporary token
 * (community_platform_guestusers).
 *
 * This endpoint verifies the provided guest session token, ensures the guest
 * account is still active (not deleted), updates the activity timestamp, and
 * issues a new time-limited JWT token to extend the anonymous browsing session.
 * No personal credentials are required as guest accounts are anonymous. Fails
 * if the token is expired, invalid, or if the session has been deleted.
 *
 * @param props - Object containing the request body with the current guest
 *   token.
 * @param props.body - The refresh request containing the prior guest session
 *   token.
 * @returns Details of the refreshed guest session and renewed JWT token for
 *   continued browsing.
 * @throws {Error} If the token is invalid, expired, malformed, or the guest
 *   session is not active.
 */
export async function post__auth_guestUser_refresh(props: {
  body: ICommunityPlatformGuestUser.IRefresh;
}): Promise<ICommunityPlatformGuestUser.IAuthorized> {
  const { token } = props.body;
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired guest session token");
  }
  // Validate decoded token structure strictly
  if (!decoded || typeof decoded !== "object" || decoded === null) {
    throw new Error("Malformed guest token (structure)");
  }
  if (
    !("type" in decoded) ||
    (decoded as { type?: unknown }).type !== "guestUser"
  ) {
    throw new Error("Malformed guest token (role/type mismatch)");
  }
  if (
    !("id" in decoded) ||
    typeof (decoded as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Malformed guest token (missing id)");
  }
  const guestId = (decoded as { id: string }).id;
  // Query guest user (deleted_at must be null => still active)
  const guest = await MyGlobal.prisma.community_platform_guestusers.findUnique({
    where: { id: guestId },
  });
  if (!guest || guest.deleted_at !== null) {
    throw new Error("Guest session not found or has been deleted");
  }
  // Update updated_at for activity tracking
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_guestusers.update({
    where: { id: guest.id },
    data: { updated_at: now },
  });
  // Issue new JWT guest access token (id, type: 'guestUser'), e.g., 1 hour expiry
  const expiresInSec = 60 * 60;
  const accessToken = jwt.sign(
    { id: guest.id, type: "guestUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: expiresInSec, issuer: "autobe" },
  );
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + expiresInSec * 1000),
  );
  // Compose response object
  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: now,
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    session_signature: guest.session_signature ?? undefined,
    token: {
      access: accessToken,
      refresh: token,
      expired_at: expiredAt,
      refreshable_until: expiredAt,
    },
  };
}
