import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update a specific community rule (community_platform_community_rules table).
 *
 * Updates the rule_text of a given community rule if the requester is the owner
 * of the community (adminUser). Enforces ownership, community existence,
 * non-deletion status, and that the rule belongs to the specified community.
 * Business logic ensures rule_index and association are immutable; only
 * rule_text is updatable.
 *
 * @param props - Properties for the update operation
 * @param props.adminUser - The authenticated admin user making the request
 * @param props.communityId - UUID of the parent community of the rule
 * @param props.ruleId - UUID of the rule to update
 * @param props.body - The update payload (may include rule_text)
 * @returns The updated community rule (id, community_id, rule_index, rule_text,
 *   created_at)
 * @throws {Error} If the rule or community does not exist, is deleted, or user
 *   is unauthorized
 */
export async function put__communityPlatform_adminUser_communities_$communityId_rules_$ruleId(props: {
  adminUser: AdminuserPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { adminUser, communityId, ruleId, body } = props;

  // 1. Find the target rule within the given community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
    });
  if (!rule)
    throw new Error(
      "Rule not found or does not belong to the given community.",
    );

  // 2. Confirm community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId },
    });
  if (!community) throw new Error("Community not found.");
  if (community.deleted_at !== null)
    throw new Error("Community has been deleted.");

  // 3. Auth: only owner admin may update
  if (community.owner_id !== adminUser.id) {
    throw new Error("Only the community owner may update rules.");
  }

  // 4. Update rule_text only
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: ruleId },
      data: {
        rule_text: body.rule_text ?? rule.rule_text,
      },
    });

  // 5. Return API DTO with all dates as branded ISO strings
  return {
    id: updated.id,
    community_id: updated.community_id,
    rule_index: updated.rule_index,
    rule_text: updated.rule_text,
    created_at: toISOStringSafe(updated.created_at),
  };
}
