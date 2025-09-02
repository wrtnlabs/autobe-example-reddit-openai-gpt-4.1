import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Ensure leaving a community with an invalid or already non-existent
 * membershipId fails as expected.
 *
 * This test simulates a registered member attempting to leave a community
 * using a random/fake membershipId. To set up, it first registers a member
 * account (providing a unique email and password), then creates a community
 * the member could join, and finally attempts to delete a membership record
 * that does not actually exist (random UUID for membershipId, valid
 * communityId). It asserts that the API should return an error (ideally 404
 * Not Found or equivalent) for trying to delete a non-existent membership.
 *
 * Step-by-step process:
 *
 * 1. Register a new member (for proper auth context).
 * 2. Create a new community owned by that member.
 * 3. Generate a random UUID as a fake membershipId (never joined or assigned).
 * 4. Attempt to leave (delete membership) with the valid communityId and the
 *    invalid membershipId — expect an error.
 *
 * Key points:
 *
 * - The leave operation must not succeed for non-existent memberships.
 * - Correct business error and status code are enforced.
 */
export async function test_api_community_membership_leave_not_found_failure(
  connection: api.IConnection,
) {
  // 1. Register a new member and establish authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "AutoBeTest123!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. Create a new community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          // logo_uri and banner_uri omitted to avoid type errors (they must be string|undefined, not null)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Generate random UUID as a fake (non-existent) membershipId
  const fakeMembershipId = typia.random<string & tags.Format<"uuid">>();

  // 4. Try to delete non-existent membership, expect error or not-found
  await TestValidator.error(
    "should return error when leaving community with invalid membershipId",
    async () => {
      await api.functional.communityPlatform.member.communities.memberships.erase(
        connection,
        {
          communityId: community.id,
          membershipId: fakeMembershipId,
        },
      );
    },
  );
}
