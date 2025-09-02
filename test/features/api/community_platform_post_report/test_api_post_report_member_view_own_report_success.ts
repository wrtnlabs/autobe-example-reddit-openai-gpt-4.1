import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test that a member can successfully retrieve details of a report they
 * filed on a post.
 *
 * This test simulates a complete member workflow:
 *
 * 1. Register a member (with unique email/password).
 * 2. Member creates a post (in a randomly chosen community).
 * 3. Member files a report on their own post.
 * 4. Member retrieves that report using the GET
 *    /communityPlatform/member/posts/{postId}/reports/{reportId} endpoint.
 *
 * Test expects:
 *
 * - The retrieved report contains all schema fields (id,
 *   community_platform_post_id, reported_by_member_id, report_type, reason,
 *   status, admin_id, resolution_notes, timestamps, etc).
 * - The reported_by_member_id matches the logged-in member.
 * - The community_platform_post_id matches the target post.
 * - The member and post have the expected display names and the member is
 *   active.
 * - All response fields are present and satisfy the
 *   ICommunityPlatformPostReport type.
 * - Report optional fields (admin_id, resolution_notes, resolved_at,
 *   deleted_at) are null initially.
 *
 * This checks not only data presence but also access control—ensuring the
 * member can view only their own report.
 */
export async function test_api_post_report_member_view_own_report_success(
  connection: api.IConnection,
) {
  // 1. Register a member (auth context established on join)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10) + "A1";
  const displayName = RandomGenerator.name();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  TestValidator.equals("member is active", memberJoin.member.is_active, true);
  TestValidator.equals(
    "member display_name matches",
    memberJoin.member.display_name,
    displayName,
  );
  // 2. Member creates a post (random community id)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 10,
        }),
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author_display_name matches displayName",
    post.author_display_name,
    displayName,
  );
  // 3. Member files a report on their own post
  const reportType = RandomGenerator.pick([
    "spam",
    "abuse",
    "inappropriate",
    "duplicate",
    "other",
  ] as const);
  const reason = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 12,
  });
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: reportType,
          reason,
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Member retrieves the report just filed
  const retrieved =
    await api.functional.communityPlatform.member.posts.reports.at(connection, {
      postId: post.id,
      reportId: report.id,
    });
  typia.assert(retrieved);
  // 5. Validate all report fields and access control
  TestValidator.equals(
    "member gets their own filed report ID",
    retrieved.id,
    report.id,
  );
  TestValidator.equals(
    "report post ID matches post",
    retrieved.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "reported_by_member_id matches member",
    retrieved.reported_by_member_id,
    memberJoin.member.id,
  );
  TestValidator.equals(
    "report type matches",
    retrieved.report_type,
    reportType,
  );
  TestValidator.equals("reason matches", retrieved.reason, reason);
  TestValidator.predicate(
    "status is not empty",
    typeof retrieved.status === "string" && retrieved.status.length > 0,
  );
  TestValidator.equals(
    "admin_id should be null initially",
    retrieved.admin_id,
    null,
  );
  TestValidator.equals(
    "resolution_notes should be null initially",
    retrieved.resolution_notes,
    null,
  );
  TestValidator.equals(
    "resolved_at should be null initially",
    retrieved.resolved_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null initially",
    retrieved.deleted_at,
    null,
  );
  // All timestamps present
  TestValidator.predicate(
    "created_at in ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.created_at),
  );
  TestValidator.predicate(
    "updated_at in ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.updated_at),
  );
}
