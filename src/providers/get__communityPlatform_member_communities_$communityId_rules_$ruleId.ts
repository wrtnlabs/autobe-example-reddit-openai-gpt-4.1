import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get a specific rule from a community.
 *
 * Retrieves a single rule from the specified community for inspection or edit
 * preparation. The rule is identified by ruleId, which is unique per rule row,
 * and is returned with its index and text. This enables direct access for
 * per-rule display, edit UI, and policy review interfaces.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request
 *   (authorization is enforced at a higher business logic layer)
 * @param props.communityId - The UUID of the parent community owning the rule
 * @param props.ruleId - The UUID of the specific rule to retrieve
 * @returns The rule record with id, community_id, rule_index, and rule_line
 * @throws {Error} When the rule is not found for the given communityId and
 *   ruleId combination
 */
export async function get__communityPlatform_member_communities_$communityId_rules_$ruleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityRule> {
  const { communityId, ruleId } = props;
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
      select: {
        id: true,
        community_id: true,
        rule_index: true,
        rule_line: true,
      },
    });
  if (!rule) {
    throw new Error("Rule not found");
  }
  return rule;
}
