import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate correct error returned when attempting soft delete of
 * non-existent community post by admin.
 *
 * This test ensures the admin soft-delete endpoint correctly returns a
 * not-found error if an invalid/non-existent postId is supplied, even when
 * the caller has valid admin authentication.
 *
 * Business rationale: It is a critical admin operation to ensure
 * soft-deletes only occur for valid resources; accidental or malicious
 * requests for missing posts must not be treated as silent no-ops. Error
 * visibility is necessary for audit/compliance.
 *
 * Steps:
 *
 * 1. Register (and authenticate) a new admin user via the join endpoint with
 *    random credentials.
 * 2. Generate a random UUID that does NOT correspond to any existing post.
 * 3. Attempt to soft delete this UUID as a postId using the
 *    /communityPlatform/admin/posts/{postId} endpoint. Await and capture
 *    any resulting error.
 * 4. Assert that the API returns a not-found error (HTTP 404 or equivalent) by
 *    using TestValidator.httpError.
 * 5. Ensure all API calls have proper await and type safety. Use clear
 *    TestValidator titles.
 */
export async function test_api_post_admin_soft_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "TestPassword1!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Generate random non-existent postId (UUID)
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to soft delete non-existent post, expect 404 error
  await TestValidator.httpError(
    "admin soft delete returns not-found for non-existent postId",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.erase(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
