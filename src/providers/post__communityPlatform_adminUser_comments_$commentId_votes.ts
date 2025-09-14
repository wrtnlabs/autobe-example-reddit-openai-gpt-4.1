import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new vote (upvote/downvote/none) on a comment as an admin user.
 *
 * This operation allows an authenticated adminUser to cast, update, or clear
 * their vote (upvote, downvote, or none) for a given comment. Voting is
 * restricted such that an admin cannot vote on their own comment. At most one
 * vote per adminUser per comment is allowed. If a vote already exists, it will
 * be updated; otherwise, a new vote will be inserted. Timestamps are stored in
 * ISO 8601 string format.
 *
 * @param props - The operation input
 * @param props.adminUser - Authenticated adminUser payload (injects admin ID)
 * @param props.commentId - UUID of the target comment to vote on
 * @param props.body - Object containing comment_id and vote_type ("upvote" |
 *   "downvote" | "none")
 * @returns The created or updated vote record, with all timestamps as ISO
 *   strings and all voter/admin/comment references populated.
 * @throws {Error} If the comment does not exist or if the admin attempts to
 *   vote on their own comment
 */
export async function post__communityPlatform_adminUser_comments_$commentId_votes(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  const { adminUser, commentId, body } = props;

  // Find the comment and verify it exists
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      author_adminuser_id: true,
    },
  });
  if (!comment) throw new Error("Comment not found");

  // Prevent admin user from voting on their own comment
  if (
    comment.author_adminuser_id &&
    comment.author_adminuser_id === adminUser.id
  ) {
    throw new Error("Admin user cannot vote on own comment");
  }

  const now = toISOStringSafe(new Date());

  // Upsert the comment vote on (comment_id, voter_adminuser_id) unique constraint
  const vote = await MyGlobal.prisma.community_platform_comment_votes.upsert({
    where: {
      comment_id_voter_adminuser_id: {
        comment_id: commentId,
        voter_adminuser_id: adminUser.id,
      },
    },
    update: {
      vote_type: body.vote_type,
      updated_at: now,
    },
    create: {
      id: v4(),
      comment_id: commentId,
      voter_adminuser_id: adminUser.id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
    },
  });

  // Map Prisma output (dates as Date) to DTO (all date/datetime as ISO string, NEVER Date)
  return {
    id: vote.id,
    comment_id: vote.comment_id,
    voter_memberuser_id: vote.voter_memberuser_id ?? undefined,
    voter_adminuser_id: vote.voter_adminuser_id ?? undefined,
    vote_type: vote.vote_type as "upvote" | "downvote" | "none",
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
