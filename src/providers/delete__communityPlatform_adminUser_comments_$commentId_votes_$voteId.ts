import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete a comment vote (community_platform_comment_votes)
 *
 * This endpoint allows an admin user to delete a vote (upvote or downvote) on a
 * comment, provided the authenticated admin is the one who cast the vote. Only
 * the original voter (admin) is permitted to remove their vote. This operation
 * performs a hard delete, permanently removing the vote record from the
 * system.
 *
 * Authorization: Only the vote owner (voter_adminuser_id) may delete their own
 * vote. Attempts by other admin users or non-owners will fail with an error.
 * The function returns void on success. If the vote does not exist for the
 * given IDs, an error is thrown.
 *
 * @param props - Function parameters
 * @param props.adminUser - Authenticated AdminuserPayload (actor)
 * @param props.commentId - UUID of the comment that owns the vote
 * @param props.voteId - UUID of the vote to delete
 * @returns Void
 * @throws {Error} If the vote does not exist, comment and vote mismatch, or
 *   actor is not owner
 */
export async function delete__communityPlatform_adminUser_comments_$commentId_votes_$voteId(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, commentId, voteId } = props;

  // Step 1: Fetch the vote by its ID and the comment it belongs to
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        id: voteId,
        comment_id: commentId,
      },
    },
  );
  if (!vote) {
    throw new Error("Vote not found for this comment");
  }

  // Step 2: Ensure the adminUser owns the vote
  if (vote.voter_adminuser_id !== adminUser.id) {
    throw new Error("Forbidden: you may only delete your own vote");
  }

  // Step 3: Hard delete the vote record
  await MyGlobal.prisma.community_platform_comment_votes.delete({
    where: { id: voteId },
  });
  // No response body as per spec
}
