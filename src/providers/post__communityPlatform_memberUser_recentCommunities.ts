import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Add a recent community visit to the member's recency list
 * (community_platform_recent_communities table).
 *
 * This endpoint allows an authenticated member user to add a new recent
 * community record to their navigation list, as captured in the
 * community_platform_recent_communities table. When a user visits a community
 * not currently in their top 5, this operation inserts a record linking the
 * user to the community with the updated recency rank and timestamp.
 *
 * System logic ensures only one record per (memberuser, community) combination
 * and limits total entries to 5 per user—oldest records are replaced as needed.
 * Only the user themselves can create (synchronize) their own recent
 * communities; no cross-user creation is permitted. The returned response
 * includes the new or updated entry, enabling immediate sidebar/recency context
 * updates in the frontend.
 *
 * @param props - Request properties, including the authenticated member user
 *   and body
 * @param props.memberUser - Authenticated member user adding to their recent
 *   navigation list
 * @param props.body - The request body containing community_id to add
 * @returns The newly created or updated recent community entry, normalized and
 *   ranked
 * @throws {Error} If database operation fails or user attempts invalid
 *   manipulation
 */
export async function post__communityPlatform_memberUser_recentCommunities(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformRecentCommunity.ICreate;
}): Promise<ICommunityPlatformRecentCommunity> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const memberuserId: string & tags.Format<"uuid"> = props.memberUser.id;
  const communityId: string & tags.Format<"uuid"> = props.body.community_id;

  return await MyGlobal.prisma.$transaction(async (tx) => {
    const allRecents = await tx.community_platform_recent_communities.findMany({
      where: { memberuser_id: memberuserId },
      orderBy: { recent_rank: "asc" },
    });
    const existing = allRecents.find((r) => r.community_id === communityId);
    let updatedRow;
    if (existing) {
      await tx.community_platform_recent_communities.update({
        where: { id: existing.id },
        data: { last_activity_at: now },
      });
      await Promise.all(
        allRecents
          .filter(
            (r) => r.id !== existing.id && r.recent_rank < existing.recent_rank,
          )
          .map((r) =>
            tx.community_platform_recent_communities.update({
              where: { id: r.id },
              data: { recent_rank: r.recent_rank + 1 },
            }),
          ),
      );
      updatedRow = await tx.community_platform_recent_communities.update({
        where: { id: existing.id },
        data: { recent_rank: 1 },
      });
    } else {
      const toDelete = allRecents.find((r) => r.recent_rank === 5);
      if (toDelete) {
        await tx.community_platform_recent_communities.delete({
          where: { id: toDelete.id },
        });
      }
      await Promise.all(
        allRecents
          .filter((r) => r.recent_rank < 5)
          .map((r) =>
            tx.community_platform_recent_communities.update({
              where: { id: r.id },
              data: { recent_rank: r.recent_rank + 1 },
            }),
          ),
      );
      updatedRow = await tx.community_platform_recent_communities.create({
        data: {
          id: v4(),
          memberuser_id: memberuserId,
          community_id: communityId,
          recent_rank: 1,
          last_activity_at: now,
        },
      });
    }
    return {
      id: updatedRow.id,
      memberuser_id: updatedRow.memberuser_id,
      community_id: updatedRow.community_id,
      recent_rank: updatedRow.recent_rank,
      last_activity_at:
        typeof updatedRow.last_activity_at === "string"
          ? updatedRow.last_activity_at
          : toISOStringSafe(updatedRow.last_activity_at),
    };
  });
}
