import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a specific report for a comment.
 *
 * This operation allows an admin to permanently delete a comment report from
 * the database. It first verifies that the report exists and is tied to the
 * provided commentId. Reports are removed permanently (hard delete); the
 * operation cannot be undone.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.commentId - The UUID of the comment linked to the report
 * @param props.reportId - The UUID of the report to delete
 * @returns Void
 * @throws {Error} If the report does not exist or is not associated with the
 *   specified comment
 */
export async function delete__communityPlatform_admin_comments_$commentId_reports_$reportId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, commentId, reportId } = props;

  // Fetch the report and ensure it is linked to the given comment
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUniqueOrThrow({
      where: { id: reportId },
    });
  if (report.comment_id !== commentId) {
    throw new Error("Report does not belong to the specified comment.");
  }

  // Permanently delete the report
  await MyGlobal.prisma.community_platform_comment_reports.delete({
    where: { id: reportId },
  });
}
