import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete a community and all its related content.
 *
 * Permanently deletes a specific community identified by communityId. Cascades
 * deletion to all related posts, memberships, recent activity, and rules.
 * Performs a soft delete on the main community record and its posts (sets
 * deleted_at), and hard-deletes all memberships, recent_community, and rules
 * records. Only platform admins may execute this operation.
 *
 * @param props - Object containing required parameters
 * @param props.adminUser - The authenticated admin user performing the deletion
 *   (from AdminuserPayload)
 * @param props.communityId - Unique identifier for the target community
 * @returns Void
 * @throws {Error} When the community does not exist or is already deleted
 * @throws {Error} When operation fails atomically
 */
export async function delete__communityPlatform_adminUser_communities_$communityId(props: {
  adminUser: AdminuserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, communityId } = props;

  // Fetch community (must exist and not be deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, deleted_at: null },
    });
  if (!community) {
    throw new Error("Community not found or already deleted");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Execute all modifications in a single transaction
  await MyGlobal.prisma.$transaction([
    // Soft delete the community (set deleted_at)
    MyGlobal.prisma.community_platform_communities.update({
      where: { id: communityId },
      data: { deleted_at: now },
    }),
    // Soft delete all posts (set deleted_at where not already deleted)
    MyGlobal.prisma.community_platform_posts.updateMany({
      where: { community_platform_community_id: communityId, deleted_at: null },
      data: { deleted_at: now },
    }),
    // Hard delete all memberships for this community
    MyGlobal.prisma.community_platform_community_memberships.deleteMany({
      where: { community_id: communityId },
    }),
    // Hard delete all community rules for this community
    MyGlobal.prisma.community_platform_community_rules.deleteMany({
      where: { community_id: communityId },
    }),
    // Hard delete all recent community records
    MyGlobal.prisma.community_platform_recent_communities.deleteMany({
      where: { community_id: communityId },
    }),
    // Write audit log entry
    MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_adminuser_id: adminUser.id,
        actor_memberuser_id: null,
        event_type: "community_delete",
        event_detail: `Admin deleted community ${communityId}`,
        ip_address: null,
        created_at: now,
      },
    }),
  ]);
}
