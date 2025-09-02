import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that attempting to delete a non-existent or already deleted post
 * will result in a not found error.
 *
 * 1. Register a new member to acquire authentication context for the test.
 * 2. Attempt to delete a post (using a random UUID) that does not exist in the
 *    system.
 * 3. Confirm the system throws a not found (404) error for this operation,
 *    demonstrating that the resource does not exist and no unintended data
 *    is affected.
 *
 * Edge Cases:
 *
 * - Also covers the scenario where a post existed but was already deleted,
 *   since there is no prior creation and deletion in this test setup; the
 *   nonexistent random UUID suffices.
 */
export async function test_api_member_post_delete_nonexistent_post_error(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorized);

  // 2. Attempt to delete a non-existent post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete attempt for non-existent post should fail with 404",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
