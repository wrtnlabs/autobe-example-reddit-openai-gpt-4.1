import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function patch__communityPlatform_posts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { body } = props;
  // Normalize page/limit with defaults and constraints:
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;

  // Validate keyword (if present):
  if (
    body.keyword != null &&
    body.keyword.length > 0 &&
    body.keyword.length < 2
  ) {
    throw new Error("Search keyword must be at least 2 characters.");
  }
  // Build where clause for Prisma:
  const where = {
    deleted_at: null,
    ...(body.community_ids != null && body.community_ids.length > 0
      ? { community_platform_community_id: { in: body.community_ids } }
      : {}),
    ...(body.author_user_ids != null && body.author_user_ids.length > 0
      ? {
          OR: [
            { author_memberuser_id: { in: body.author_user_ids } },
            { author_adminuser_id: { in: body.author_user_ids } },
          ],
        }
      : {}),
    ...(body.keyword != null && body.keyword.length >= 2
      ? {
          OR: [
            { title: { contains: body.keyword } },
            { body: { contains: body.keyword } },
          ],
        }
      : {}),
  };
  // Main search/sort logic:
  let posts: Awaited<
    ReturnType<typeof MyGlobal.prisma.community_platform_posts.findMany>
  > = [];
  let total: number = 0;
  if (body.sort_order === "top") {
    // For 'top', must sort by (score, created_at, id) in app logic:
    // Fetch more than limit to compensate for score-based post filtering
    const candidates = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (Number(page) - 1) * Number(limit),
      take: Math.max(100, Number(limit) * 3),
    });
    const candidateIds = candidates.map((post) => post.id);
    // Find all votes for these posts:
    const votes =
      candidateIds.length > 0
        ? await MyGlobal.prisma.community_platform_post_votes.findMany({
            where: {
              community_platform_post_id: { in: candidateIds },
            },
          })
        : [];
    // Aggregate scores:
    const scoreMap: Record<string, number> = {};
    for (const id of candidateIds) {
      scoreMap[id] = 0;
    }
    for (const vote of votes) {
      if (vote.vote_state === "upvote")
        scoreMap[vote.community_platform_post_id]++;
      else if (vote.vote_state === "downvote")
        scoreMap[vote.community_platform_post_id]--;
    }
    // Sort by score, then created_at desc, then id desc
    candidates.sort((a, b) => {
      const sb = scoreMap[b.id] || 0;
      const sa = scoreMap[a.id] || 0;
      if (sb !== sa) return sb - sa;
      if (a.created_at > b.created_at) return -1;
      if (a.created_at < b.created_at) return 1;
      if (a.id > b.id) return -1;
      if (a.id < b.id) return 1;
      return 0;
    });
    posts = candidates.slice(0, Number(limit));
    total = await MyGlobal.prisma.community_platform_posts.count({ where });
  } else {
    // "newest" or default sort:
    [posts, total] = await Promise.all([
      MyGlobal.prisma.community_platform_posts.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      MyGlobal.prisma.community_platform_posts.count({ where }),
    ]);
  }
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: posts.map((post) => ({
      id: post.id,
      community_platform_community_id: post.community_platform_community_id,
      title: post.title,
      author_display_name: post.author_display_name ?? null,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
    })),
  };
}
