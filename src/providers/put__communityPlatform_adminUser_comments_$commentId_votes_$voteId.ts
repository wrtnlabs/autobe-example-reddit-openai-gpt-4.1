import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update the vote state for a comment vote (community_platform_comment_votes)
 *
 * This endpoint allows the original admin voter to change the vote type
 * (upvote, downvote, or none) on a comment. It validates that the adminUser
 * matches the vote record's voter, and the vote_id/comment_id association is
 * correct. Only the voter admin can update their own vote. The function updates
 * the vote_type and sets updated_at to the current time.
 *
 * @param props - Properties for vote update operation
 * @param props.adminUser - The authenticated AdminuserPayload (admin user
 *   performing the update)
 * @param props.commentId - UUID of the target comment
 * @param props.voteId - UUID of the vote record to update
 * @param props.body - Object containing the updated vote_type field
 * @returns The updated ICommunityPlatformCommentVote object
 * @throws {Error} If the vote does not exist for the comment or the
 *   authenticated admin is not the original voter
 */
export async function put__communityPlatform_adminUser_comments_$commentId_votes_$voteId(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const { adminUser, commentId, voteId, body } = props;
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        id: voteId,
        comment_id: commentId,
      },
    },
  );
  if (!vote) {
    throw new Error("Vote not found for the specified comment");
  }
  if (vote.voter_adminuser_id !== adminUser.id) {
    throw new Error(
      "Permission denied: Only the admin user who cast this vote can update it.",
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: voteId },
      data: {
        vote_type: body.vote_type,
        updated_at: now,
      },
    },
  );
  return {
    id: updated.id,
    comment_id: updated.comment_id,
    voter_memberuser_id: updated.voter_memberuser_id,
    voter_adminuser_id: updated.voter_adminuser_id,
    vote_type:
      updated.vote_type === "upvote"
        ? "upvote"
        : updated.vote_type === "downvote"
          ? "downvote"
          : "none",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
