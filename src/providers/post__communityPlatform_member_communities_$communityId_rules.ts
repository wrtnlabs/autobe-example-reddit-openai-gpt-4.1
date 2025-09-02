import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Add a new rule to a specified community.
 *
 * Creates and appends a new rule for the given community. Only the community
 * owner (or admin, if expanded) can create rules; max 10 rules per community,
 * and each rule_index must be unique for the community. Throws errors if
 * constraints are violated.
 *
 * @param props - The request payload
 * @param props.member - The authenticated member (must own the community)
 * @param props.communityId - The UUID of the target community
 * @param props.body - The ICommunityPlatformCommunityRule.ICreate input; index
 *   and text
 * @returns The newly created rule, including id, association, index, and text
 * @throws {Error} If the member is not the owner of the community
 * @throws {Error} If the community already has 10 rules
 * @throws {Error} If a rule already exists for this (community, rule_index)
 */
export async function post__communityPlatform_member_communities_$communityId_rules(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { member, communityId, body } = props;

  // Authorization: Only the community owner can add rules
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: communityId },
      select: { id: true, owner_id: true },
    });
  if (community.owner_id !== member.id) {
    throw new Error("Unauthorized: Only the community owner can add rules.");
  }

  // Enforce a maximum of 10 rules per community
  const ruleCount =
    await MyGlobal.prisma.community_platform_community_rules.count({
      where: { community_id: communityId },
    });
  if (ruleCount >= 10) {
    throw new Error(
      "Community already has the maximum number of rules (10). Cannot add more.",
    );
  }

  // Check uniqueness: ensure no duplicate rule_index for this community
  const existingRule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: { community_id: communityId, rule_index: body.rule_index },
    });
  if (existingRule) {
    throw new Error(
      `Rule index ${body.rule_index} already exists for this community.`,
    );
  }

  // Create new rule with generated UUID
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: communityId,
        rule_index: body.rule_index,
        rule_line: body.rule_line,
      },
      select: {
        id: true,
        community_id: true,
        rule_index: true,
        rule_line: true,
      },
    });

  return created;
}
