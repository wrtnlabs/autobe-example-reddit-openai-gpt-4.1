import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patch__communityPlatform_adminUser_comments_$commentId_votes(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote> {
  const { commentId, body } = props;

  // Ensure comment exists and is not soft-deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: commentId, deleted_at: null },
    select: { id: true },
  });
  if (!comment) {
    throw new Error("Comment not found or deleted.");
  }

  // Pagination with default values if not provided
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filter conditions (only include provided optional filters)
  const where = {
    comment_id: commentId,
    ...(body.vote_type !== undefined && { vote_type: body.vote_type }),
    ...(body.voter_memberuser_id !== undefined && {
      voter_memberuser_id: body.voter_memberuser_id,
    }),
    ...(body.voter_adminuser_id !== undefined && {
      voter_adminuser_id: body.voter_adminuser_id,
    }),
  };

  // Use orderBy as inline to keep Prisma inference
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_votes.findMany({
      where,
      orderBy:
        body.sort === "vote_type"
          ? { vote_type: "asc" as const }
          : { created_at: "desc" as const },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comment_votes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      comment_id: row.comment_id,
      voter_memberuser_id: row.voter_memberuser_id ?? undefined,
      voter_adminuser_id: row.voter_adminuser_id ?? undefined,
      vote_type: row.vote_type as "upvote" | "downvote" | "none",
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
