import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Create a new admin account (community_platform_admins) and issue JWT tokens
 * for admin authentication.
 *
 * This operation enables new admin accounts to be registered within the system
 * by providing required fields (email, password, optional display_name), as
 * defined in the community_platform_admins Prisma schema. On submission, the
 * input email is checked against existing entries in community_platform_admins
 * for uniqueness; password is securely hashed per operational security policy.
 *
 * Creation of the admin entity triggers initial is_active status as true and
 * is_super_admin as false by default. All audit fields are set, and
 * last_login_at is null on registration. Upon successful registration, JWT
 * tokens are issued per authorization policy for admin access.
 *
 * @param props - Props containing registration body
 * @param props.body - The registration data: email (unique), password, and
 *   optional display_name
 * @returns Full authorization credentials (access/refresh token and admin
 *   entity) for subsequent authenticated API usage
 * @throws {Error} If an admin with the provided email already exists
 */
export async function post__auth_admin_join(props: {
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { email, password, display_name } = props.body;

  // 1. Check for existing admin by unique email
  const existing = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email },
  });
  if (existing) throw new Error("Admin with this email already exists.");

  // 2. Hash password for storage
  const password_hash = await MyGlobal.password.hash(password);
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // 3. Create admin account in DB
  const created = await MyGlobal.prisma.community_platform_admins.create({
    data: {
      id,
      email,
      password_hash,
      display_name: display_name ?? null,
      is_active: true,
      is_super_admin: false,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Generate JWT tokens (access & refresh); payload must use correct fields
  const accessToken = jwt.sign(
    { id: created.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: created.id, type: "admin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Compute expiry timestamps also as ISO string
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // 5. Return auth tokens and registered admin entity, converting all dates
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
    admin: {
      id: created.id,
      email: created.email,
      display_name: created.display_name ?? null,
      is_active: created.is_active,
      is_super_admin: created.is_super_admin,
      last_login_at: null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    },
  };
}
