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
 * Verifies that only the reporting member can access their own comment
 * report entries (not the original comment author).
 *
 * This tests security enforcement for comment report visibility, ensuring
 * that reports are visible only to the reporting member and platform
 * admins. The author of a comment cannot see reports filed by others
 * against their own comment.
 *
 * Steps:
 *
 * 1. Register Member1 and register Member2 as distinct accounts.
 * 2. Member1 creates a comment (randomly assigned to a random post).
 * 3. Switch to Member2's auth context (registration auto-logs in).
 * 4. Member2 submits a report for Member1's comment (random valid
 *    reason/status).
 * 5. Switch back to Member1's auth context using their credentials.
 * 6. Member1 calls the report listing endpoint for their own comment.
 * 7. Validate that response data array is empty—Member1 does not see Member2's
 *    report.
 */
export async function test_api_member_comment_report_list_access_denied_other_user(
  connection: api.IConnection,
) {
  // 1. Register Member1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "passw0rd1";
  const member1Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Join);
  const member1Id = member1Join.member.id;

  // 2. Member1 creates a comment. Associate to random post.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Register Member2 (triggers login as Member2)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "passw0rd2";
  const member2Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Join);
  const member2Id = member2Join.member.id;

  // 4. Member2 reports Member1's comment
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const reportStatus = "pending";
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
  TestValidator.equals("Reporter is member2", report.reporter_id, member2Id);

  // 5. Switch back to Member1 context
  const member1Login = await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(member1Login);

  // 6. Member1 queries the reports for their own comment
  const reportList =
    await api.functional.communityPlatform.member.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {}, // No filters
      },
    );
  typia.assert(reportList);

  // 7. Validate that Member1 cannot see Member2's report (data is empty)
  TestValidator.equals(
    "Member1 cannot see other users' reports for their comment",
    reportList.data,
    [],
  );
}
