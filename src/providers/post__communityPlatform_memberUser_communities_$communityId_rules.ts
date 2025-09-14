import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create a new rule for a community (community_platform_community_rules table).
 *
 * This operation enables a community owner to add a new rule to their
 * community’s rule set as stored in the database. Only the owner of the
 * community may perform this action. The system enforces a maximum of 10 rules
 * per community and sequential rule_index. Rule text is validated per platform
 * and schema requirements. All date fields are serialized to ISO strings as
 * required by the API and business contract.
 *
 * @param props - Operation arguments
 * @param props.memberUser - JWT payload of the authenticated member user (must
 *   be the community owner)
 * @param props.communityId - UUID of the community to add a rule to
 * @param props.body - Rule creation DTO with rule_text (enforced <=100 chars)
 * @returns The created rule object (with id, community_id, rule_index,
 *   rule_text, created_at)
 * @throws {Error} If the community does not exist, is deleted, or the member is
 *   not the owner, or max rules exceeded
 */
export async function post__communityPlatform_memberUser_communities_$communityId_rules(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { memberUser, communityId, body } = props;

  // Fetch and verify the community exists and is active (not soft-deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
      select: { id: true, owner_id: true },
    });
  if (!community) throw new Error("Community not found or has been deleted");

  // Validate owner
  if (community.owner_id !== memberUser.id)
    throw new Error("Only the community owner may add rules");

  // Count current rules; business limit is 10
  const existingCount =
    await MyGlobal.prisma.community_platform_community_rules.count({
      where: { community_id: communityId },
    });
  if (existingCount >= 10)
    throw new Error("No more than 10 rules may exist per community");

  const nextRuleIndex = existingCount + 1;

  // All UUID/datetimes must be string & tags.Format<...>
  const now = toISOStringSafe(new Date());
  const ruleId = v4() as string & tags.Format<"uuid">;

  // Compose input for creation - satisfies pattern for DTO safety
  const newRule = {
    id: ruleId,
    community_id: communityId,
    rule_index: nextRuleIndex,
    rule_text: body.rule_text,
    created_at: now,
  } satisfies ICommunityPlatformCommunityRule;

  // Create in DB and return (returned values might be technically redundant due to function signature)
  await MyGlobal.prisma.community_platform_community_rules.create({
    data: newRule,
  });

  return newRule;
}
