import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh a guest's access token using a valid refresh_token.
 *
 * This endpoint enables a guest to seamlessly renew their session by submitting
 * a valid refresh_token, issued from a previous session. It validates the
 * token, checks for a valid, active session that is unexpired and not
 * invalidated, and issues a new access/refresh token pair, rotating session
 * tokens. The operation does not elevate privileges or create a new guest; it
 * simply ensures uninterrupted guest browsing and analytics continuity.
 *
 * @param props - The request containing the guest's valid refresh_token for
 *   session renewal.
 * @param props.body - Request body containing the refresh_token (string).
 * @returns Object containing the new JWT token pair and the current guest
 *   identity record.
 * @throws {Error} If the token is invalid, expired, session is expired or
 *   invalidated, or the guest no longer exists.
 */
export async function post__auth_guest_refresh(props: {
  body: ICommunityPlatformGuest.IRefreshRequest;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new Error("Invalid or expired refresh_token");
  }
  // Validate payload is guest type & has required id
  if (!decoded || decoded.type !== "guest" || !decoded.id) {
    throw new Error("Refresh token does not belong to a guest identity");
  }
  // Find session matching refresh_token: not invalidated/deleted/expired and for guests only (no member/admin id)
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      refresh_token,
      invalidated_at: null,
      deleted_at: null,
      expires_at: { gt: now },
      community_platform_member_id: null,
      community_platform_admin_id: null,
    },
  });
  if (!session) {
    throw new Error("Session not found or expired/invalidated");
  }
  // Find guest record by decoded.id (from token)
  const guest = await MyGlobal.prisma.community_platform_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest || guest.deleted_at) {
    throw new Error("Guest not found or deleted");
  }
  // Compute expiration values
  const accessDurationMs = 1000 * 60 * 60; // 1 hour
  const refreshDurationMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + accessDurationMs),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + refreshDurationMs),
  );

  const accessPayload = { id: guest.id, type: "guest" };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Update session with new tokens and expires_at (rotating tokens)
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: session.id },
    data: {
      jwt_token: access,
      refresh_token: refresh,
      expires_at: refreshExpiresAt,
    },
  });

  return {
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    guest: {
      id: guest.id,
      guest_identifier: guest.guest_identifier,
      ip_address: guest.ip_address ?? null,
      user_agent: guest.user_agent ?? null,
      created_at: toISOStringSafe(guest.created_at),
      deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    },
  };
}
