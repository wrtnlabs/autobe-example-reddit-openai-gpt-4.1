import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Complete password reset for member account using one-time token
 * (community_platform_password_resets).
 *
 * This API operation finalizes the password reset process for 'member' users by
 * accepting a valid one-time reset token and a new password, mapping to the
 * 'community_platform_password_resets' and 'community_platform_members'
 * tables.
 *
 * Upon receiving a reset token and new password (the latter to be securely
 * hashed), the system validates that the reset token exists, has not been used,
 * is not expired, and is associated with an active member. On success, the
 * member's 'password_hash' is updated accordingly, the reset record is marked
 * as used, and all prior access/refresh tokens (sessions) for the user are
 * invalidated for security.
 *
 * If the token is invalid, expired, or has already been used, an appropriate
 * error is returned. If successful, the endpoint issues a response confirming
 * that the password was changed. The member must log in again with the new
 * password; no JWT tokens are issued here. Enforces all current password
 * complexity rules as per business specifications.
 *
 * @param props - { body }: Password reset confirmation (reset token, new
 *   password)
 * @returns Confirmation message indicating password was reset
 * @throws {Error} If token is invalid, expired, already used, or member account
 *   does not exist or is not active
 */
export async function post__auth_member_password_reset_complete(props: {
  body: ICommunityPlatformMember.IPasswordResetComplete;
}): Promise<ICommunityPlatformMember.IPasswordResetCompleteResponse> {
  const { reset_token, new_password } = props.body;
  // Current UTC timestamp in required ISO format
  const now = toISOStringSafe(new Date());
  // 1. Fetch the password reset entry that is not deleted
  const reset =
    await MyGlobal.prisma.community_platform_password_resets.findFirst({
      where: {
        reset_token,
        deleted_at: null,
      },
    });
  if (!reset) throw new Error("Invalid or expired password reset token");
  if (reset.used_at) throw new Error("Reset token already used");
  if (toISOStringSafe(reset.expires_at) < now)
    throw new Error("Reset token expired");
  if (!reset.community_platform_member_id)
    throw new Error("Reset token not linked to any member");
  // 2. Verify linked member is active and not deleted
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: reset.community_platform_member_id,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!member)
    throw new Error("Associated member account does not exist or is inactive");
  // 3. Hash the new password
  const password_hash = await MyGlobal.password.hash(new_password);
  // 4. Update member's password_hash and updated_at
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: member.id },
    data: {
      password_hash,
      updated_at: now,
    },
  });
  // 5. Mark the password reset entry as used
  await MyGlobal.prisma.community_platform_password_resets.update({
    where: { id: reset.id },
    data: { used_at: now },
  });
  // 6. Invalidate all existing sessions for this member
  await MyGlobal.prisma.community_platform_sessions.updateMany({
    where: {
      community_platform_member_id: member.id,
      invalidated_at: null,
      deleted_at: null,
    },
    data: {
      invalidated_at: now,
    },
  });
  return {
    status:
      "Your password has been reset. Please log in with your new password.",
  };
}
