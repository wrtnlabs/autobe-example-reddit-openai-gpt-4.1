import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get detailed admin user information by ID (community_platform_adminusers)
 *
 * Retrieves detailed information for a specific admin user, identified by their
 * unique admin user ID. Returns all business-relevant attributes documented in
 * the community_platform_adminusers schema, such as display name, status, and
 * timestamps.
 *
 * Access is strictly limited to users with the adminUser role. If the ID is not
 * found or the account is soft deleted, a 404 error is thrown (by
 * findUniqueOrThrow). Authorization is enforced via the props.adminUser
 * parameter. No additional business or field validation is necessary.
 *
 * @param props - Properties for the request
 * @param props.adminUser - The authenticated admin user (role:
 *   AdminuserPayload)
 * @param props.adminUserId - Unique identifier of the admin user to retrieve
 *   (uuid)
 * @returns Full admin user record (ICommunityPlatformAdminUser) with approved
 *   schema fields only
 * @throws {Error} 404 if not found or soft deleted, or if not authorized (via
 *   authentication decorator)
 */
export async function get__communityPlatform_adminUser_adminUsers_$adminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdminUser> {
  const { adminUser, adminUserId } = props;

  const admin =
    await MyGlobal.prisma.community_platform_adminusers.findUniqueOrThrow({
      where: {
        id: adminUserId,
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
    });

  return {
    id: admin.id,
    user_credential_id: admin.user_credential_id,
    display_name: admin.display_name,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
  };
}
