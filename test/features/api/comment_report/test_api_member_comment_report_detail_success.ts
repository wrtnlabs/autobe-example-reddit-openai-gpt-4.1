import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Validates that a member can retrieve the details of a report they filed
 * on a comment.
 *
 * This test represents the positive workflow where a member registers,
 * creates a new comment, files a report for that comment, and then
 * retrieves the details of their own report using GET
 * /communityPlatform/member/comments/{commentId}/reports/{reportId}.
 *
 * It validates end-to-end system integration, proper
 * authentication/authorization handling, entity creation, and detail
 * retrieval. It will:
 *
 * 1. Register a new member (POST /auth/member/join)
 * 2. Create a new comment as that member (POST
 *    /communityPlatform/member/comments)
 * 3. File a report for that comment (POST
 *    /communityPlatform/member/comments/{commentId}/reports)
 * 4. Retrieve the report details (GET
 *    /communityPlatform/member/comments/{commentId}/reports/{reportId})
 * 5. Validate that all returned fields match expectations, including
 *    reporter_id, comment_id, report_reason, status, and id.
 *
 * The test does not cover cross-member access or negative cases – only the
 * success flow for a single member filing and then viewing their own
 * report.
 */
export async function test_api_member_comment_report_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const registration = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registration);
  const memberId = registration.member.id;

  // 2. Create a comment on a random post (simulate post_id)
  // Use a random UUID for post_id as the post entity is out of scope
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        content: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. File a report for the comment
  const reportReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const reportStatus = "pending"; // business default initial value
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: reportReason,
          status: reportStatus,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 4. Retrieve the report details
  const detail =
    await api.functional.communityPlatform.member.comments.reports.at(
      connection,
      {
        commentId: comment.id,
        reportId: report.id,
      },
    );
  typia.assert(detail);

  // 5. Validate that the detail matches expected values
  TestValidator.equals(
    "Report detail: comment_id matches",
    detail.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "Report detail: reporter_id matches registered member",
    detail.reporter_id,
    memberId,
  );
  TestValidator.equals(
    "Report detail: report_reason matches input",
    detail.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "Report detail: status matches submitted status",
    detail.status,
    reportStatus,
  );
  TestValidator.equals(
    "Report detail: id matches created report",
    detail.id,
    report.id,
  );
}
