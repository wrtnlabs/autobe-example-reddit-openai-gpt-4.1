import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create a new vote (upvote, downvote, none) on a comment for an authenticated
 * member user.
 *
 * Allows a member user to cast or update their vote for a specific comment.
 * Only one vote per (member user, comment) pair is allowed, updated in place.
 * Users cannot vote on their own comments. The resulting object always returns
 * the full vote record.
 *
 * @param props - The voting request properties
 * @param props.memberUser - The authenticated member user (JWT payload)
 * @param props.commentId - Target comment UUID
 * @param props.body - Vote creation payload ({ comment_id, vote_type })
 * @returns The created or updated comment vote record
 * @throws {Error} When comment not found
 * @throws {Error} When voting on own comment
 */
export async function post__communityPlatform_memberUser_comments_$commentId_votes(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  const { memberUser, commentId, body } = props;

  // Fetch the target comment and ensure it exists/non-self
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: commentId },
    select: { id: true, author_memberuser_id: true },
  });
  if (!comment) throw new Error("Comment does not exist");
  if (
    comment.author_memberuser_id &&
    comment.author_memberuser_id === memberUser.id
  ) {
    throw new Error("You cannot vote on your own comment");
  }

  // Validate vote_type strictly as allowed enum
  if (!["upvote", "downvote", "none"].includes(body.vote_type)) {
    throw new Error("Invalid vote_type");
  }
  const voteType = body.vote_type as "upvote" | "downvote" | "none";

  // Check for existing vote by this user for this comment
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        comment_id: commentId,
        voter_memberuser_id: memberUser.id,
      },
    });

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  if (existingVote) {
    const updated =
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: voteType,
          updated_at: now,
        },
      });
    return {
      id: updated.id,
      comment_id: updated.comment_id,
      voter_memberuser_id: updated.voter_memberuser_id ?? null,
      voter_adminuser_id: null,
      vote_type: updated.vote_type as "upvote" | "downvote" | "none",
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  }
  // New vote
  const created = await MyGlobal.prisma.community_platform_comment_votes.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        comment_id: commentId,
        voter_memberuser_id: memberUser.id,
        vote_type: voteType,
        created_at: now,
        updated_at: now,
      },
    },
  );
  return {
    id: created.id,
    comment_id: created.comment_id,
    voter_memberuser_id: created.voter_memberuser_id ?? null,
    voter_adminuser_id: null,
    vote_type: created.vote_type as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
