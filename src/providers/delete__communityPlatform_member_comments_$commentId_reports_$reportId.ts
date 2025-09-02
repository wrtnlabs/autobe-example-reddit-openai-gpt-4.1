import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Permanently delete a specific comment report filed by a member.
 *
 * - Only the report author (while unresolved) may delete their report via this
 *   endpoint.
 * - Deletion is permanent (hard delete): the report is removed from the database
 *   and cannot be recovered.
 * - Business rules: A member cannot delete a resolved or rejected report, nor can
 *   they delete another user's report.
 * - This operation does NOT use soft delete (the
 *   community_platform_comment_reports schema lacks deleted_at).
 *
 * @param props - Request properties
 * @param props.member - The authenticated member authorizing the action
 * @param props.commentId - The ID of the comment to which the report is linked
 * @param props.reportId - The ID of the report to be deleted
 * @returns Void (does not return any data)
 * @throws {Error} If the report does not exist
 * @throws {Error} If the member does not own the report
 * @throws {Error} If the report is already resolved or rejected
 */
export async function delete__communityPlatform_member_comments_$commentId_reports_$reportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId, reportId } = props;

  // Step 1: Fetch the report
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findFirst({
      where: {
        id: reportId,
        comment_id: commentId,
      },
    });
  if (!report) {
    throw new Error("Report does not exist");
  }

  // Step 2: Ownership check: must be the report author
  if (report.reporter_id !== member.id) {
    throw new Error("Unauthorized: You can only delete your own report");
  }

  // Step 3: Resolution status check: only allow if not resolved or rejected
  if (report.status === "resolved" || report.status === "rejected") {
    throw new Error(
      "Cannot delete: Report has already been resolved or rejected",
    );
  }

  // Step 4: Hard delete (no soft delete available)
  await MyGlobal.prisma.community_platform_comment_reports.delete({
    where: { id: reportId },
  });

  return;
}
