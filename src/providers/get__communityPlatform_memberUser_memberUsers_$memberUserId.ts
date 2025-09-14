import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Get detailed member user information by ID (community_platform_memberusers)
 *
 * Retrieves the complete member user profile and attributes using their unique
 * member user ID. Only available to authenticated users and platform admins per
 * business privacy policy. Soft-deleted accounts (deleted_at not null) are not
 * retrievable.
 *
 * @param props - Properties for retrieving a member user's information
 * @param props.memberUser - JWT payload of the requesting authenticated
 *   memberUser
 * @param props.memberUserId - Unique identifier of the target member user
 *   profile
 * @returns The complete member user profile using the business data structure
 * @throws {Error} If the member user profile does not exist or has been deleted
 */
export async function get__communityPlatform_memberUser_memberUsers_$memberUserId(props: {
  memberUser: MemberuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberUser> {
  const { memberUserId } = props;

  const user = await MyGlobal.prisma.community_platform_memberusers.findFirst({
    where: {
      id: memberUserId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new Error("Member user not found or has been deleted");
  }

  return {
    id: user.id,
    user_credential_id: user.user_credential_id,
    display_name: user.display_name ?? undefined,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
