import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create or update a user's vote for a specific post (upvote, downvote, or
 * removal).
 *
 * Allows an authenticated member user to submit a vote (upvote, downvote, or
 * removal) for a post. This operation first verifies the target post exists
 * (and is not deleted by soft delete), and ensures that the user is not the
 * author (self-voting is prohibited). If the user already has a vote on this
 * post, the submission updates the vote state accordingly, enforcing
 * one-vote-per-user-per-post. Otherwise, a new record is created. All datetime
 * and UUID values are handled as strictly branded types.
 *
 * @param props - The input properties for the voting operation.
 * @param props.memberUser - The authenticated member user (JWT context).
 *   Required.
 * @param props.postId - The post ID to vote on. Must be a valid UUID.
 * @param props.body - The vote submission. Requires post_id (must match postId)
 *   and vote_state (upvote, downvote, or none).
 * @returns The resulting post vote record, always reflecting the current voting
 *   state.
 * @throws {Error} If the target post does not exist or is deleted.
 * @throws {Error} If the user attempts to vote on their own post (self-vote is
 *   not allowed).
 */
export async function post__communityPlatform_memberUser_posts_$postId_votes(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const { memberUser, postId, body } = props;

  // 1. Ensure the post exists (and not soft-deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_memberuser_id: true,
      author_adminuser_id: true,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted.");
  }

  // 2. Prevent self-voting for member authors
  if (post.author_memberuser_id === memberUser.id) {
    throw new Error("You cannot vote on your own post.");
  }

  // 3. Upsert member's vote
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: postId,
        voter_memberuser_id: memberUser.id,
      },
    });

  let vote;
  if (existingVote) {
    // Update vote record: set vote_state and updated_at
    vote = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_state: body.vote_state,
        updated_at: now,
      },
    });
  } else {
    // Create vote record only if vote_state is not 'none' (remove = set to none but no record? Or always create? For audit always create)
    vote = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_post_id: postId,
        voter_memberuser_id: memberUser.id,
        voter_adminuser_id: null,
        vote_state: body.vote_state,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: vote.id,
    community_platform_post_id: vote.community_platform_post_id,
    voter_memberuser_id: vote.voter_memberuser_id,
    voter_adminuser_id: vote.voter_adminuser_id,
    vote_state: vote.vote_state as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
