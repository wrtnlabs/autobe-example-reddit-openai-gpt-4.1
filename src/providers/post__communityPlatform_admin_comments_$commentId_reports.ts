import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new report for a specific comment as an admin.
 *
 * This operation allows an authenticated admin to file a report against a
 * specific comment, typically to initiate a moderation workflow due to spam,
 * abuse, or rules violations. A unique report is created per (comment_id,
 * reporter_id) pair. The admin who files the report is recorded as both the
 * reporter and the assigned admin. Duplicate reporting (same admin for the same
 * comment) and targeting nonexistent or already-deleted comments produces an
 * error.
 *
 * @param props - The properties for the operation
 * @param props.admin - The authenticated admin creating the report (payload)
 * @param props.commentId - The UUID of the comment to be reported
 * @param props.body - The request body containing report_reason and status
 * @returns The created comment report record in full business structure
 * @throws {Error} If the comment does not exist or is deleted
 * @throws {Error} If a report by this admin already exists for this comment
 */
export async function post__communityPlatform_admin_comments_$commentId_reports(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.ICreate;
}): Promise<ICommunityPlatformCommentReport> {
  const { admin, commentId, body } = props;

  // 1. Ensure target comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment does not exist or is deleted");
  }

  // 2. Check uniqueness constraint: each admin can report each comment only once
  const duplicate =
    await MyGlobal.prisma.community_platform_comment_reports.findFirst({
      where: {
        comment_id: commentId,
        reporter_id: admin.id,
      },
    });
  if (duplicate) {
    throw new Error(
      "Duplicate report: This comment has already been reported by this user.",
    );
  }

  // 3. Prepare timestamps and create report
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.community_platform_comment_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        comment_id: commentId,
        reporter_id: admin.id,
        admin_id: admin.id,
        report_reason: body.report_reason,
        status: body.status,
        created_at: now,
        updated_at: now,
        resolution: null,
        resolved_at: null,
      },
    });

  // 4. Return domain object with proper type conversions
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
