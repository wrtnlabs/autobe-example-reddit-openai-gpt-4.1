import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test error handling when attempting to delete a non-existent or already
 * deleted comment.
 *
 * This test validates that the API returns a proper error (such as 404 Not
 * Found) when a member attempts to delete a comment that definitely does
 * not exist or has already been deleted. It ensures business logic and
 * security by confirming such negative paths are safely handled. The test
 * first registers a new member using the /auth/member/join endpoint to
 * establish authentication context. Then it attempts to delete a comment
 * using a guaranteed non-existent commentId (random UUID). The expected
 * outcome is for the API to reject the deletion with a relevant error,
 * confirming correct negative-path behavior for resource deletion.
 *
 * Steps:
 *
 * 1. Register a new member to obtain authentication context
 * 2. Attempt to delete a comment with a random UUID
 * 3. Validate that the operation fails with a proper error for non-existent
 *    (or already deleted) comment
 */
export async function test_api_comment_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register a new member to establish authentication context
  const memberReg = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberReg);

  // 2. Attempt to delete a comment with a random (nonexistent) UUID
  await TestValidator.error(
    "error when deleting non-existent or already deleted comment",
    async () => {
      await api.functional.communityPlatform.member.comments.erase(connection, {
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
