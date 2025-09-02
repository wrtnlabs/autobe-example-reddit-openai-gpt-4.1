import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test that updating a non-existent comment as admin returns a not-found
 * error.
 *
 * 1. Register a new admin account (randomly generated email and display name
 *    for freshness).
 * 2. Confirm the authentication context is set for admin role (JWT in
 *    connection.headers).
 * 3. Generate a random UUID to use as the commentId (which does not map to a
 *    real comment).
 * 4. Prepare a valid comment update request body (content: plain text, 2-2000
 *    chars, no scripts).
 * 5. Attempt the update via PUT /communityPlatform/admin/comments/{commentId}
 *    as the admin.
 * 6. Validate that the API responds with an error (ideally 404, not a silent
 *    success or other error) using TestValidator.error with async/await
 *    handling.
 */
export async function test_api_admin_comment_update_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register a new admin (random credentials)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. The join call sets the Authorization header for admin

  // 3. Generate a non-existent commentId
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare a valid comment update body
  const updateBody = {
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformComment.IUpdate;

  // 5 & 6. Attempt to update and ensure an error is thrown
  await TestValidator.error(
    "should return error when updating non-existent comment via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.comments.update(connection, {
        commentId: nonExistentCommentId,
        body: updateBody,
      });
    },
  );
}
