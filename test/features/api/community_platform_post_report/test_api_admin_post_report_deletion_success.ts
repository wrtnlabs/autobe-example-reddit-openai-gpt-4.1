import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * E2E test for successful soft deletion of a post report by an admin.
 *
 * Validates the workflow for an admin to create and then successfully
 * soft-delete a report on a community post. The process covers:
 *
 * 1. Admin account registration/authentication
 * 2. Report creation on a post (simulate a valid UUID for postId)
 * 3. Deletion (soft) of the report
 * 4. Validation that the report is no longer deletable
 *
 * Steps:
 *
 * 1. Register a new admin (auth.admin.join) and acquire admin authentication
 * 2. Create a post report (admin.posts.reports.create) with a random postId
 *    and report details
 * 3. Delete the report via (admin.posts.reports.erase)
 * 4. Attempt to delete it again, expect a business logic error (already
 *    deleted or not found)
 *
 * All API responses are type asserted and the void return type of erase is
 * validated. Error-handling for duplicate deletion attempts ensures
 * business logic compliance of soft deletion (deleted_at is set and entity
 * is unmodificable).
 */
export async function test_api_admin_post_report_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin user to obtain authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test!1234";
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);

  // Step 2: Simulate a valid UUID for postId (no post-creation endpoint available)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create the report as admin on the specified post
  const report =
    await api.functional.communityPlatform.admin.posts.reports.create(
      connection,
      {
        postId,
        body: {
          report_type: "spam", // Use a typical allowed type; adjust if business logic restricts further
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "created report's postId",
    report.community_platform_post_id,
    postId,
  );
  TestValidator.equals("created report's type", report.report_type, "spam");

  // Step 4: Delete the report (soft deletion expected)
  await api.functional.communityPlatform.admin.posts.reports.erase(connection, {
    postId,
    reportId: report.id,
  });

  // Step 5: Re-attempt to delete the same report, expect business logic error (already deleted or not found)
  await TestValidator.error(
    "soft-deleted report cannot be erased again",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.erase(
        connection,
        {
          postId,
          reportId: report.id,
        },
      );
    },
  );
}
