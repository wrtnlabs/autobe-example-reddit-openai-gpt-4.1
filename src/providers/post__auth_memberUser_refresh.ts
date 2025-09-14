import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Refresh JWT tokens for a memberUser via valid refresh token
 * (community_platform_sessions).
 *
 * This refresh endpoint enables active memberUser accounts to renew their JWT
 * access and refresh tokens using a valid, non-revoked, and unexpired refresh
 * token previously issued at login or registration. Session management and
 * validation occur in community_platform_sessions. If validation passes, the
 * user is granted a new token pair and updated session expiry. Audit logs
 * record refresh event including token and device info. If the token is
 * invalid, expired, or the account is suspended/deleted, the request fails.
 * Security is paramount: only valid active sessions may be refreshed. Related
 * endpoints: join (registration), login (credential authentication), and logout
 * (token/session invalidation). Errors returned for token expiry, invalid
 * session, or account status issues.
 *
 * @param props - Object containing the body property with the required
 *   refresh_token string.
 * @param props.body - Request body containing the refresh_token.
 * @returns Member user information and new JWT token pair per IAuthorized
 *   schema.
 * @throws {Error} When token is missing, revoked, expired, or user account is
 *   invalid.
 */
export async function post__auth_memberUser_refresh(props: {
  body: ICommunityPlatformMemberUser.IRefresh;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const now = toISOStringSafe(new Date());

  // Step 1: Lookup session by refresh token (token column, unique)
  const session = await MyGlobal.prisma.community_platform_sessions.findUnique({
    where: { token: props.body.refresh_token },
  });
  if (!session || session.revoked_at !== null) {
    throw new Error("Invalid refresh token: not found or revoked");
  }

  // Step 2: Check session expiry
  const expiresAtStr = toISOStringSafe(session.expires_at);
  if (now >= expiresAtStr) {
    throw new Error("Refresh token expired");
  }

  // Step 3: Lookup user and account validity
  const user = await MyGlobal.prisma.community_platform_memberusers.findUnique({
    where: { id: session.user_id, deleted_at: null },
  });
  if (!user) {
    throw new Error("User account does not exist or is deleted");
  }

  // Step 4: Create new refresh token/session (rotate and track)
  const newRefreshToken = v4();
  const issuedAt = now;
  const accessTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const newSessionId = v4();
  await MyGlobal.prisma.community_platform_sessions.create({
    data: {
      id: newSessionId,
      user_id: user.id,
      token: newRefreshToken,
      issued_at: issuedAt,
      expires_at: refreshTokenExpiry,
      device_info: session.device_info ?? null,
      ip_address: session.ip_address ?? null,
      created_at: issuedAt,
    },
  });

  // Step 5: Revoke original session for security
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: session.id },
    data: { revoked_at: now },
  });

  // Step 6: Issue new JWT access token (payload matches join/login)
  const jwtPayload = {
    id: user.id,
    type: "memberUser",
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Step 7: Write audit log for refresh (compliance/security)
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_memberuser_id: user.id,
      actor_adminuser_id: null,
      event_type: "refresh",
      event_detail: `Refreshed session. Old: ${session.id}, New: ${newSessionId}`,
      ip_address: session.ip_address ?? null,
      created_at: now,
    },
  });

  // Step 8: Assemble/return new IAuthorized response object
  return {
    id: user.id,
    user_credential_id: user.user_credential_id,
    display_name: user.display_name ?? null,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
