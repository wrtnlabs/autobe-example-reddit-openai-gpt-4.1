import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get a specific vote on a comment (community_platform_comment_votes)
 *
 * This endpoint returns the details of a specific comment vote as identified by
 * voteId and associated with the given commentId. It retrieves the record from
 * the community_platform_comment_votes table, including the voter, vote_type
 * (upvote, downvote, none), and audit metadata for review or moderation. Only
 * authorized admin users may invoke this operation. If the vote is not found
 * with the exact id and comment_id, an error is thrown.
 *
 * @param props - Request parameters
 * @param props.adminUser - The authenticated admin user invoking this operation
 * @param props.commentId - Unique identifier of the parent comment
 * @param props.voteId - Unique identifier of the comment vote to retrieve
 * @returns The full details of the comment vote matching voteId and commentId
 * @throws {Error} If no vote exists with the specified voteId and commentId
 */
export async function get__communityPlatform_adminUser_comments_$commentId_votes_$voteId(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const { commentId, voteId } = props;

  const found =
    await MyGlobal.prisma.community_platform_comment_votes.findFirstOrThrow({
      where: {
        id: voteId,
        comment_id: commentId,
      },
    });

  let vote_type: "upvote" | "downvote" | "none";
  if (
    found.vote_type === "upvote" ||
    found.vote_type === "downvote" ||
    found.vote_type === "none"
  ) {
    vote_type = found.vote_type;
  } else {
    throw new Error(`Invalid vote_type value: ${found.vote_type}`);
  }

  return {
    id: found.id,
    comment_id: found.comment_id,
    voter_memberuser_id: found.voter_memberuser_id ?? null,
    voter_adminuser_id: found.voter_adminuser_id ?? null,
    vote_type,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
