import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Authenticate memberUser by email/password and issue new JWT tokens
 * (community_platform_memberusers).
 *
 * This endpoint authenticates an existing memberUser using their email and
 * password, issuing new JWT access and refresh tokens. The system enforces that
 * the user is active and not soft-deleted. Credentials are verified securely,
 * and session/audit logs are recorded. Upon success, the method returns a full
 * IAuthorized DTO with identity and token details.
 *
 * @param props - Login parameters
 * @param props.body - Login payload with memberUser email and password
 * @returns Authorized session information for the logged-in user with JWT
 *   access and refresh tokens
 * @throws {Error} If credentials are invalid, account is non-active, not found,
 *   or soft/hard deleted
 */
export async function post__auth_memberUser_login(props: {
  body: ICommunityPlatformMemberUser.ILogin;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const { email, password } = props.body;

  // 1. Find credentials
  const credential =
    await MyGlobal.prisma.community_platform_user_credentials.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });
  if (!credential) throw new Error("Invalid credentials");

  // 2. Find member user
  const member = await MyGlobal.prisma.community_platform_memberusers.findFirst(
    {
      where: {
        user_credential_id: credential.id,
        deleted_at: null,
      },
    },
  );
  if (!member) throw new Error("Invalid credentials");

  // 3. Check account status
  if (member.status !== "active") throw new Error("Account is not active");

  // 4. Validate password (always using MyGlobal.password)
  const isValid = await MyGlobal.password.verify(
    password,
    credential.password_hash,
  );
  if (!isValid) throw new Error("Invalid credentials");

  // 5. Generate time values (as ISO strings with correct branding)
  const issuedAt = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // 6. JWT token generation (payload structure per MemberuserPayload)
  const jwtPayload = {
    id: member.id,
    type: "memberUser",
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 7. Create session row (tracking refresh token, issued/expiry)
  await MyGlobal.prisma.community_platform_sessions.create({
    data: {
      id: v4(),
      user_id: member.id,
      token: refreshToken,
      issued_at: issuedAt,
      expires_at: refreshExpires,
      created_at: issuedAt,
    },
  });

  // 8. Audit log (logs session_login for traceability)
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_memberuser_id: member.id,
      actor_adminuser_id: null,
      event_type: "session_login",
      event_detail: `Login as memberUser for email: ${email}`,
      ip_address: null,
      created_at: issuedAt,
    },
  });

  // 9. Return IAuthorized DTO (all datetime fields converted)
  return {
    id: member.id,
    user_credential_id: member.user_credential_id,
    display_name: member.display_name ?? null,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
