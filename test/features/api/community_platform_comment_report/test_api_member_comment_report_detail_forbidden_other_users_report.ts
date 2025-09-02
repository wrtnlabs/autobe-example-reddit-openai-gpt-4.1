import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Test forbidden access to comment report details.
 *
 * This function validates that a member cannot view the details of a report
 * they did not submit.
 *
 * Business rationale: Comment report details are restricted such that only
 * the original reporting member or platform admins can retrieve them.
 * Attempting to retrieve another user's report detail as a standard member
 * must result in a forbidden error. This test ensures compliance with
 * privacy and access control policies.
 *
 * Step-by-step scenario:
 *
 * 1. Register member1 (comment author).
 * 2. Member1 creates a comment.
 * 3. Register member2 (acts as reporter; context switches to member2).
 * 4. Member2 files a comment report on member1's comment and receives
 *    reportId.
 * 5. Switch session back to member1 by logging in.
 * 6. Member1 attempts to retrieve the report detail for member2's report
 *    (should fail).
 * 7. The attempt should throw a forbidden error, validating access control
 *    logic.
 */
export async function test_api_member_comment_report_detail_forbidden_other_users_report(
  connection: api.IConnection,
) {
  // 1. Register member1 (comment author)
  const member1_email = typia.random<string & tags.Format<"email">>();
  const member1_password = "StrongP@ss12";
  const member1_joined = await api.functional.auth.member.join(connection, {
    body: {
      email: member1_email,
      password: member1_password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1_joined);

  // 2. Member1 creates a comment
  const post_id = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment author matches member1",
    comment.author_id,
    member1_joined.member.id,
  );

  // 3. Register member2 (context now switches to member2)
  const member2_email = typia.random<string & tags.Format<"email">>();
  const member2_password = "StrongP@ss34";
  const member2_joined = await api.functional.auth.member.join(connection, {
    body: {
      email: member2_email,
      password: member2_password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2_joined);

  // 4. Member2 files a report on member1's comment
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 3 }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report's reporter_id matches member2",
    report.reporter_id,
    member2_joined.member.id,
  );

  // 5. Switch session back to member1
  const member1_login = await api.functional.auth.member.login(connection, {
    body: {
      email: member1_email,
      password: member1_password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(member1_login);

  // 6. Attempt forbidden access to the report detail as member1
  await TestValidator.error(
    "forbidden to get another user's report detail",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.at(
        connection,
        {
          commentId: comment.id,
          reportId: report.id,
        },
      );
    },
  );
}
