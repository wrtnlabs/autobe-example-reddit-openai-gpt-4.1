import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new comment on a post or as a reply (community_platform_comments).
 *
 * This endpoint allows an authenticated member to submit a new comment either
 * as a top-level comment on a post, or as a reply to another comment. All
 * comment data must conform to business rules: post_id and content are
 * required, parent_id is optional (for replies), only plain text content
 * (2-2000 chars) is allowed, and only authenticated members can use this
 * endpoint. If parent_id is provided, it must reference an existing comment on
 * the same post. The function generates a new UUID for the comment, and sets
 * timestamps correctly, with no use of the Date type. Returns the complete
 * comment record as stored.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member submitting the comment
 * @param props.body - Object describing the post to comment on, optional parent
 *   comment, and text content
 * @returns Complete comment object as written to DB, in API format (ISO string
 *   dates)
 * @throws {Error} If parent_id is provided but does not exist or is not on the
 *   same post
 */
export async function post__communityPlatform_member_comments(props: {
  member: MemberPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { member, body } = props;

  // If parent_id is provided, ensure the parent comment exists and is on the same post
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.community_platform_comments.findUnique(
      {
        where: { id: body.parent_id },
        select: { id: true, post_id: true },
      },
    );
    if (!parent)
      throw new Error("Parent comment does not exist for the given parent_id.");
    if (parent.post_id !== body.post_id)
      throw new Error(
        "Parent comment does not belong to the target post (invalid threading).",
      );
  }

  // Prepare all necessary values for creation
  const commentId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: commentId,
      post_id: body.post_id,
      author_id: member.id,
      parent_id: body.parent_id ?? null,
      content: body.content,
      edited: false,
      score: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      post_id: true,
      author_id: true,
      parent_id: true,
      content: true,
      edited: true,
      score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    author_id: created.author_id,
    parent_id: created.parent_id ?? null,
    content: created.content,
    edited: created.edited,
    score: created.score ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
