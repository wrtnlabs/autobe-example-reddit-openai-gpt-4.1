import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate admin (community_platform_admins) and issue JWT tokens for
 * access.
 *
 * This endpoint allows registered admin users to login using their email and
 * password. On success, it returns JWT tokens and the admin profile (never
 * including the password hash). Admin accounts must be active (is_active: true)
 * and not soft-deleted (deleted_at: null). The endpoint verifies credentials,
 * sets last_login_at/updated_at upon login, and encodes correct claims in
 * tokens.
 *
 * @param props - Request properties
 * @param props.body - Admin credentials (email, password) for authentication
 * @returns Admin JWT tokens and admin entity info in
 *   ICommunityPlatformAdmin.IAuthorized structure
 * @throws {Error} If authentication fails due to invalid credentials, inactive
 *   or deleted account, or other errors
 */
export async function post__auth_admin_login(props: {
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Look up active, non-deleted admin by email
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      email,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!admin) throw new Error("Invalid email or password"); // do not leak existence

  // Check password securely
  const ok = await MyGlobal.password.verify(password, admin.password_hash);
  if (!ok) throw new Error("Invalid email or password");

  // Update last_login_at and updated_at in DB to now (as ISO string)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_admins.update({
    where: { id: admin.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // Prepare JWT token expiry datetimes (in ISO string format)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Issue JWT tokens (admin type claim)
  const access = jwt.sign(
    {
      id: updated.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      id: updated.id,
      type: "admin",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Prepare admin object, with proper date formatting
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    admin: {
      id: updated.id,
      email: updated.email,
      display_name:
        typeof updated.display_name === "string" ? updated.display_name : null,
      is_active: updated.is_active,
      is_super_admin: updated.is_super_admin,
      last_login_at: updated.last_login_at
        ? toISOStringSafe(updated.last_login_at)
        : null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    },
  };
}
