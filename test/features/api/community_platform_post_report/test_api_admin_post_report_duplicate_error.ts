import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test that the admin cannot create a duplicate report on the same post.
 *
 * This test validates the business constraint that each admin can only
 * submit a single report per post.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new admin via /auth/admin/join.
 * 2. Generate a (simulated) postId to act as the report target.
 * 3. Submit a first report to /communityPlatform/admin/posts/{postId}/reports.
 * 4. Assert the returned report fields match inputs.
 * 5. Attempt to submit a duplicate report as the same admin to the same
 *    postId.
 * 6. Confirm that a business logic error is raised prohibiting duplicate
 *    reports by the same admin for a single post.
 *
 * Note: This uses a random postId, since actual post creation is not
 * available in provided APIs. If the backend enforces post existence, this
 * test may need to be updated when a post creation endpoint becomes
 * available.
 */
export async function test_api_admin_post_report_duplicate_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResponse);

  // 2. Simulate a unique postId (UUID)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct report details
  const reportType = "spam";
  const reason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const reportBody = {
    report_type: reportType,
    reason: reason,
  } satisfies ICommunityPlatformPostReport.ICreate;

  // 4. Submit the first report
  const firstReport =
    await api.functional.communityPlatform.admin.posts.reports.create(
      connection,
      {
        postId,
        body: reportBody,
      },
    );
  typia.assert(firstReport);
  TestValidator.equals(
    "first report type matches",
    firstReport.report_type,
    reportType,
  );
  TestValidator.equals(
    "first report reason matches",
    firstReport.reason,
    reason,
  );

  // 5. Attempt to submit a duplicate report as the same admin for the same post
  await TestValidator.error(
    "duplicate report by same admin should fail",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.create(
        connection,
        {
          postId,
          body: reportBody,
        },
      );
    },
  );
}
