import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new report for a comment (one report per member per comment).
 *
 * This operation allows an authenticated member to create a new report for a
 * specific comment, typically in response to spam, abuse, or rule violations.
 * It verifies that the comment exists and is not deleted, enforces uniqueness
 * (one report per member per comment), and creates the report with the
 * requested reason and status. Admins may also use this for moderation or
 * testing.
 *
 * @param props - The request properties
 * @param props.member - The authenticated member reporting the comment
 * @param props.commentId - The UUID of the comment being reported
 * @param props.body - Report creation info (reason, status)
 * @returns The created comment report record
 * @throws {Error} If the targeted comment does not exist or has been deleted
 * @throws {Error} If the member has already reported this comment
 */
export async function post__communityPlatform_member_comments_$commentId_reports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.ICreate;
}): Promise<ICommunityPlatformCommentReport> {
  const { member, commentId, body } = props;
  // Step 1: Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }
  // Step 2: Enforce uniqueness of report per member per comment
  const existingReport =
    await MyGlobal.prisma.community_platform_comment_reports.findFirst({
      where: {
        comment_id: commentId,
        reporter_id: member.id,
      },
    });
  if (existingReport) {
    throw new Error("You have already reported this comment");
  }
  // Step 3: Create the new report
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_comment_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        comment_id: commentId,
        reporter_id: member.id,
        admin_id: null,
        report_reason: body.report_reason,
        status: body.status,
        resolution: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
      },
    });
  return {
    id: created.id,
    comment_id: created.comment_id,
    reporter_id: created.reporter_id,
    admin_id: created.admin_id ?? null,
    report_reason: created.report_reason,
    status: created.status,
    resolution: created.resolution ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
  };
}
