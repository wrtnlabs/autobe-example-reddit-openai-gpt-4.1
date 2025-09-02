import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate that an admin can successfully update a post report, including
 * status transition and addition of resolution notes.
 *
 * Business context: Platform admin moderation tools must allow reports to
 * be resolved with rationale, supporting workflow auditability and member
 * trust.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin account.
 * 2. Create a new post report as that admin (admin can file reports;
 *    simplifies dependency since member creation isn't in scope).
 * 3. Update the report using the API: transition the status (e.g., to
 *    'resolved'), and supply resolution notes.
 * 4. Check the API response: ensure that status and resolution_notes reflect
 *    the update (and the admin_id is set).
 * 5. Optionally check audit fields (updated_at changes, resolved_at is set for
 *    resolved status).
 */
export async function test_api_admin_post_report_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminProfile = adminJoin.admin;

  // 2. Create a report for a random post (as admin; skip member dependency)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const createResult =
    await api.functional.communityPlatform.admin.posts.reports.create(
      connection,
      {
        postId,
        body: {
          report_type: RandomGenerator.pick([
            "spam",
            "abuse",
            "off-topic",
            "violation",
          ] as const),
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(createResult);

  // 3. Update the report as admin: resolve it and add notes
  const updateBody: ICommunityPlatformPostReport.IUpdate = {
    status: "resolved",
    resolution_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 8,
      wordMax: 16,
    }),
  };
  const updateResult =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId,
        reportId: createResult.id,
        body: updateBody,
      },
    );
  typia.assert(updateResult);

  // 4. Validate that status/resolution_notes/admin_id fields are as expected
  TestValidator.equals(
    "status updated to resolved",
    updateResult.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes correctly set",
    updateResult.resolution_notes,
    updateBody.resolution_notes,
  );
  TestValidator.equals(
    "resolved_by is admin who updated",
    updateResult.admin_id,
    adminProfile.id,
  );

  // 5. Confirm resolved_at is set when status is resolved
  TestValidator.predicate(
    "resolved_at should not be null/undefined for resolved status",
    updateResult.resolved_at !== null && updateResult.resolved_at !== undefined,
  );

  // 6. Optionally confirm audit fields are updated
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updateResult.updated_at).getTime() >=
      new Date(updateResult.created_at).getTime(),
  );
}
