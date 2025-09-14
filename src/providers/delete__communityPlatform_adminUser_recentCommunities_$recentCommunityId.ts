import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Remove a single recent community link by recentCommunityId from
 * community_platform_recent_communities.
 *
 * This operation allows an admin user to permanently delete a recent community
 * entry by its unique ID. Only admin users are permitted to use this endpoint.
 * The deletion affects only recent navigation associations, and does not impact
 * community membership or the community entity itself. Throws an error if the
 * recentCommunityId is not found.
 *
 * @param props - Arguments for the deletion operation
 * @param props.adminUser - Authenticated admin user payload
 * @param props.recentCommunityId - UUID of the recent community record to
 *   delete
 * @returns Void
 * @throws {Error} If the recent community record does not exist
 */
export async function delete__communityPlatform_adminUser_recentCommunities_$recentCommunityId(props: {
  adminUser: AdminuserPayload;
  recentCommunityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { recentCommunityId } = props;
  // Find the recent community link by ID
  const record =
    await MyGlobal.prisma.community_platform_recent_communities.findUnique({
      where: { id: recentCommunityId },
    });
  if (!record) {
    throw new Error("Recent community not found");
  }
  // Perform hard delete of the association
  await MyGlobal.prisma.community_platform_recent_communities.delete({
    where: { id: recentCommunityId },
  });
}
