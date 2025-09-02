import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the deletion failure of a post report by an admin under error
 * conditions.
 *
 * This test ensures that the admin DELETE endpoint for post reports
 * correctly enforces business logic when faced with invalid or unauthorized
 * requests. It simulates an authenticated admin attempting to delete a
 * report that either does not exist, was already deleted, or does not
 * belong to the correct entity.
 *
 * 1. Register an admin account using /auth/admin/join and obtain
 *    authentication.
 * 2. Attempt to delete a report for a post using
 *    /communityPlatform/admin/posts/{postId}/reports/{reportId} with random
 *    UUIDs that are highly unlikely to match any existing report (to
 *    simulate "not found").
 * 3. Assert that the system responds with a not found or forbidden error,
 *    confirming robust ID validation and enforcement of authorization
 *    rules.
 */
export async function test_api_admin_post_report_delete_nonexistent_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Attempt deletion with random, guaranteed-nonexistent IDs
  await TestValidator.error(
    "deleting a non-existent or unauthorized post report as admin should fail",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.erase(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          reportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
