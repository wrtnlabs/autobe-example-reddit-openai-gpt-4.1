import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Initiate password reset workflow for member accounts
 * (community_platform_members, community_platform_password_resets).
 *
 * This function initiates the password reset process for a member. It takes an
 * email address, checks if an active, undeleted user exists, and if so,
 * generates a secure, one-time reset token with expiry. The token is recorded
 * in the password reset table and (conceptually) emailed to the user.
 * Regardless of whether the account exists or not, a generic confirmation
 * message is returned with no account existence leak.
 *
 * @param props - Object containing the request body
 * @param props.body - Member password reset request (must contain 'email')
 * @returns Status message confirming initiation of password reset process
 *   (never leaks account existence).
 * @throws {Error} Never throws specific errors regarding account existence or
 *   eligibility for privacy reasons.
 */
export async function post__auth_member_password_reset_initiate(props: {
  body: ICommunityPlatformMember.IPasswordResetInitiate;
}): Promise<ICommunityPlatformMember.IPasswordResetInitiateResponse> {
  const { email } = props.body;
  // Find eligible (active, not deleted) member
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      email,
      is_active: true,
      deleted_at: null,
    },
  });
  if (member) {
    // Generate a secure random reset token (uuid v4 or more secure via crypto as appropriate)
    const reset_token = v4();
    // Expiration: 1 hour from now (configurable)
    const expires_at: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    // Write password reset record
    await MyGlobal.prisma.community_platform_password_resets.create({
      data: {
        id: v4(),
        community_platform_member_id: member.id,
        reset_token,
        expires_at,
        used_at: null,
        created_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
    // (Simulate sending an email to the member)
    // In production, this would queue a transactional mail
  }
  // Always return generic confirmation message
  return {
    status:
      "If this email address is registered, you will receive password reset instructions shortly.",
  };
}
