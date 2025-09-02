import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing report for a specific comment.
 *
 * This operation allows updating an existing report on a comment, typically
 * restricted to admins. Allows modifications to report reason, status,
 * resolution, and admin assignment, aligned to the business and moderation
 * workflow. Status changes to 'resolved' will set the resolved_at timestamp.
 * Record is matched by reportId and commentId.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.commentId - Identifier of the comment whose report is updated
 * @param props.reportId - Unique ID of the report being updated
 * @param props.body - Update data for the comment report (IUpdate DTO), may
 *   include reason, status, resolution, or admin assignment
 * @returns The updated comment report in ICommunityPlatformCommentReport format
 * @throws {Error} When the report does not exist for the given commentId and
 *   reportId
 */
export async function put__communityPlatform_admin_comments_$commentId_reports_$reportId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IUpdate;
}): Promise<ICommunityPlatformCommentReport> {
  const { admin, commentId, reportId, body } = props;

  // 1. Find the report; ensure it exists for the given comment+report (no soft delete pattern in this model)
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: reportId },
    });
  if (!report || report.comment_id !== commentId) {
    throw new Error("Report not found for this comment");
  }

  // 2. Determine the update time (always set updated_at)
  const now = toISOStringSafe(new Date());

  // 3. Only update allowed fields, skip those not present in body (undefined = skip field)
  //    Update resolved_at if status is being set to 'resolved'
  //    Otherwise, retain previous value (do not clear unless business logic specified)
  const shouldUpdateResolvedAt =
    typeof body.status === "string" && body.status === "resolved";
  const updateData = {
    report_reason: body.report_reason ?? undefined,
    status: body.status ?? undefined,
    resolution: body.resolution ?? undefined,
    admin_id: body.admin_id ?? undefined,
    updated_at: now,
    ...(shouldUpdateResolvedAt ? { resolved_at: now } : {}),
  };

  const updated =
    await MyGlobal.prisma.community_platform_comment_reports.update({
      where: { id: reportId },
      data: updateData,
    });

  // 4. Return the updated row, converting all dates as required (never use native Date)
  return {
    id: updated.id,
    comment_id: updated.comment_id,
    reporter_id: updated.reporter_id,
    admin_id: updated.admin_id ?? null,
    report_reason: updated.report_reason,
    status: updated.status,
    resolution: updated.resolution ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
