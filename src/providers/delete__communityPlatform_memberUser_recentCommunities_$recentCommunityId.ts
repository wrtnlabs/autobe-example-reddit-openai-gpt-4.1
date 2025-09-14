import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Remove a single recent community link by recentCommunityId from
 * community_platform_recent_communities.
 *
 * This operation deletes a recent community navigation record from a member
 * user's recent list. It enforces that only the owner of the record (the
 * memberuser identified by memberuser_id) may delete it. The delete is
 * permanent (hard delete), and after deletion the function normalizes the
 * recent_rank field for all of the user's remaining recent communities,
 * ensuring contiguous rank values (1..N ascending) as required by UI/business
 * rules. No date fields are mutated since recent_rank and order are the primary
 * concern.
 *
 * @param props - Object containing all required arguments
 * @param props.memberUser - The authenticated member user (must match the
 *   record's memberuser_id)
 * @param props.recentCommunityId - The unique ID of the recent community record
 *   to delete
 * @returns Void (nothing on success)
 * @throws {Error} When the record is missing or user does not own it
 */
export async function delete__communityPlatform_memberUser_recentCommunities_$recentCommunityId(props: {
  memberUser: MemberuserPayload;
  recentCommunityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, recentCommunityId } = props;
  // Step 1: Fetch the target record
  const target =
    await MyGlobal.prisma.community_platform_recent_communities.findFirst({
      where: { id: recentCommunityId },
    });
  if (!target) throw new Error("Recent community record does not exist.");
  if (target.memberuser_id !== memberUser.id)
    throw new Error(
      "Forbidden: You can only remove your own recent community records.",
    );

  // Step 2: Hard delete the entry
  await MyGlobal.prisma.community_platform_recent_communities.delete({
    where: { id: recentCommunityId },
  });

  // Step 3: Resequence remaining recent communities for that user by rank
  const remaining =
    await MyGlobal.prisma.community_platform_recent_communities.findMany({
      where: { memberuser_id: memberUser.id },
      orderBy: { recent_rank: "asc" },
    });
  for (let i = 0; i < remaining.length; ++i) {
    const correctRank = i + 1;
    if (remaining[i].recent_rank !== correctRank) {
      await MyGlobal.prisma.community_platform_recent_communities.update({
        where: { id: remaining[i].id },
        data: { recent_rank: correctRank },
      });
    }
  }
}
