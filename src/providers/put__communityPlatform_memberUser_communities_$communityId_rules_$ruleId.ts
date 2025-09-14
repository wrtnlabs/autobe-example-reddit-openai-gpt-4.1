import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update a specific community rule (community_platform_community_rules table).
 *
 * Allows the owner of a community—authenticated as memberUser—to update the
 * rule_text of a given rule in their community, enforcing business rules and
 * proper authorization. Only the owner of the community may perform the update,
 * and communities must not be soft deleted (deleted_at must be null). Provides
 * strict type and business safety, returning the updated rule with correct
 * field branding and auditability.
 *
 * @param props - MemberUser: The authenticated MemberuserPayload for the owner
 *   performing update communityId: The UUID of the community containing the
 *   rule ruleId: The UUID of the rule to update body: Object with the new
 *   rule_text (optional, if omitted no change)
 * @returns The updated community rule as ICommunityPlatformCommunityRule, with
 *   proper branding
 * @throws {Error} If the rule does not exist, is not part of the given
 *   community, the community is not found or is deleted, or the user is not the
 *   owner
 */
export async function put__communityPlatform_memberUser_communities_$communityId_rules_$ruleId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { memberUser, communityId, ruleId, body } = props;

  // Fetch the rule under the given community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
    });
  if (!rule) {
    throw new Error("Rule not found or does not belong to the given community");
  }

  // Fetch the community (to check ownership and soft delete)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
      },
    });
  if (!community) {
    throw new Error("Community not found");
  }
  if (community.deleted_at !== null) {
    throw new Error("Community has been deleted");
  }

  // Authorization: Only the owner can update
  if (community.owner_id !== memberUser.id) {
    throw new Error("Only the owner can update rules for this community");
  }

  // Perform the update - only rule_text can be changed
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: ruleId },
      data: {
        rule_text: body.rule_text ?? undefined,
      },
    });

  // Return object with correct brands and type structure
  return {
    id: updated.id,
    community_id: updated.community_id,
    rule_index: updated.rule_index,
    rule_text: updated.rule_text,
    created_at: toISOStringSafe(updated.created_at),
  };
}
