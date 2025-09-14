import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Delete a comment vote (community_platform_comment_votes)
 *
 * This endpoint deletes a vote on a comment as identified by voteId. It removes
 * the vote record from the community_platform_comment_votes table. Only the
 * original voting member user may perform this action; attempts by other users
 * result in an error. There is no response body on success. Errors are raised
 * if not found or unauthorized.
 *
 * @param props - Properties for vote deletion
 * @param props.memberUser - The authenticated member user attempting deletion
 * @param props.commentId - Unique identifier for the parent comment
 * @param props.voteId - Unique identifier for the vote to delete
 * @returns Void
 * @throws {Error} If the vote is not found
 * @throws {Error} If the vote does not correspond to the specified comment
 * @throws {Error} If the authenticated user is not the vote owner
 */
export async function delete__communityPlatform_memberUser_comments_$commentId_votes_$voteId(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, commentId, voteId } = props;

  // Step 1: Fetch the vote record
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: voteId },
    });
  if (!vote) {
    throw new Error("Vote not found");
  }

  // Step 2: Validate comment-vote relationship
  if (vote.comment_id !== commentId) {
    throw new Error("Vote does not belong to the specified comment");
  }

  // Step 3: Authorization - Only the voter may delete their own vote
  if (vote.voter_memberuser_id !== memberUser.id) {
    throw new Error("Unauthorized: Only the vote owner may delete their vote");
  }

  // Step 4: Delete the record (hard delete)
  await MyGlobal.prisma.community_platform_comment_votes.delete({
    where: { id: voteId },
  });
  return;
}
