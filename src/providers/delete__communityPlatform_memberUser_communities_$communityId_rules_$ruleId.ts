import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Delete a specific community rule from a community the user owns.
 *
 * This endpoint allows the owner of a community to permanently remove a rule
 * from the community's rule set. The operation performs a hard delete—there is
 * no soft deletion or recovery for deleted rules. Only the community owner is
 * authorized to make this change; deletion attempts by non-owners are denied.
 *
 * After deletion, all remaining rules for the community are re-ordered to
 * ensure sequential rule_index values for display.
 *
 * @param props - Properties for this operation.
 * @param props.memberUser - The authenticated member user (must be the
 *   community owner).
 * @param props.communityId - The ID of the target community.
 * @param props.ruleId - The ID of the rule to delete.
 * @returns Void
 * @throws {Error} If the rule does not exist for the community
 * @throws {Error} If the community does not exist
 * @throws {Error} If the user is not the owner of the community
 */
export async function delete__communityPlatform_memberUser_communities_$communityId_rules_$ruleId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch rule, ensure it belongs to the given community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: { id: props.ruleId, community_id: props.communityId },
      select: { id: true, community_id: true },
    });
  if (!rule) throw new Error("Rule not found for the specified community.");

  // Step 2: Fetch community, ensure user is the owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  if (!community) throw new Error("Community not found.");
  if (community.owner_id !== props.memberUser.id) {
    throw new Error("Only the community owner can delete rules.");
  }

  // Step 3: Hard delete the rule
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: props.ruleId },
  });

  // Step 4: Resequence rule_index for all remaining rules (start from 1)
  const rules =
    await MyGlobal.prisma.community_platform_community_rules.findMany({
      where: { community_id: props.communityId },
      orderBy: { rule_index: "asc" },
      select: { id: true, rule_index: true },
    });

  for (let i = 0; i < rules.length; ++i) {
    if (rules[i].rule_index !== i + 1) {
      await MyGlobal.prisma.community_platform_community_rules.update({
        where: { id: rules[i].id },
        data: { rule_index: i + 1 },
      });
    }
  }
}
