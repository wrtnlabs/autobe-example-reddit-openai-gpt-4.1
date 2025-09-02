import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a report for a post as an admin (community_platform_post_reports
 * table).
 *
 * Deletes an existing report on a post, removing it from the moderation queue
 * and workflows. Implements a soft delete by setting the deleted_at field. Only
 * admins may perform this operation. Throws error if the report is not found or
 * already deleted. All actions are auditable, and authentication errors are
 * handled by the decorator.
 *
 * @param props - The parameter object:
 * @param props.admin - The authenticated admin user performing the deletion.
 * @param props.postId - The unique identifier of the post the report belongs to
 *   (UUID).
 * @param props.reportId - The unique identifier of the report to be deleted
 *   (UUID).
 * @returns Void
 * @throws {Error} If report does not exist or is already deleted, a 404 error
 *   is thrown.
 */
export async function delete__communityPlatform_admin_posts_$postId_reports_$reportId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, postId, reportId } = props;
  // Find report: must match both IDs and not already be soft-deleted
  const report =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        id: reportId,
        community_platform_post_id: postId,
        deleted_at: null,
      },
    });
  if (!report) throw new Error("Report not found");
  // Soft delete: update deleted_at to current ISO string
  await MyGlobal.prisma.community_platform_post_reports.update({
    where: { id: reportId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
