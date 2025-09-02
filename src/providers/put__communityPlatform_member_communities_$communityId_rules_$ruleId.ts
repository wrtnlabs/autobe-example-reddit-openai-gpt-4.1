import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Edit a specific rule for a given community.
 *
 * Updates the content or ordering of a community rule. Requires the rule to be
 * identified by ruleId within communityId, both provided as path parameters.
 * Only community owners and admins can edit or reorder community rules; all
 * changes must comply with maximum length (50 chars) and rule ordering business
 * constraints. This allows owners to maintain, correct, or clarify their rules
 * as community needs change.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member (MUST be the owner of the
 *   community)
 * @param props.communityId - UUID of the parent community which owns the rule
 * @param props.ruleId - UUID of the rule to update
 * @param props.body - Fields to update (rule_index, rule_line)
 * @returns The updated rule as ICommunityPlatformCommunityRule
 * @throws {Error} If the community does not exist
 * @throws {Error} If the member is not the owner of the community
 * @throws {Error} If the target rule does not exist
 * @throws {Error} If the rule is not associated with the target community
 */
export async function put__communityPlatform_member_communities_$communityId_rules_$ruleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { member, communityId, ruleId, body } = props;

  // Fetch the community and make sure the requesting member is the owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { id: true, owner_id: true },
    });
  if (!community) throw new Error("Community not found");
  if (community.owner_id !== member.id) {
    throw new Error(
      "Forbidden: Only the community owner can edit or reorder rules",
    );
  }

  // Fetch the rule and ensure it belongs to the community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findUnique({
      where: { id: ruleId },
      select: { id: true, community_id: true },
    });
  if (!rule) throw new Error("Rule not found");
  if (rule.community_id !== communityId) {
    throw new Error("Rule does not belong to the specified community");
  }

  // Update the rule (partial - only provided fields)
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: ruleId },
      data: {
        rule_index: body.rule_index ?? undefined,
        rule_line: body.rule_line ?? undefined,
      },
    });

  return {
    id: updated.id,
    community_id: updated.community_id,
    rule_index: updated.rule_index,
    rule_line: updated.rule_line,
  };
}
