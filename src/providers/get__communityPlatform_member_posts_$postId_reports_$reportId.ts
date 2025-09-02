import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve detail for a specific report on a post by reportId.
 *
 * This function retrieves an individual report record from the
 * community_platform_post_reports table, identified by both postId and
 * reportId. It enforces that only the member who filed the report (the
 * reporter) can access this resource. All major fields are returned according
 * to the API schema, with full conversion of all Date values to branded ISO
 * strings, and all nullable fields handled explicitly. Access is strictly
 * limited to the owning member; other users will receive an authorization
 * error. This endpoint is used for transparency, moderation, and review
 * workflows, and has no mutation or write side effects.
 *
 * @param props - Request object with:
 *
 *   - Member: The authenticated MemberPayload
 *   - PostId: UUID of the reported post
 *   - ReportId: UUID of the post report entity
 *
 * @returns Detailed post report entity object (ICommunityPlatformPostReport)
 * @throws {Error} If the report does not exist or if the member is not the
 *   reporter (ownership enforcement)
 */
export async function get__communityPlatform_member_posts_$postId_reports_$reportId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostReport> {
  const { member, postId, reportId } = props;
  const report =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        id: reportId,
        community_platform_post_id: postId,
      },
    });
  if (!report) throw new Error("Report not found");
  if (report.reported_by_member_id !== member.id)
    throw new Error("Unauthorized: You may only view your own filed reports");

  return {
    id: report.id,
    community_platform_post_id: report.community_platform_post_id,
    reported_by_member_id: report.reported_by_member_id,
    admin_id: report.admin_id ?? null,
    report_type: report.report_type,
    reason: report.reason,
    status: report.status,
    resolution_notes: report.resolution_notes ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
