import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create or update a vote for a post or comment.
 *
 * Allows an admin to create or update their vote (upvote, downvote, or neutral)
 * on a post or comment. Only one vote per admin/target is retained; submitting
 * a new vote overwrites any prior one. It is forbidden to vote on your own
 * content. Returns the updated voting record.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user
 * @param props.body - Vote creation info: target post/comment and vote value
 * @returns The created or updated vote record reflecting latest state
 * @throws {Error} When voting on own content, when target does not exist, or if
 *   request is invalid
 */
export async function post__communityPlatform_admin_votes(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  const { admin, body } = props;
  const { post_id, comment_id, value } = body;

  // Must specify exactly one of post_id or comment_id
  if (
    (post_id == null && comment_id == null) ||
    (post_id != null && comment_id != null)
  ) {
    throw new Error("You must specify exactly one of post_id or comment_id.");
  }

  // Value integrity
  if (value !== 1 && value !== -1 && value !== 0) {
    throw new Error("Vote value must be 1, -1, or 0.");
  }

  // Ownership check: Cannot vote on own post/comment
  let targetAuthorId: string & tags.Format<"uuid">;
  if (post_id) {
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: post_id },
        select: { id: true, author: { select: { id: true } } },
      });
    targetAuthorId = post.author.id as string & tags.Format<"uuid">;
  } else {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: comment_id! },
        select: { id: true, author: { select: { id: true } } },
      });
    targetAuthorId = comment.author.id as string & tags.Format<"uuid">;
  }

  if (admin.id === targetAuthorId) {
    throw new Error("Voting on your own post or comment is not allowed.");
  }

  // Find existing vote for this target by admin
  const existingVote = await MyGlobal.prisma.community_platform_votes.findFirst(
    {
      where: {
        voter_id: admin.id,
        post_id: post_id ?? undefined,
        comment_id: comment_id ?? undefined,
      },
    },
  );

  const now = toISOStringSafe(new Date());
  let vote;
  if (existingVote) {
    vote = await MyGlobal.prisma.community_platform_votes.update({
      where: { id: existingVote.id },
      data: {
        value,
        updated_at: now,
      },
    });
  } else {
    vote = await MyGlobal.prisma.community_platform_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        voter_id: admin.id,
        post_id: post_id ?? null,
        comment_id: comment_id ?? null,
        value,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: vote.id as string & tags.Format<"uuid">,
    voter_id: vote.voter_id as string & tags.Format<"uuid">,
    post_id: vote.post_id as (string & tags.Format<"uuid">) | null,
    comment_id: vote.comment_id as (string & tags.Format<"uuid">) | null,
    value: vote.value as 1 | -1 | 0,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
