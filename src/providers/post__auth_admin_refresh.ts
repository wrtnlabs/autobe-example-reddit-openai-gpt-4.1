import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh JWT tokens for admin (community_platform_admins) via active session
 * record (community_platform_sessions).
 *
 * This endpoint allows re-issuance of access tokens when a valid refresh token
 * is presented, supporting session continuation for admin accounts.
 *
 * The function verifies the refresh token against the session store, checks its
 * validity and association with an active, undeleted admin account, then
 * rotates the session with a new refresh token and issues a new access token
 * (matching payload structure of login/join).
 *
 * @param props - Request properties
 * @param props.body - Refresh token for the admin session associated to
 *   community_platform_admins
 * @returns New JWT tokens and admin details per
 *   ICommunityPlatformAdmin.IAuthorized
 * @throws {Error} If refresh token is missing, session is
 *   invalid/expired/invalidated, or admin account is not valid
 */
export async function post__auth_admin_refresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { body } = props;

  // 1. Find valid session by refresh_token
  const session = await MyGlobal.prisma.community_platform_sessions.findUnique({
    where: { refresh_token: body.refresh_token },
  });
  if (!session || session.invalidated_at !== null)
    throw new Error("Invalid or expired refresh token");
  if (toISOStringSafe(session.expires_at) <= toISOStringSafe(new Date()))
    throw new Error("Refresh token has expired");
  if (!session.community_platform_admin_id)
    throw new Error("Session not bound to admin");

  // 2. Lookup admin by id, and validate account status
  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: session.community_platform_admin_id },
  });
  if (!admin || !admin.is_active || admin.deleted_at !== null)
    throw new Error("Session admin no longer valid");

  // 3. Issue new tokens with proper payload, match join/login
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days

  // Admin payload (must match join/login structure)
  const payload = { id: admin.id, type: "admin" } as const;
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  // Rotate refresh token
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Rotate refresh token in session DB record
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: refresh,
      expires_at: toISOStringSafe(refreshExpiresAt),
    },
  });

  return {
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(expiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
    admin: {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name ?? null,
      is_active: admin.is_active,
      is_super_admin: admin.is_super_admin,
      last_login_at: admin.last_login_at
        ? toISOStringSafe(admin.last_login_at)
        : null,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    },
  };
}
