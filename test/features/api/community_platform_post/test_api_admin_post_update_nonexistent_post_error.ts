import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validates that updating a non-existent community post as an admin returns
 * the correct error response (not found).
 *
 * Ensures:
 *
 * - Admin authentication is established properly before accessing admin APIs.
 * - Update attempt for a random/unused postId fails with a 404 (not found)
 *   error.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin using /auth/admin/join, saving the
 *    authentication context.
 * 2. Generate a random UUID for postId that does not correspond to any
 *    existing post (as no post is created in this workflow).
 * 3. Prepare a plausible update body for the post (e.g., new title/body).
 * 4. Attempt to update this non-existent post as admin via
 *    /communityPlatform/admin/posts/{postId}.
 * 5. Assert that the operation fails with a 404 error (using
 *    TestValidator.error) to validate correct business logic enforcement
 *    for missing resources.
 */
export async function test_api_admin_post_update_nonexistent_post_error(
  connection: api.IConnection,
) {
  // 1. Register admin account (establishes authentication context for admin role).
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Generate random UUID for a post that does not exist.
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt updating this non-existent post (should fail).
  await TestValidator.error(
    "updating non-existent community post as admin should fail with 404",
    async () => {
      await api.functional.communityPlatform.admin.posts.update(connection, {
        postId: nonexistentPostId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 16,
          }),
          author_display_name: RandomGenerator.name(1),
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
}
