import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Retrieve details of a specific community rule
 * (community_platform_community_rules table).
 *
 * Retrieves the details of a specific rule belonging to a community within the
 * platform. This operation queries the community_platform_community_rules table
 * using both the rule's unique ID (ruleId) and the parent community's ID
 * (communityId).
 *
 * All users (guests, members, admins) can view community rules—no
 * authentication required. The function ensures that the returned rule is
 * within the correct community context by composite matching. Returns the
 * rule's id, community_id, sequential rule_index, rule_text, and created_at
 * timestamp. If no such rule exists, an error is thrown ("not found"). All
 * date/datetime and UUID values are returned using strict type branding.
 *
 * @param props - Object containing required parameters
 * @param props.communityId - The UUID of the community containing the rule
 * @param props.ruleId - The UUID of the rule being retrieved
 * @returns The full ICommunityPlatformCommunityRule object for the specified
 *   rule
 * @throws {Error} If the rule or its parent community does not exist, or if the
 *   rule does not belong to the given community
 */
export async function get__communityPlatform_communities_$communityId_rules_$ruleId(props: {
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityRule> {
  const { communityId, ruleId } = props;
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirstOrThrow({
      where: {
        id: ruleId,
        community_id: communityId,
      },
      select: {
        id: true,
        community_id: true,
        rule_index: true,
        rule_text: true,
        created_at: true,
      },
    });
  return {
    id: rule.id,
    community_id: rule.community_id,
    rule_index: rule.rule_index,
    rule_text: rule.rule_text,
    created_at: toISOStringSafe(rule.created_at),
  };
}
