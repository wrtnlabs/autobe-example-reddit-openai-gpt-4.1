import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that a member can retrieve their own reports for a comment.
 *
 * This function verifies that an authenticated member, who has filed a
 * report against a comment, can retrieve that report (and only reports they
 * themselves filed) via the PATCH
 * /communityPlatform/member/comments/{commentId}/reports endpoint. The
 * workflow simulated here demonstrates end-to-end ownership filtering:
 * creating a member, creating a comment as that member, reporting that
 * comment, and then confirming that only the member's own reports are
 * visible in the listing.
 *
 * Steps:
 *
 * 1. Register as a new member (random credentials, display name).
 * 2. Create a comment as that member (with a random post_id).
 * 3. File a report for that comment with a random reason and status.
 * 4. Retrieve the list of all reports for that comment (as this member) via
 *    PATCH /communityPlatform/member/comments/{commentId}/reports.
 * 5. Assert that all returned reports are authored by the current member and
 *    that the created report appears in the summary list (matching core
 *    fields).
 * 6. Verify pagination fields indicate at least one report and have correct
 *    structural values.
 */
export async function test_api_member_comment_report_list_success_own(
  connection: api.IConnection,
) {
  // 1. Register as a member with random, valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 2. Create a comment as this member (attach to a random post_id, use random content)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentInput = {
    post_id: postId,
    content: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: commentInput,
    },
  );
  typia.assert(comment);

  // 3. File a report on that comment as this member
  const reportReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 16,
  });
  const reportStatus = "pending";
  const reportInput = {
    report_reason: reportReason,
    status: reportStatus,
  } satisfies ICommunityPlatformCommentReport.ICreate;
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportInput,
      },
    );
  typia.assert(report);

  // 4. List all reports on that comment (for this member only)
  const reportList =
    await api.functional.communityPlatform.member.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(reportList);
  const summaries = reportList.data;

  // 5. Assert all returned summaries are authored by this member and the filed report appears
  TestValidator.predicate(
    "at least one report summary returned",
    summaries.length > 0,
  );
  const ownReports = summaries.filter((s) => s.reporter_id === member.id);
  TestValidator.predicate(
    "all listed summaries are authored by the requesting member",
    ownReports.length === summaries.length,
  );
  // Verify the report just filed is present in summary
  const summary = summaries.find((s) => s.id === report.id);
  TestValidator.predicate(
    "filed report is present in summary listing",
    !!summary,
  );
  if (summary) {
    TestValidator.equals("summary id matches report id", summary.id, report.id);
    TestValidator.equals(
      "summary comment_id matches comment",
      summary.comment_id,
      comment.id,
    );
    TestValidator.equals(
      "summary reporter_id matches member",
      summary.reporter_id,
      member.id,
    );
    TestValidator.equals(
      "summary status matches report",
      summary.status,
      report.status,
    );
  }
  // 6. Pagination checks
  TestValidator.predicate(
    "pagination shows at least one record",
    reportList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination current page valid",
    reportList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination page limit positive",
    reportList.pagination.limit > 0,
  );
}
