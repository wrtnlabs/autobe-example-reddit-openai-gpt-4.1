import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that attempting to delete a non-existent comment as admin returns
 * the appropriate error.
 *
 * 1. Register and log in as admin (using /auth/admin/join)
 * 2. Use DELETE /communityPlatform/admin/comments/{commentId} with a random
 *    UUID (ensuring the comment does not exist)
 * 3. Verify that an error is thrown (404 or similar business-absent error)
 */
export async function test_api_admin_comment_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register and log in as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2 & 3. Attempt to delete a non-existent comment and expect an error
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin deleting non-existent comment should return error (404 or business error)",
    async () => {
      await api.functional.communityPlatform.admin.comments.erase(connection, {
        commentId: nonexistentCommentId,
      });
    },
  );
}
