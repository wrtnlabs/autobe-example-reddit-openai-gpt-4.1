import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get detailed member user information by ID (community_platform_memberusers)
 *
 * Retrieves complete profile information for a given member user by unique ID,
 * as defined in the community_platform_memberusers table. Used for admin
 * platform functions like profile viewing, moderation, and system access
 * management. Requires adminUser authentication (authorization enforced via
 * decorator/contract).
 *
 * @param props - Request properties
 * @param props.adminUser - The authenticated admin user making the request
 *   (authorization enforced by decorator)
 * @param props.memberUserId - Unique identifier of the member user to retrieve
 * @returns Full member user profile, including id, credentials reference,
 *   display name (optional), status, and precise audit timestamps
 * @throws {Error} When the member user does not exist or is soft-deleted
 */
export async function get__communityPlatform_adminUser_memberUsers_$memberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberUser> {
  const { adminUser, memberUserId } = props;
  const member = await MyGlobal.prisma.community_platform_memberusers.findFirst(
    {
      where: {
        id: memberUserId,
        deleted_at: null,
      },
      select: {
        id: true,
        user_credential_id: true,
        display_name: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!member) throw new Error("Member user not found");
  return {
    id: member.id,
    user_credential_id: member.user_credential_id,
    display_name: member.display_name ?? undefined,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
  };
}
