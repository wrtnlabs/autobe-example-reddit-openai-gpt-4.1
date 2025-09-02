import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";

/**
 * Validate successful addition of a community to a member's recent
 * communities list, and that re-adding the same community only updates its
 * timestamp without creating duplicates.
 *
 * This test confirms that after an authenticated member creates a
 * community, they can add it to their recent communities via the provided
 * API. If the community is already in their recents, repeat the operation
 * and verify that only the `touched_at` field updates (not a duplicate
 * insert).
 *
 * 1. Register a member via /auth/member/join (minimum required: email,
 *    password).
 * 2. Authenticate as the member (token is set automatically in connection).
 * 3. Create a new community as the member using
 *    /communityPlatform/member/communities (must provide category_id and
 *    name; category will be random for test).
 * 4. Call
 *    /communityPlatform/member/communities/{communityId}/recentCommunities
 *    to add this community to recents.
 * 5. Validate that the response contains correct member_id and community_id,
 *    and touched_at is set.
 * 6. Immediately call the endpoint again with the same communityId and
 *    payload.
 * 7. Validate that the returned object's id is the same, member_id and
 *    community_id are the same, but touched_at field has increased
 *    (updated).
 * 8. Confirm only one unique record exists for the (member, community) pair
 *    and no duplicates are created.
 */
export async function test_api_recent_community_add_success_and_update_timestamp(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const joinRes = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Test1234!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinRes);
  const memberId = joinRes.member.id;

  // 2. Create a new community (must provide category_id and name)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          // logo_uri and banner_uri omitted, as schema allows undefined
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Add to recent communities (first call)
  const add1 =
    await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(add1);
  TestValidator.equals(
    "recent community id refers to correct member",
    add1.member_id,
    memberId,
  );
  TestValidator.equals(
    "recent community id refers to correct community",
    add1.community_id,
    community.id,
  );

  // 4. Wait a bit to ensure touched_at changes, then call again
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second for timestamp granularity
  const add2 =
    await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(add2);
  // Validate association not duplicated, id remains the same
  TestValidator.equals(
    "recent community mapping id is the same after update",
    add2.id,
    add1.id,
  );
  TestValidator.equals(
    "member id is the same after update",
    add2.member_id,
    memberId,
  );
  TestValidator.equals(
    "community id is the same after update",
    add2.community_id,
    community.id,
  );
  TestValidator.notEquals(
    "touched_at field is updated after second call",
    add2.touched_at,
    add1.touched_at,
  );
}
