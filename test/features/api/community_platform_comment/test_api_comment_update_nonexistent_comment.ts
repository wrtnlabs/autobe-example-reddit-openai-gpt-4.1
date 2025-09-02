import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test that updating a non-existent comment results in a 404 Not Found
 * error.
 *
 * This test verifies that the API correctly returns a 404 error when
 * attempting to update a comment that does not exist in the database. It
 * covers both the authentication setup and negative business logic
 * validation.
 *
 * Steps:
 *
 * 1. Register and authenticate a new member using unique random credentials.
 * 2. Generate a random UUID for commentId which does not correspond to any
 *    actual comment.
 * 3. Attempt to update the non-existent comment with valid content payload.
 * 4. Assert that the API returns a 404 Not Found error.
 */
export async function test_api_comment_update_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(auth);

  // 2. Generate a random UUID for a non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare valid update content
  const updateBody = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 15,
    }),
  } satisfies ICommunityPlatformComment.IUpdate;

  // 4. Attempt update and verify 404 error
  await TestValidator.httpError(
    "updating a non-existent comment must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: nonExistentCommentId,
          body: updateBody,
        },
      );
    },
  );
}
