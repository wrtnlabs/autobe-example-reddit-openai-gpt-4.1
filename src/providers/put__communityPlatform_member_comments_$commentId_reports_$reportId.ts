import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates an existing report for a comment by the reporting member.
 *
 * This operation allows the reporting member to edit fields of their own
 * comment report, such as the report reason or status, as long as the report
 * has not yet been resolved. Ownership and unresolved status are strictly
 * enforced. Attempts to update someone else's report or modify a resolved
 * report will result in an error. Fields that may be updated are governed by
 * the ICommunityPlatformCommentReport.IUpdate DTO. Admin actions are not
 * supported on this member endpoint.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request; must be
 *   the original reporter
 * @param props.commentId - The comment whose report is being updated (UUID)
 * @param props.reportId - The unique report ID to update (UUID)
 * @param props.body - The update information (reason, status, resolution, admin
 *   assignment)
 * @returns The updated comment report as per API DTO
 * @throws {Error} When the report is not found, not owned by member, or already
 *   resolved
 */
export async function put__communityPlatform_member_comments_$commentId_reports_$reportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IUpdate;
}): Promise<ICommunityPlatformCommentReport> {
  const { member, commentId, reportId, body } = props;

  // Fetch the report to ensure existence, correct comment context, and ownership
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findFirst({
      where: {
        id: reportId,
        comment_id: commentId,
      },
    });

  if (!report) {
    throw new Error("Report not found");
  }

  // Authorization: Only the reporting member can update their own report
  if (report.reporter_id !== member.id) {
    throw new Error("Forbidden: You can only update your own report");
  }

  // Only allow update if unresolved
  if (report.resolved_at !== null) {
    throw new Error("Cannot update a resolved report");
  }

  // Set updated_at to now
  const now = toISOStringSafe(new Date());

  // Apply only permitted updates; skip if undefined in body
  const updates = {
    report_reason: body.report_reason ?? undefined,
    status: body.status ?? undefined,
    resolution: body.resolution ?? undefined,
    admin_id: body.admin_id ?? undefined,
    updated_at: now,
  };

  // Update the report in DB
  const updated =
    await MyGlobal.prisma.community_platform_comment_reports.update({
      where: { id: reportId },
      data: updates,
    });

  // Use toISOStringSafe for all date/datetime fields; handle nullables
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
