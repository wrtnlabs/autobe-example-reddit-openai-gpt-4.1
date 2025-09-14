import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update the current user's existing vote on a specific post (upvote, downvote,
 * or removal).
 *
 * Allows an authenticated member user to change or remove their vote for a
 * given post. This operation verifies that the vote exists, belongs to the
 * calling user, and that the user is not attempting to vote on their own post
 * (self-voting is not allowed). Updates the voting state (upvote, downvote, or
 * none), enforcing all business and authorization rules. Returns the updated
 * vote record.
 *
 * @param props - The properties for this operation.
 * @param props.memberUser - The authenticated member user payload.
 * @param props.postId - UUID of the target post.
 * @param props.voteId - UUID of the vote to update.
 * @param props.body - The DTO containing the new vote state (upvote, downvote,
 *   none).
 * @returns The updated ICommunityPlatformPostVote reflecting the user's new
 *   vote state.
 * @throws {Error} If the vote does not exist, does not match the post, does not
 *   belong to the user, or if self-voting is attempted.
 */
export async function put__communityPlatform_memberUser_posts_$postId_votes_$voteId(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const { memberUser, postId, voteId, body } = props;
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new Error("Vote not found");
  if (vote.community_platform_post_id !== postId)
    throw new Error("Vote/post mismatch");
  if (vote.voter_memberuser_id !== memberUser.id)
    throw new Error("Forbidden: vote does not belong to you");
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");
  if (post.author_memberuser_id === memberUser.id)
    throw new Error("Forbidden: cannot vote on your own post");
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: voteId },
    data: {
      vote_state: body.vote_state,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    voter_memberuser_id: updated.voter_memberuser_id ?? undefined,
    voter_adminuser_id: updated.voter_adminuser_id ?? undefined,
    vote_state:
      updated.vote_state === "upvote"
        ? "upvote"
        : updated.vote_state === "downvote"
          ? "downvote"
          : "none",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
