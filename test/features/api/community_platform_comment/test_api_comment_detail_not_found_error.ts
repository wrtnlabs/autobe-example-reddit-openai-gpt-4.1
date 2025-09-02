import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test error handling when requesting a non-existent comment by ID.
 *
 * This test ensures the GET /communityPlatform/comments/{commentId}
 * endpoint returns an error when the provided commentId does not correspond
 * to any active comment. This verifies that deleted or never-existing
 * comments are not exposed and that the system returns a not found (404)
 * error or equivalent.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as a non-existent commentId (not present in
 *    test database).
 * 2. Attempt to fetch the comment using the API.
 * 3. Confirm that the API call results in a not found error (e.g., 404 status
 *    code).
 * 4. Validate that no improper or sensitive information is returned in the
 *    error response.
 * 5. Edge case: If the API uses a specific error type (e.g., HttpError),
 *    confirm error type and status.
 */
export async function test_api_comment_detail_not_found_error(
  connection: api.IConnection,
) {
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetching a nonexistent comment ID should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.comments.at(connection, {
        commentId: nonExistentCommentId,
      });
    },
  );
}
