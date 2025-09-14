import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new rule for a community (community_platform_community_rules table).
 *
 * This operation enables a community admin user to add a new rule to the target
 * community's rule set. Business logic allows admin users to add rules to any
 * community, not just ones they own. Validates the existence and status of the
 * target community, enforces business limits (max 10 rules per community), and
 * automatically assigns rule ordering. All operations are performed with
 * immutable, type-safe structures. Timestamps and UUIDs conform to strict
 * branding and serialization conventions.
 *
 * @param props.adminUser - The authenticated adminUser performing the rule
 *   creation
 * @param props.communityId - The ID of the community to receive the new rule
 * @param props.body - The data for the new rule (rule_text, validated
 *   externally)
 * @returns The created community rule entity as a DTO
 * @throws {Error} When the community does not exist/is deleted or rule limit
 *   exceeded
 */
export async function post__communityPlatform_adminUser_communities_$communityId_rules(props: {
  adminUser: AdminuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { communityId, body } = props;

  // Step 1: Validate that the target community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, deleted_at: null },
    });
  if (!community) {
    throw new Error("Community not found or has been deleted");
  }

  // Step 2: Enforce business rule - cannot have more than 10 rules per community
  const currentRuleCount =
    await MyGlobal.prisma.community_platform_community_rules.count({
      where: { community_id: communityId },
    });
  if (currentRuleCount >= 10) {
    throw new Error("Cannot add more than 10 rules to a community");
  }

  // Step 3: Assign rule_index sequentially
  const rule_index = currentRuleCount + 1;

  // Step 4: Create the new rule record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: communityId,
        rule_index,
        rule_text: body.rule_text,
        created_at: now,
      },
    });

  // Step 5: Return the result as a DTO with correct brands and types
  return {
    id: created.id as string & tags.Format<"uuid">,
    community_id: created.community_id as string & tags.Format<"uuid">,
    rule_index: created.rule_index as number & tags.Type<"int32">,
    rule_text: created.rule_text as string & tags.MaxLength<100>,
    created_at: toISOStringSafe(created.created_at),
  };
}
