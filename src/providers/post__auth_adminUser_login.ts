import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * Logs in an adminUser account and issues JWT tokens.
 * (community_platform_adminusers, community_platform_sessions)
 *
 * This operation authenticates admin users by verifying their credentials
 * directly in the credential table, then matching to an active, non-deleted
 * adminUser. If valid, issues JWT tokens, records a new session, and logs an
 * audit event.
 *
 * @param props - Login request context
 * @param props.body - AdminUser login credentials
 * @returns Successful authentication result with issued tokens and adminUser
 *   core fields
 * @throws {Error} Invalid credentials (email/password incorrect, deleted, or
 *   not admin)
 * @throws {Error} Account is not active (status is not 'active')
 */
export async function post__auth_adminUser_login(props: {
  body: ICommunityPlatformAdminUser.ILogin;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { email, password } = props.body;
  // 1. Lookup credential (by email, ensure not deleted)
  const credential =
    await MyGlobal.prisma.community_platform_user_credentials.findFirst({
      where: { email, deleted_at: null },
    });
  if (!credential) throw new Error("Invalid credentials");
  // 2. Verify password
  const passwordMatches = await MyGlobal.password.verify(
    password,
    credential.password_hash,
  );
  if (!passwordMatches) throw new Error("Invalid credentials");
  // 3. Lookup admin user
  const admin = await MyGlobal.prisma.community_platform_adminusers.findFirst({
    where: { user_credential_id: credential.id, deleted_at: null },
  });
  if (!admin) throw new Error("Invalid credentials");
  if (admin.status !== "active") throw new Error("Account is not active");
  // 4. Token/expiries (must use ISO string)
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1h expiry
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7d expiry
  // 5. JWT generation (use correct payload and issuer)
  const payload = { id: admin.id, type: "adminUser" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Session record
  await MyGlobal.prisma.community_platform_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: admin.id,
      token: access,
      issued_at: now,
      expires_at: accessExpires,
      device_info: null,
      ip_address: null,
      revoked_at: null,
      created_at: now,
    },
  });
  // 7. Audit log record
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_memberuser_id: null,
      actor_adminuser_id: admin.id,
      event_type: "session_login",
      event_detail: `Admin login email: ${email} (adminId: ${admin.id})`,
      ip_address: null,
      created_at: now,
    },
  });
  // 8. Build API response (dates use toISOStringSafe)
  return {
    id: admin.id,
    user_credential_id: admin.user_credential_id,
    display_name: admin.display_name ?? undefined,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
