import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function put__communityPlatform_memberUser_comments_$commentId_votes_$voteId(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const { memberUser, commentId, voteId, body } = props;

  // Fetch vote record by id
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: voteId,
      },
    });
  if (!vote || vote.comment_id !== commentId) {
    throw new Error("Vote not found for the given commentId and voteId");
  }
  // Ensure only the vote owner may update
  if (vote.voter_memberuser_id !== memberUser.id) {
    throw new Error(
      "Permission denied: only the vote owner may update this vote",
    );
  }
  const newUpdatedAt = toISOStringSafe(new Date());
  // Update vote_type and updated_at only
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: voteId },
      data: {
        vote_type: body.vote_type,
        updated_at: newUpdatedAt,
      },
    },
  );
  // Return required DTO fields, converting all date fields
  return {
    id: updated.id,
    comment_id: updated.comment_id,
    voter_memberuser_id: updated.voter_memberuser_id ?? null,
    voter_adminuser_id: updated.voter_adminuser_id ?? null,
    vote_type: updated.vote_type as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
