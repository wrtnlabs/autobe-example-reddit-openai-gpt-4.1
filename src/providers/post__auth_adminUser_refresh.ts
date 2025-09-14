import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * Refreshes JWT tokens for an adminUser account.
 *
 * Renews authentication tokens (access and refresh) for an adminUser account,
 * provided a valid, active refresh token matching a live session in
 * community_platform_sessions and an 'active' adminUser. Enforces all session
 * expiry, revocation, and admin status logic per business rules and logs the
 * refresh event for auditing. Only supports adminUser tokens; does not permit
 * refresh for member/guest sessions.
 *
 * @param props - Request properties
 * @param props.body - Request body containing the refresh token
 * @returns The adminUser's identity and new session JWTs
 * @throws {Error} If the refresh token is invalid, revoked, expired, or admin
 *   inacccessible
 */
export async function post__auth_adminUser_refresh(props: {
  body: ICommunityPlatformAdminUser.IRefresh;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { token } = props.body;
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or malformed refresh token");
  }
  // Look up the session by token (active, not revoked, not expired)
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      token,
      revoked_at: null,
    },
  });
  if (!session) throw new Error("No valid session for this refresh token");
  // Check session expiration (now < expires_at)
  const now = new Date();
  if (toISOStringSafe(now) >= toISOStringSafe(session.expires_at)) {
    throw new Error("Refresh token session expired");
  }
  // Look up the adminUser for this session
  const adminUser =
    await MyGlobal.prisma.community_platform_adminusers.findUnique({
      where: { id: session.user_id },
    });
  if (
    !adminUser ||
    adminUser.status !== "active" ||
    (adminUser.deleted_at !== null && adminUser.deleted_at !== undefined)
  ) {
    throw new Error("AdminUser not active or deleted");
  }
  // Token expiration structure
  const accessExpirationSeconds = 60 * 60; // 1 hour
  const refreshExpirationSeconds = 7 * 24 * 60 * 60; // 7 days
  const nowIso = toISOStringSafe(now);
  const accessExpireDate = new Date(
    now.getTime() + accessExpirationSeconds * 1000,
  );
  const accessExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpireDate);
  const refreshExpireDate = new Date(
    now.getTime() + refreshExpirationSeconds * 1000,
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpireDate);
  // Generate new JWTs - payload { id, type } per convention
  const newAccessToken = jwt.sign(
    {
      id: adminUser.id,
      type: "adminUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExpirationSeconds,
      issuer: "autobe",
    },
  );
  const newRefreshToken = jwt.sign(
    {
      id: adminUser.id,
      type: "adminUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpirationSeconds,
      issuer: "autobe",
    },
  );
  // Revoke the old session (set revoked_at)
  await MyGlobal.prisma.community_platform_sessions.updateMany({
    where: { token },
    data: { revoked_at: nowIso },
  });
  // Create the new session row
  const newSessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.community_platform_sessions.create({
    data: {
      id: newSessionId,
      user_id: adminUser.id,
      token: newRefreshToken,
      issued_at: nowIso,
      expires_at: refreshExpiresAt,
      created_at: nowIso,
      device_info: session.device_info ?? null,
      ip_address: session.ip_address ?? null,
    },
  });
  // Audit log this refresh event
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_adminuser_id: adminUser.id,
      event_type: "adminUser_refresh",
      event_detail: `JWT refresh token used: session ${newSessionId}`,
      ip_address: session.ip_address ?? null,
      created_at: nowIso,
    },
  });
  return {
    id: adminUser.id,
    user_credential_id: adminUser.user_credential_id,
    display_name: adminUser.display_name ?? undefined,
    status: adminUser.status,
    created_at: toISOStringSafe(adminUser.created_at),
    updated_at: toISOStringSafe(adminUser.updated_at),
    deleted_at: adminUser.deleted_at
      ? toISOStringSafe(adminUser.deleted_at)
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
