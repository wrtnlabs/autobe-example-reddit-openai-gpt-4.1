import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Issue new JWT tokens for a member using a valid refresh token.
 *
 * This session continuation endpoint verifies the validity of the presented
 * refresh token against the 'community_platform_sessions' and
 * 'community_platform_members' tables.
 *
 * - If the refresh token is valid and the session is active, new access/refresh
 *   tokens are issued and the session updated.
 * - If invalid, expired, revoked, or associated with an inactive/deleted user, an
 *   error is thrown.
 * - All date values use toISOStringSafe for type safety.
 *
 * @param props - Request properties
 * @param props.body - Refresh token corresponding to an existing, valid session
 *   for the member
 * @returns New JWT tokens and authorized user identity after successful refresh
 * @throws {Error} When the refresh token is invalid, expired, session is
 *   invalidated, or user is deactivated/deleted
 */
export async function post__auth_member_refresh(props: {
  body: ICommunityPlatformMember.IRefreshRequest;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: { id: string; type: "member" };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: "member" };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      refresh_token,
      invalidated_at: null,
      deleted_at: null,
    },
  });
  if (!session)
    throw new Error(
      "Session not found, refresh token revoked or already expired",
    );
  // expiration check: session.expires_at must be in the future
  if (!session.expires_at || new Date(session.expires_at) < new Date()) {
    throw new Error("Session expired");
  }
  // A session may also have been issued for admin
  if (!session.community_platform_member_id)
    throw new Error("Session is not associated with a member");
  // check member active/not-deleted
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: session.community_platform_member_id },
  });
  if (!member || !member.is_active || member.deleted_at)
    throw new Error("Member not active or deleted");
  // Prepare JWT payload and new tokens
  const payload = { id: member.id, type: "member" };
  const now = Date.now();
  const access_exp = new Date(now + 60 * 60 * 1000);
  const refresh_exp = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const access_token = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh_token_new = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: session.id },
    data: {
      jwt_token: access_token,
      refresh_token: refresh_token_new,
      expires_at: toISOStringSafe(refresh_exp),
    },
  });
  return {
    token: {
      access: access_token,
      refresh: refresh_token_new,
      expired_at: toISOStringSafe(access_exp),
      refreshable_until: toISOStringSafe(refresh_exp),
    },
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name ?? null,
      is_active: member.is_active,
      last_login_at: member.last_login_at
        ? toISOStringSafe(member.last_login_at)
        : null,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    },
  };
}
