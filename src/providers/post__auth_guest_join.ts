import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Create and issue temporary guest identity (community_platform_guests).
 *
 * This endpoint allows a non-authenticated user (guest) to temporarily register
 * a guest identity for analytical tracking and session management purposes. No
 * credentials are required or issued; the system generates a unique
 * guest_identifier (e.g. cookie/session device ID), records optional IP and
 * user agent information, and logs the timestamp of guest registration.
 *
 * The guest join flow enables the platform to attribute browsing and engagement
 * to unique visitors for analytics and security (e.g., preventing abuse or
 * spam) without associating a concrete email or password. The related Prisma DB
 * entity is 'community_platform_guests', which persistently stores
 * guest_identifier, IP address, and user agent for each unique guest.
 *
 * Guest join does not create any permissions for the guest to post, comment,
 * vote, join or leave communities, or create content. The guest is strictly
 * limited to read-only actions, as established in the business requirement
 * analysis and permissions matrix. Guests can view all public content and
 * browse communities, posts, and comments.
 *
 * Security is enforced via JWT tokens issued for guest sessions, scoped only to
 * permitted actions (read/view, not write or interact). If a guest attempts to
 * upgrade (register as member), a new member identity is created, and their
 * guest session is discontinued.
 *
 * Related ops: Guest token refresh (for prolonged browsing), member upgrade
 * (handled by member join, not guest). Session expiration and actions requiring
 * member privileges must trigger a login prompt.
 *
 * This operation is public and does not require authentication.
 *
 * @param props - No input needed. Guest identity is auto-generated and tracked
 *   based on device/session/cookie.
 * @returns Session and authorization info for the newly created guest identity,
 *   with issued JWT session tokens and guest_identifier.
 */
export async function post__auth_guest_join(props: {
  body: {};
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // Generate unique IDs and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const guest_identifier = v4(); // Real deployments may use device/browser info combined with v4
  const created_at = toISOStringSafe(new Date());

  // Store in DB
  const created = await MyGlobal.prisma.community_platform_guests.create({
    data: {
      id,
      guest_identifier,
      ip_address: null,
      user_agent: null,
      created_at,
      deleted_at: null,
    },
  });

  // Token expiry logic
  const ACCESS_EXPIRY_SECONDS = 3600; // 1 hour
  const REFRESH_EXPIRY_SECONDS = 604800; // 7 days
  const now = Date.now();
  const expired_at = toISOStringSafe(
    new Date(now + ACCESS_EXPIRY_SECONDS * 1000),
  );
  const refreshable_until = toISOStringSafe(
    new Date(now + REFRESH_EXPIRY_SECONDS * 1000),
  );

  // JWT token issuing logic (payload: GuestPayload)
  const payload = {
    id,
    type: "guest",
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: ACCESS_EXPIRY_SECONDS,
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: REFRESH_EXPIRY_SECONDS,
      issuer: "autobe",
    },
  );

  // Compose response strictly by DTO
  return {
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    guest: {
      id,
      guest_identifier,
      created_at,
      ip_address: null,
      user_agent: null,
      deleted_at: null,
    },
  };
}
