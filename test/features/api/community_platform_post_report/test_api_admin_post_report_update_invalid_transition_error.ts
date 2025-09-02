import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test that invalid status transitions for post reports (e.g.,
 * resolved→open) are rejected.
 *
 * 1. Admin joins to obtain authentication.
 * 2. Admin creates a dummy post report for a non-existent or dummy post ID (as
 *    permitted).
 * 3. Admin resolves the report by updating its status to 'resolved'.
 * 4. Admin attempts to update the report back to 'open' — this should trigger
 *    a business rule error (invalid transition).
 * 5. Assert that the error is thrown for the invalid status change.
 *
 * The test covers that once a report is resolved, it cannot be re-opened
 * and such attempts are blocked at API/business validation level.
 */
export async function test_api_admin_post_report_update_invalid_transition_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a dummy report for a random post ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  const report =
    await api.functional.communityPlatform.admin.posts.reports.create(
      connection,
      {
        postId,
        body: {
          report_type: RandomGenerator.pick([
            "spam",
            "abuse",
            "other",
          ] as const),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // 3. Resolve the report
  const resolvedReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: report.community_platform_post_id,
        reportId: report.id,
        body: {
          status: "resolved",
          resolution_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  TestValidator.equals(
    "report should now be resolved",
    resolvedReport.status,
    "resolved",
  );

  // 4. Attempt invalid transition back to 'open'
  await TestValidator.error(
    "should throw error when reverting resolved report to open",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.update(
        connection,
        {
          postId: report.community_platform_post_id,
          reportId: report.id,
          body: {
            status: "open",
            resolution_notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformPostReport.IUpdate,
        },
      );
    },
  );
}
