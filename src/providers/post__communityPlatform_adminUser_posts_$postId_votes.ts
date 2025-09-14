import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create or update a user's vote for a specific post (upvote, downvote, or
 * removal).
 *
 * Allows an authenticated admin user to submit a vote (upvote, downvote, or
 * removal) for a post. Enforces business rules: each user can only have one
 * vote per post, and admin users cannot vote on their own posts. If a vote
 * already exists for the admin user and post, the vote state is updated;
 * otherwise, a new record is created. Post must exist and not be soft deleted.
 *
 * @param props - Parameters for the vote operation.
 * @param props.adminUser - Authenticated admin user (AdminuserPayload)
 * @param props.postId - Target post UUID to vote on
 * @param props.body - Vote state request ({ post_id, vote_state })
 * @returns The resulting post vote record confirming the current vote state
 * @throws {Error} If the post does not exist, is deleted, or if the admin user
 *   attempts to vote on their own post
 */
export async function post__communityPlatform_adminUser_posts_$postId_votes(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const { adminUser, postId, body } = props;
  // Fetch the post. Ensure it exists and is not soft-deleted.
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_adminuser_id: true,
      author_memberuser_id: true,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted.");
  }
  if (post.author_adminuser_id && post.author_adminuser_id === adminUser.id) {
    throw new Error("Administrators cannot vote on their own posts.");
  }
  // Find admin user's existing vote on this post
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: postId,
        voter_adminuser_id: adminUser.id,
      },
    });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  let voteRecord;
  if (existingVote) {
    voteRecord = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_state: body.vote_state as "upvote" | "downvote" | "none",
        updated_at: now,
      },
    });
  } else {
    voteRecord = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4(),
        community_platform_post_id: postId,
        voter_adminuser_id: adminUser.id,
        voter_memberuser_id: null,
        vote_state: body.vote_state as "upvote" | "downvote" | "none",
        created_at: now,
        updated_at: now,
      },
    });
  }
  return {
    id: voteRecord.id,
    community_platform_post_id: voteRecord.community_platform_post_id,
    voter_adminuser_id: voteRecord.voter_adminuser_id,
    voter_memberuser_id: voteRecord.voter_memberuser_id,
    vote_state: voteRecord.vote_state as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(voteRecord.created_at),
    updated_at: toISOStringSafe(voteRecord.updated_at),
  };
}
