import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create or update a vote for a post or comment.
 *
 * This operation allows an authenticated member to cast (or update) a single
 * vote (upvote/downvote/neutral) on either a post or a comment, ensuring
 * uniqueness per voter-target. If a previous vote exists, it is overwritten.
 * Voting on own content is forbidden. Duplicate/concurrent votes overwrite
 * previous state. Returns the created or updated voting record with all fields
 * populated.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member performing the vote
 * @param props.body - Vote creation info: voter, target post/comment, and vote
 *   value
 * @returns The created or updated vote record with computed value and
 *   timestamps
 * @throws {Error} When attempting to vote on own content, missing target, or if
 *   target does not exist
 */
export async function post__communityPlatform_member_votes(props: {
  member: MemberPayload;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  const { member, body } = props;
  // Validate exclusive presence of exactly one of post_id or comment_id
  const isPost = body.post_id !== undefined && body.post_id !== null;
  const isComment = body.comment_id !== undefined && body.comment_id !== null;
  if ((isPost ? 1 : 0) + (isComment ? 1 : 0) !== 1) {
    throw new Error("Exactly one of post_id or comment_id must be provided.");
  }
  const now = toISOStringSafe(new Date());
  // Validate existence of target and prevent self-voting
  if (isPost) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: { id: body.post_id!, deleted_at: null },
      select: { community_platform_member_id: true },
    });
    if (!post) throw new Error("Target post does not exist");
    if (post.community_platform_member_id === member.id) {
      throw new Error("You cannot vote on your own post.");
    }
  } else {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: { id: body.comment_id!, deleted_at: null },
        select: { author_id: true },
      },
    );
    if (!comment) throw new Error("Target comment does not exist");
    if (comment.author_id === member.id) {
      throw new Error("You cannot vote on your own comment.");
    }
  }
  // Find existing, active (non-deleted) vote for (voter, target)
  const existing = await MyGlobal.prisma.community_platform_votes.findFirst({
    where: {
      voter_id: member.id,
      post_id: body.post_id ?? null,
      comment_id: body.comment_id ?? null,
      deleted_at: null,
    },
  });
  if (existing) {
    // Update vote value (not created_at)
    const updated = await MyGlobal.prisma.community_platform_votes.update({
      where: { id: existing.id },
      data: {
        value: body.value,
        updated_at: now,
      },
    });
    return {
      id: updated.id as string & tags.Format<"uuid">,
      voter_id: updated.voter_id as string & tags.Format<"uuid">,
      post_id: updated.post_id ?? null,
      comment_id: updated.comment_id ?? null,
      value: updated.value as 1 | -1 | 0,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } else {
    // Create new vote record
    const created = await MyGlobal.prisma.community_platform_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        voter_id: member.id,
        post_id: body.post_id ?? null,
        comment_id: body.comment_id ?? null,
        value: body.value,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id as string & tags.Format<"uuid">,
      voter_id: created.voter_id as string & tags.Format<"uuid">,
      post_id: created.post_id ?? null,
      comment_id: created.comment_id ?? null,
      value: created.value as 1 | -1 | 0,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  }
}
