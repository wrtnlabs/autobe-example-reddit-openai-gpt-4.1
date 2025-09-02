import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Validate that an admin can retrieve details for a specific comment report
 * using its reportId.
 *
 * This test exercises the admin's report detail view on a reported comment,
 * confirming the full E2E business flow:
 *
 * 1. Register an admin and complete login (for privileged actions).
 * 2. Register a platform member (as the comment author).
 * 3. Switch to member account, create a new comment on a post (we'll mock a
 *    valid post_id).
 * 4. Switch session back to admin account.
 * 5. File a report against the member's comment (POST by admin on the
 *    comment).
 * 6. Retrieve the report detail via GET
 *    /communityPlatform/admin/comments/{commentId}/reports/{reportId} as
 *    admin.
 * 7. Assert the returned report matches the initial report and contains all
 *    expected fields/relationships.
 *
 * The test ensures that separate authentication flows for member and admin
 * work, that only valid actors can perform their operations, and that the
 * API returns the correct information for moderation/audit purposes.
 */
export async function test_api_admin_comment_report_detail_success(
  connection: api.IConnection,
) {
  // 1. Register admin (for moderation actions)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Admin1234!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.admin.id;

  // 2. Register a member (to create the comment to be reported)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Member1234!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const memberId = memberJoin.member.id;

  // 3. Switch session to member and create a comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Mock a valid post_id. (This platform requires a post_id for each comment, so we generate a UUID.)
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        content: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  const commentId = comment.id;

  // 4. Switch back to admin account for moderation operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Admin files a report on the member's comment
  const reportReason = RandomGenerator.paragraph({ sentences: 4 });
  const reportStatus = "pending";
  const report =
    await api.functional.communityPlatform.admin.comments.reports.create(
      connection,
      {
        commentId: commentId,
        body: {
          report_reason: reportReason,
          status: reportStatus,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);
  const reportId = report.id;

  // 6. Admin retrieves the report detail
  const detail =
    await api.functional.communityPlatform.admin.comments.reports.at(
      connection,
      {
        commentId: commentId,
        reportId: reportId,
      },
    );
  typia.assert(detail);

  // 7. Final business logic assertions: confirm fields and linkages
  TestValidator.equals("report IDs match", detail.id, reportId);
  TestValidator.equals("comment IDs match", detail.comment_id, commentId);
  TestValidator.equals(
    "report reasons match",
    detail.report_reason,
    reportReason,
  );
  TestValidator.equals("report statuses match", detail.status, reportStatus);
  TestValidator.equals(
    "reporter/admin relationship [can be null]",
    detail.admin_id,
    adminId,
  );
}
