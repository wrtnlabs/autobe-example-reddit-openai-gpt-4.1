import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Delete the current user's own vote on a specific post.
 *
 * This operation allows an authenticated member user to remove their own vote
 * from a specified post. The function ensures that the vote exists, is owned by
 * the current user, and is for the correct post. It enforces business rules:
 * only the vote owner can remove the vote, and users cannot remove their vote
 * on their own posts (self-vote restriction). Vote removal is performed by
 * setting the vote_state field to 'none' and updating the updated_at timestamp,
 * which effectively nullifies the vote as per platform logic.
 *
 * @param props - Object containing all parameters for the operation.
 * @param props.memberUser - Authenticated member user's payload (provides
 *   member user ID).
 * @param props.postId - The UUID of the post from which the vote is to be
 *   removed.
 * @param props.voteId - The UUID of the vote record to modify.
 * @returns Void (no content)
 * @throws {Error} If the vote does not exist, does not belong to the current
 *   user, isn't for the specified post, or is a self-vote.
 */
export async function delete__communityPlatform_memberUser_posts_$postId_votes_$voteId(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, postId, voteId } = props;
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new Error("Vote not found");
  if (
    vote.voter_memberuser_id !== memberUser.id ||
    vote.community_platform_post_id !== postId
  )
    throw new Error("Not authorized to delete this vote");
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");
  if (post.author_memberuser_id === memberUser.id)
    throw new Error("You cannot remove your vote from your own post");
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: voteId },
    data: {
      vote_state: "none",
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
