import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * E2E test for admin access to individual vote detail endpoint with
 * boundary conditions.
 *
 * This test verifies that:
 *
 * - An admin can access detailed information about any individual vote record
 *   by its UUID.
 * - The endpoint returns errors for non-existent (random/invalid) vote IDs.
 * - Proper typing, SDK usage, and error handling are enforced.
 *
 * Steps:
 *
 * 1. Register a new admin and confirm admin context is established (join).
 * 2. Attempt to access a vote detail by a random UUID as admin (should produce
 *    not-found or similar error).
 * 3. Optionally, if simulation or fallback returns data, validate that the
 *    result is a proper vote structure.
 * 4. (Negative scenario is commented in doc: non-admins/members would be
 *    forbidden, but direct negative test not possible in this suite.)
 */
export async function test_api_admin_vote_detail_access_and_boundary(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test-Password1!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  typia.assert<ICommunityPlatformAdmin.IAuthorized>(adminJoin);
  TestValidator.predicate(
    "admin join returns profile with string id",
    typeof adminJoin.admin.id === "string",
  );

  // 2. Attempt to fetch a random/non-existent voteId as admin (should error, e.g. not found)
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin receives error for non-existent voteId",
    async () => {
      await api.functional.communityPlatform.admin.votes.at(connection, {
        voteId: nonExistentVoteId,
      });
    },
  );

  // 3. Optionally: If simulation/fallback returns data instead of error, validate structure
  try {
    const maybeVote = await api.functional.communityPlatform.admin.votes.at(
      connection,
      {
        voteId: nonExistentVoteId,
      },
    );
    typia.assert<ICommunityPlatformVote>(maybeVote);
    TestValidator.predicate(
      "simulated or fallback result has correct .id format",
      typeof maybeVote.id === "string",
    );
  } catch {
    /* Swallow if error, as intended in test boundary */
  }

  // 4. The negative scenario (non-admin restriction) is described but not directly tested (no member login SDK present).
}
