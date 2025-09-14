import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete a specific community rule (community_platform_community_rules table).
 *
 * Permanently deletes the specified rule from the
 * community_platform_community_rules table. This operation is allowed only if
 * the authenticated adminUser is the owner of the referenced community. After
 * deletion, remaining rules in the community are renumbered in ascending order
 * of display (rule_index 1..N) to maintain sequence consistency for consumers.
 *
 * @param props - Parameters for the rule deletion
 * @param props.adminUser - Authenticated adminUser JWT payload ({ id, type })
 * @param props.communityId - ID of the community containing the rule
 * @param props.ruleId - ID of the rule to delete
 * @returns Void
 * @throws {Error} If the rule does not exist, is not in the specified
 *   community, the community does not exist, or the adminUser is not the
 *   owner.
 */
export async function delete__communityPlatform_adminUser_communities_$communityId_rules_$ruleId(props: {
  adminUser: AdminuserPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, communityId, ruleId } = props;
  // 1. Fetch rule by id and ensure community linkage
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
      select: { id: true },
    });
  if (!rule) {
    throw new Error("Rule not found or not in this community");
  }

  // 2. Fetch the community and validate adminUser is the owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { id: true, owner_id: true },
    });
  if (!community) {
    throw new Error("Community not found");
  }
  if (community.owner_id !== adminUser.id) {
    throw new Error("Unauthorized: Only the community owner can delete rules");
  }

  // 3. Hard delete the rule
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: ruleId },
  });

  // 4. Reorder remaining rules as 1..N by rule_index ascending
  const rules =
    await MyGlobal.prisma.community_platform_community_rules.findMany({
      where: { community_id: communityId },
      orderBy: { rule_index: "asc" },
    });
  let expectedIndex = 1;
  for (const r of rules) {
    if (r.rule_index !== expectedIndex) {
      await MyGlobal.prisma.community_platform_community_rules.update({
        where: { id: r.id },
        data: { rule_index: expectedIndex },
      });
    }
    expectedIndex++;
  }
}
