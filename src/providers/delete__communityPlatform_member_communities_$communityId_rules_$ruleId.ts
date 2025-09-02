import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Permanently deletes a rule from a community by ID, enforcing authorization
 * for community owners only.
 *
 * Only the community owner can delete rules. This is a hard delete operation;
 * the rule is completely removed from the database with no recovery possible.
 * If the rule or community does not exist, or the member is not authorized (not
 * the owner), appropriate errors are thrown.
 *
 * @param props - Function parameters.
 * @param props.member - The authenticated member making the request. Must be
 *   the community owner.
 * @param props.communityId - The UUID of the community from which to delete the
 *   rule.
 * @param props.ruleId - The UUID of the rule to delete from the community.
 * @returns Void
 * @throws {Error} Rule not found in given community
 * @throws {Error} Community does not exist
 * @throws {Error} Unauthorized if member is not the community owner
 */
export async function delete__communityPlatform_member_communities_$communityId_rules_$ruleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, communityId, ruleId } = props;
  // 1. Find the rule and check it belongs to the given community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
    });
  if (!rule) {
    throw new Error(
      "Rule not found or does not belong to the specified community",
    );
  }

  // 2. Fetch the parent community to check for ownership
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (!community) {
    throw new Error("Community does not exist");
  }

  // 3. Only the owner may delete rules (no admin override business rule is assumed here)
  if (community.owner_id !== member.id) {
    throw new Error(
      "Unauthorized: Only the community owner can delete community rules",
    );
  }

  // 4. Perform the hard delete
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: ruleId },
  });
}
