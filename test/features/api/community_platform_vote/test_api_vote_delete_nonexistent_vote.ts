import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate error case for deleting a non-existent or unauthorized vote by a
 * member.
 *
 * This test ensures that the API correctly rejects deletion attempts when:
 *
 * - The voteId does not exist in the system, or
 * - The voteId is not owned by the authenticated member.
 *
 * Steps:
 *
 * 1. Register a new member to obtain authentication.
 * 2. Use a random uuid as voteId for deletion (guaranteed non-existent).
 * 3. Attempt to delete the vote with the random id and confirm an error is
 *    returned (not found or forbidden).
 */
export async function test_api_vote_delete_nonexistent_vote(
  connection: api.IConnection,
) {
  // 1. Register member to authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const displayName = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);

  // 2. Prepare a random, guaranteed non-existent voteId
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete non-existent vote and expect error (not found or forbidden)
  await TestValidator.error(
    "should fail to delete a non-existent vote (not found or forbidden)",
    async () => {
      await api.functional.communityPlatform.member.votes.erase(connection, {
        voteId: nonExistentVoteId,
      });
    },
  );
}
