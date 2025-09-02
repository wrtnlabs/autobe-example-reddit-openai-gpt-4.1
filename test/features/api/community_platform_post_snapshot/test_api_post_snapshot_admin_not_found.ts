import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin error handling when querying post snapshots for a
 * non-existent post.
 *
 * Ensures that the /communityPlatform/admin/posts/{postId}/snapshots
 * endpoint, when accessed by an authenticated admin and given a randomly
 * generated (thus non-existent) postId, will return a not-found (404)
 * error. This test protects against disclosure of non-existent post data
 * and checks correct business logic error path for privileged audit
 * endpoints.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin using random unique credentials.
 * 2. Generate a random UUID that will be used as a non-existent postId.
 * 3. Call the snapshot query endpoint with the random postId.
 * 4. Assert that a 404 not-found error is thrown.
 */
export async function test_api_post_snapshot_admin_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin account and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminDisplayName: string = RandomGenerator.name();
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Prepare a random UUID for a non-existent post
  const invalidPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Query the snapshot endpoint with the invalid postId, should trigger 404
  await TestValidator.httpError(
    "admin snapshot query on non-existent postId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.snapshots.index(
        connection,
        {
          postId: invalidPostId,
          body: {}, // No filters/pagination - uses defaults, as all are optional
        },
      );
    },
  );
}
