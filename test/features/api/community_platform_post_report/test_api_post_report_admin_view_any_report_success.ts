import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Verify that an authenticated admin can view the full details of any
 * report filed on a post.
 *
 * This E2E test simulates a post moderation workflow:
 *
 * 1. Register a new admin via /auth/admin/join
 * 2. Register a member via /auth/member/join
 * 3. The member creates a post in a random community
 * 4. The member files a report on their post with randomized type and reason
 * 5. Switch authentication to the admin by logging in
 * 6. The admin fetches report details using GET
 *    /communityPlatform/admin/posts/{postId}/reports/{reportId}
 * 7. Assert all fields from ICommunityPlatformPostReport are present and match
 *    expected values
 */
export async function test_api_post_report_admin_view_any_report_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPw = "Admin123!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPw = "Member123!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPw,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 3. Member creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 16,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member files a report on their post
  const reportType = RandomGenerator.pick([
    "spam",
    "abuse",
    "inappropriate",
    "copyright",
    "other",
  ] as const);
  const reportReason = RandomGenerator.paragraph({ sentences: 5 });
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: reportType,
          reason: reportReason,
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // 5. Switch authentication context to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 6. Admin fetches report details
  const adminView =
    await api.functional.communityPlatform.admin.posts.reports.at(connection, {
      postId: post.id,
      reportId: report.id,
    });
  typia.assert(adminView);

  // 7. Assert report fields match expected values and all required fields are present
  TestValidator.equals("report IDs match", adminView.id, report.id);
  TestValidator.equals(
    "post ID in report matches",
    adminView.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "reporter member ID matches",
    adminView.reported_by_member_id,
    memberJoin.member.id,
  );
  TestValidator.equals(
    "report type matches",
    adminView.report_type,
    reportType,
  );
  TestValidator.equals("report reason matches", adminView.reason, reportReason);
  TestValidator.predicate(
    "created_at timestamp exists on report",
    typeof adminView.created_at === "string" && !!adminView.created_at,
  );
  TestValidator.predicate(
    "status field exists and is a non-empty string",
    typeof adminView.status === "string" && !!adminView.status,
  );
}
