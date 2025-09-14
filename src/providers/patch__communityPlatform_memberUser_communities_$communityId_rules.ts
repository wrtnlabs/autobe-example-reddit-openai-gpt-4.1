import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * List and search all rules for a specific community
 *
 * Retrieves a paginated, filtered list of rules belonging to a community as
 * referenced by communityId. Only the community owner (authenticated
 * memberUser) may view and manage the full rule list for a community. Filtering
 * is supported by substring search on rule_text and by exact match on
 * rule_index. Results are ordered by rule_index ascending as per business
 * display logic. Pagination is 0-based and enforces a maximum of 10 rules per
 * community by platform rules.
 *
 * Authorization: Only the owner of the specified community (memberUser.id ===
 * owner_id) may list all rules.
 *
 * @param props - Parameters for rule listing operation
 * @param props.memberUser - The authenticated member user (payload)
 * @param props.communityId - The UUID of the community whose rules are listed
 * @param props.body - Optional filter/pagination options
 *   (ICommunityPlatformCommunityRule.IRequest)
 * @returns Paginated rules list (IPageICommunityPlatformCommunityRule)
 * @throws {Error} If community does not exist
 * @throws {Error} If requester is not the owner of the community
 */
export async function patch__communityPlatform_memberUser_communities_$communityId_rules(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IRequest;
}): Promise<IPageICommunityPlatformCommunityRule> {
  const { memberUser, communityId, body } = props;

  // --- Ownership Verification ---
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (!community) throw new Error("Community not found");
  if (community.owner_id !== memberUser.id)
    throw new Error(
      "Unauthorized: Only the community owner can view/edit the full list of rules.",
    );

  // --- Pagination Controls ---
  const page = Number(body.page ?? 0);
  let limit = Number(body.limit ?? 10);
  if (limit > 10) limit = 10;

  // --- Build Where Filter ---
  // Only filter by allowed fields; enforce business logic
  const where = {
    community_id: communityId,
    ...(body.rule_text !== undefined && {
      rule_text: { contains: body.rule_text },
    }),
    ...(body.rule_index !== undefined && { rule_index: body.rule_index }),
  };

  // --- Parallel Query: Paginated Data and Total Count ---
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_rules.findMany({
      where,
      orderBy: { rule_index: "asc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        community_id: true,
        rule_index: true,
        rule_text: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_rules.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: records.map((r) => ({
      id: r.id,
      community_id: r.community_id,
      rule_index: r.rule_index,
      rule_text: r.rule_text,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
