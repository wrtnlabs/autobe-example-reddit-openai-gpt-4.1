import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate a registered member and issue JWT tokens.
 *
 * This function verifies the provided email and password against the
 * 'community_platform_members' table. It uses MyGlobal.password.verify to check
 * the password hash securely. Only members with is_active=true and
 * deleted_at=null are allowed.
 *
 * On successful authentication, the function updates last_login_at and issues a
 * signed JWT access token (1h) and refresh token (7d). Tokens use the payload {
 * id, type: 'member' } and 'autobe' as issuer, and the function precisely
 * calculates expiration as ISO 8601 strings. No sensitive information
 * (password/hash) is ever returned. Error messages are always generic to
 * prevent account enumeration.
 *
 * @param props - Props with body containing member login credentials
 * @returns Authorized object containing tokens and sanitized member entity
 * @throws {Error} When login fails for any reason (generic message)
 */
export async function post__auth_member_login(props: {
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { body } = props;

  // 1. Fetch member by unique email (case-insensitive lookup not enforced in schema, so exact match only)
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { email: body.email },
  });

  // 2. If not found, inactive or soft-deleted: generic fail
  if (!member || !member.is_active || member.deleted_at) {
    throw new Error("Invalid email or password");
  }

  // 3. Password verification (must only use platform hash lib, never manual hash)
  const valid = await MyGlobal.password.verify(
    body.password,
    member.password_hash,
  );
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  // 4. Set now as branded date-time string
  const now: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date());

  // 5. Update last_login_at (don't mutate other fields)
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: member.id },
    data: { last_login_at: now },
  });

  // 6. JWT payload (must match MemberPayload contract: id, type)
  const jwtPayload = { id: member.id, type: "member" };

  // 7. Access token (1h) with issuer 'autobe'
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // 8. Refresh token (7d) with issuer 'autobe', tokenType field for separation
  const refreshToken = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 9. Expiry dates as ISO string
  const expiredAt: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 1 * 60 * 60 * 1000));
  const refreshableUntil: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  // 10. Compose tokens (IAuthorizationToken)
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };

  // 11. Construct sanitized member output (exclude hash/password, include only valid DTO fields)
  return {
    token,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name ?? null,
      is_active: member.is_active,
      last_login_at: now,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    },
  };
}
