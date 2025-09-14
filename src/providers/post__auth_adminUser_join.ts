import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * Registers a new adminUser with credentials and returns authentication tokens.
 *
 * This endpoint creates a new admin user by establishing a unique set of
 * credentials (email and hashed password) and linking them to an admin user
 * record. Upon successful registration, the system issues JWT access and
 * refresh tokens per platform authentication standards (issuer 'autobe'), and
 * tracks their issuance in the session table for auditability.
 *
 * - Enforces email uniqueness; duplicate emails are rejected with an error.
 * - Utilizes MyGlobal.password for strong password hashing (never stores
 *   plaintext).
 * - All date/time and UUID fields use standardized brand types (no native Date
 *   usage).
 * - Default admin status is 'active'; optional display_name included if provided.
 * - All relevant fields and tokens conform to the strict DTO contract and system
 *   conventions.
 *
 * @param props - Request parameter containing the body with registration info
 * @param props.body - The ICommunityPlatformAdminUser.IJoin DTO (email,
 *   password, optional display_name)
 * @returns The authenticated admin user DTO, including issued JWT tokens.
 * @throws {Error} If the email is already in use, or any underlying operation
 *   fails.
 */
export async function post__auth_adminUser_join(props: {
  body: ICommunityPlatformAdminUser.IJoin;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { body } = props;

  // Step 1: Check for existing credentials (email uniqueness)
  const foundCredential =
    await MyGlobal.prisma.community_platform_user_credentials.findUnique({
      where: { email: body.email },
    });
  if (foundCredential) throw new Error("Email already in use");

  // Step 2: Hash password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Step 3: Create credential and admin user
  const credentialId = v4() as string & tags.Format<"uuid">;
  const adminUserId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_user_credentials.create({
    data: {
      id: credentialId,
      email: body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const adminUser = await MyGlobal.prisma.community_platform_adminusers.create({
    data: {
      id: adminUserId,
      user_credential_id: credentialId,
      status: "active",
      display_name: body.display_name ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 4: Generate JWT tokens
  const accessExpiresMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = 60 * 60 * 24 * 7 * 1000; // 7 days
  const expired_at = toISOStringSafe(new Date(Date.now() + accessExpiresMs));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshExpiresMs),
  );

  const access = jwt.sign(
    { id: adminUserId, type: "adminUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: adminUserId, type: "adminUser", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Step 5: Insert session record for this login
  await MyGlobal.prisma.community_platform_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: adminUserId,
      token: access,
      issued_at: now,
      expires_at: expired_at,
      device_info: undefined,
      ip_address: undefined,
      revoked_at: null,
      created_at: now,
    },
  });

  // Step 6: Return the authorized response DTO (all fields branded and typed)
  return {
    id: adminUser.id,
    user_credential_id: adminUser.user_credential_id,
    display_name: adminUser.display_name ?? undefined,
    status: adminUser.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  } satisfies ICommunityPlatformAdminUser.IAuthorized;
}
