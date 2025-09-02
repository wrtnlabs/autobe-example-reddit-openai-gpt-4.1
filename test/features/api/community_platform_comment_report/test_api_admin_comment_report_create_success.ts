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
 * Validate successful admin creation of a report for a comment.
 *
 * Scenario:
 *
 * 1. Register a new admin (for privileged operations)
 * 2. Register a new member
 * 3. Member logs in
 * 4. Member posts a comment (on a random post_id with required fields)
 * 5. Admin logs in (authorization switch)
 * 6. Admin creates a report for the member's comment
 * 7. Validate the report: check correct comment association, reporter/admin
 *    IDs, status, reason, and timestamps
 */
export async function test_api_admin_comment_report_create_success(
  connection: api.IConnection,
) {
  // 1. Register and login admin
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = "test_admin_1234";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin_email,
      password: admin_password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register and login member
  const member_email = typia.random<string & tags.Format<"email">>();
  const member_password = "test_member_1234";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: member_email,
      password: member_password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 3. Member login (redundant - ensures member token is current)
  await api.functional.auth.member.login(connection, {
    body: {
      email: member_email,
      password: member_password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Member posts a comment
  const post_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id,
        content: RandomGenerator.paragraph({ sentences: 6 }),
        // no parent_id: top-level comment
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Switch to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 6. Admin files a report
  const report_reason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 14,
  });
  const report_status = "pending";
  const report =
    await api.functional.communityPlatform.admin.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason,
          status: report_status,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 7. Validate report details
  TestValidator.equals(
    "report is for correct comment",
    report.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "report status matches input",
    report.status,
    report_status,
  );
  TestValidator.equals(
    "report reason matches input",
    report.report_reason,
    report_reason,
  );
  TestValidator.predicate(
    "report id is a valid uuid",
    typeof report.id === "string" &&
      !!report.id &&
      /^[0-9a-fA-F-]{36}$/.test(report.id),
  );
  TestValidator.predicate(
    "report timestamps are ISO datetimes",
    typeof report.created_at === "string" &&
      report.created_at.includes(":") &&
      typeof report.updated_at === "string" &&
      report.updated_at.includes(":"),
  );
  TestValidator.predicate(
    "admin_id may be null or valid uuid",
    report.admin_id === null ||
      (typeof report.admin_id === "string" &&
        /^[0-9a-fA-F-]{36}$/.test(report.admin_id)),
  );
  TestValidator.equals(
    "resolution is initially null or undefined",
    report.resolution,
    null,
  );
}
