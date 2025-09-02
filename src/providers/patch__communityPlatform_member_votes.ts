import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve paginated, filtered vote records across posts and comments.
 *
 * This operation retrieves a filtered and paginated list of all votes cast on
 * posts or comments, supporting advanced searching and aggregation. It operates
 * on the community_platform_votes table, which stores all user votes (upvote,
 * downvote, neutral) associated with posts or comments. The search supports
 * flexible filter criteria such as voter ID, post/comment ID, value, and
 * creation date, as well as sorting and pagination. This endpoint is typically
 * used in moderation dashboards, analytics, or user voting history views.
 * Role-based access control allows users to view their voting history, while
 * admins can see all voting records.
 *
 * @param props - Request parameters
 * @param props.member - The authenticated member performing the query. Result
 *   is always restricted to this member's own votes.
 * @param props.body - Advanced filter, search, and pagination criteria for
 *   votes
 * @returns Paginated list of vote summaries matching filter/search criteria
 * @throws {Error} If an invalid value is detected (not 1, 0, or -1)
 */
export async function patch__communityPlatform_member_votes(props: {
  member: MemberPayload;
  body: ICommunityPlatformVote.IRequest;
}): Promise<IPageICommunityPlatformVote.ISummary> {
  const { member, body } = props;

  // Pagination controls
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Authorization: enforce voter_id always matches the authenticated member only
  // No cross-user leaks even if body.voter_id is provided (ignored for members)
  const where = {
    deleted_at: null,
    voter_id: member.id,
    ...(body.post_id !== undefined && {
      post_id: body.post_id,
    }),
    ...(body.comment_id !== undefined && {
      comment_id: body.comment_id,
    }),
    ...(body.value !== undefined && {
      value: body.value,
    }),
  };

  // Sort: allow explicit created_at_asc, otherwise default to created_at desc
  const orderBy =
    body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  // Total count for pagination
  const total = await MyGlobal.prisma.community_platform_votes.count({ where });

  // Paginated vote records for this page
  const records = await MyGlobal.prisma.community_platform_votes.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      voter_id: true,
      post_id: true,
      comment_id: true,
      value: true,
      created_at: true,
    },
  });

  // Defensive mapping: ensure value always matches 1|-1|0
  const data = records.map((row): ICommunityPlatformVote.ISummary => {
    // If application integrity is ever violated, throw
    if (row.value !== 1 && row.value !== 0 && row.value !== -1) {
      throw new Error(`Invalid vote value: ${row.value}`);
    }
    return {
      id: row.id as string & tags.Format<"uuid">,
      voter_id: row.voter_id as string & tags.Format<"uuid">,
      post_id: row.post_id ?? null,
      comment_id: row.comment_id ?? null,
      value: row.value as 1 | 0 | -1,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
