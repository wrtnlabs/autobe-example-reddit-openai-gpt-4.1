import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete the current admin user's own vote on a specific post (vote
 * soft-delete).
 *
 * Allows an authenticated admin user to remove their own vote from a post by
 * setting vote_state to 'none'. Operation ensures the vote exists for the
 * target post, is owned by the requesting admin, and that the admin is not
 * removing a vote from their own post (self-voting is prohibited). If any
 * validation fails, an error is thrown.
 *
 * @param props - Operation context including:
 *
 *   - AdminUser: The authenticated admin user (AdminuserPayload)
 *   - PostId: The post from which the vote is to be removed
 *   - VoteId: The vote record to update (must belong to this admin user and this
 *       post)
 *
 * @returns Void (no value on success)
 * @throws Error when the vote is not found, not owned by admin, or post does
 *   not allow removing this vote
 */
export async function delete__communityPlatform_adminUser_posts_$postId_votes_$voteId(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, postId, voteId } = props;

  // Fetch the vote and verify it belongs to the current admin user and correct post
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: voteId },
    select: {
      id: true,
      community_platform_post_id: true,
      voter_adminuser_id: true,
      vote_state: true,
    },
  });
  if (!vote || vote.community_platform_post_id !== postId) {
    throw new Error("Vote not found or does not belong to this post");
  }
  if (vote.voter_adminuser_id !== adminUser.id) {
    throw new Error("You are only allowed to remove your own vote");
  }

  // Fetch the post to enforce self-vote ban
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: { id: true, author_adminuser_id: true },
  });
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.author_adminuser_id === adminUser.id) {
    throw new Error("You cannot remove votes from your own post");
  }

  // Set the vote_state to 'none' and updated_at accordingly
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: voteId },
    data: {
      vote_state: "none",
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
