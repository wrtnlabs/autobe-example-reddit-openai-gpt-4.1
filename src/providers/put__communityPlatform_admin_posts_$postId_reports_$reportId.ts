import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update or resolve a post report as an admin (community_platform_post_reports
 * table).
 *
 * This operation allows an authenticated admin to update metadata for an
 * existing report on a post. Supported updates include status transitions
 * (e.g., open → resolved), adding or updating resolution notes, or changing the
 * report type. Only admins have access to this endpoint. All updates enforce
 * business rules: reports already resolved cannot revert to previous statuses.
 * Setting status to 'resolved' sets resolved_at, and all other status changes
 * clear resolved_at. Attempting to update a deleted or non-existent report
 * throws an error. Returns the updated post report entity with all fields
 * mapped.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.postId - The post UUID under which the report is filed
 * @param props.reportId - The UUID of the report to update
 * @param props.body - Object with fields to modify on the report
 * @returns The full, updated post report including all relevant fields
 * @throws {Error} When report is not found, is already deleted, or when
 *   attempting invalid status transitions
 */
export async function put__communityPlatform_admin_posts_$postId_reports_$reportId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.IUpdate;
}): Promise<ICommunityPlatformPostReport> {
  const { admin, postId, reportId, body } = props;

  // Step 1: Fetch the report by id, post, and not deleted
  const report =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        id: reportId,
        community_platform_post_id: postId,
        deleted_at: null,
      },
    });
  if (!report) throw new Error("Report not found or already deleted");

  // Step 2: Enforce status transition rules
  if (
    report.status === "resolved" &&
    body.status !== undefined &&
    body.status !== "resolved"
  ) {
    throw new Error("Cannot revert a resolved report to a previous status");
  }

  // Step 3: Prepare values for update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  let resolvedAt: (string & tags.Format<"date-time">) | null | undefined =
    report.resolved_at ? toISOStringSafe(report.resolved_at) : null;
  if (body.status !== undefined) {
    if (body.status === "resolved" && report.status !== "resolved") {
      resolvedAt = now;
    } else if (body.status !== "resolved") {
      resolvedAt = null;
    }
  }

  // Step 4: Apply the update
  const updated = await MyGlobal.prisma.community_platform_post_reports.update({
    where: { id: reportId },
    data: {
      report_type: body.report_type ?? undefined,
      reason: body.reason ?? undefined,
      status: body.status ?? undefined,
      resolution_notes: body.resolution_notes ?? undefined,
      admin_id: admin.id,
      updated_at: now,
      resolved_at: resolvedAt,
    },
  });

  // Step 5: Map and return all required fields (convert dates to ISO strings)
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    reported_by_member_id: updated.reported_by_member_id,
    admin_id: updated.admin_id ?? null,
    report_type: updated.report_type,
    reason: updated.reason,
    status: updated.status,
    resolution_notes: updated.resolution_notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
