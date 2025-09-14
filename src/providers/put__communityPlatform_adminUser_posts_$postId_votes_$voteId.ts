import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update the current admin user's existing vote on a specific post (upvote,
 * downvote, or removal).
 *
 * Allows an authenticated admin user to update or remove their vote on a given
 * post, enforcing business rule constraints. The operation first verifies the
 * vote exists, belongs to the current admin, applies only to the given post,
 * and that the admin is not attempting to vote on their own post.
 *
 * @param props - Request properties for vote update operation
 * @param props.adminUser - Authenticated admin user performing the vote update
 * @param props.postId - UUID of the post being voted on
 * @param props.voteId - UUID of the specific vote record to update
 * @param props.body - Vote update payload (new vote state value)
 * @returns The updated post vote record reflecting new state
 * @throws {Error} If vote does not exist, does not belong to admin, is not on
 *   the given post, or if voting on own post
 */
export async function put__communityPlatform_adminUser_posts_$postId_votes_$voteId(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const { adminUser, postId, voteId, body } = props;

  // Fetch the vote
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new Error("Vote not found");

  // Ownership check: must belong to the current admin user
  if (vote.voter_adminuser_id !== adminUser.id) {
    throw new Error(
      "Unauthorized: Only the vote owner admin can update the vote.",
    );
  }

  // Vote must be for the specified post
  if (vote.community_platform_post_id !== postId) {
    throw new Error("Vote record does not match the requested post.");
  }

  // Fetch the target post
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");

  // Prevent self-voting (admins cannot vote on their own post)
  if (post.author_adminuser_id === adminUser.id) {
    throw new Error("Admin users cannot vote on their own posts.");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Update the vote (fix for enum type safety)
  const updated = await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: voteId },
    data: {
      vote_state: body.vote_state as "upvote" | "downvote" | "none",
      updated_at: now,
    },
  });

  // Return with all fields, normalizing dates for output type
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    voter_memberuser_id: updated.voter_memberuser_id ?? undefined,
    voter_adminuser_id: updated.voter_adminuser_id ?? undefined,
    vote_state: updated.vote_state as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
