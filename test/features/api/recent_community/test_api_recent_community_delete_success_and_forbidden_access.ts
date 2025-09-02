import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";

/**
 * E2E test for removing a recent community from a member's list, with
 * permission validation.
 *
 * This test verifies that a logged-in member can delete a recent community
 * mapping they own, and that a different member cannot delete that mapping
 * (enforcing proper authorization checks).
 *
 * Scenario Steps:
 *
 * 1. Register Member1 (the owner of the recent community mapping)
 * 2. As Member1, create a new community (CommunityA)
 * 3. Add CommunityA to Member1's own recent communities list
 *    (RecentCommunityA1)
 * 4. Remove RecentCommunityA1 as Member1 (should succeed)
 * 5. Register Member2 (non-owner, new user)
 * 6. Attempt to remove RecentCommunityA1 as Member2 (should fail with
 *    forbidden/authorization error)
 *
 * Assertions:
 *
 * - Step 4: Removal by owner succeeds (no error)
 * - Step 6: Removal by non-owner fails with permission/forbidden error
 *
 * Limitations:
 *
 * - Because no list API for recent communities is present, validation is done
 *   via operation results only (success/error).
 *
 * @param connection Global API connection object, will be switched for each
 *   member as required by the API SDK.
 */
export async function test_api_recent_community_delete_success_and_forbidden_access(
  connection: api.IConnection,
) {
  // 1. Register Member1 (owner)
  const member1Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Auth);
  const member1 = member1Auth.member;

  // 2. As Member1, create CommunityA
  const communityA =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(12),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          // logo_uri and banner_uri omitted (optional fields, not null)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // 3. Member1 adds CommunityA to their recent communities list
  const recentA1 =
    await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
      connection,
      {
        communityId: communityA.id,
        body: {
          community_id: communityA.id,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(recentA1);

  // 4. Member1 removes the recent community mapping (should succeed)
  await api.functional.communityPlatform.member.communities.recentCommunities.eraseRecentCommunity(
    connection,
    {
      communityId: communityA.id,
      recentCommunityId: recentA1.id,
    },
  );

  // 5. Register Member2 (not the mapping owner)
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Auth);

  // 6. As Member2, attempt to delete the same recent community mapping (should fail)
  await TestValidator.error(
    "forbidden: non-owner cannot erase another's recent community mapping",
    async () => {
      await api.functional.communityPlatform.member.communities.recentCommunities.eraseRecentCommunity(
        connection,
        {
          communityId: communityA.id,
          recentCommunityId: recentA1.id,
        },
      );
    },
  );
}
