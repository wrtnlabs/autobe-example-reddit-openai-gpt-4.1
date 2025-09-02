import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";

/**
 * Test the successful process of a member leaving a community on the
 * platform.
 *
 * 1. Register the owner (member1) and authenticate as them.
 * 2. As owner, create a community and retrieve communityId.
 * 3. Register a second member (member2) and authenticate as them (context
 *    switch).
 * 4. As member2, join the newly created community—get membershipId.
 * 5. As member2, call the leave (delete) endpoint to remove their membership.
 * 6. If deletion is successful (no error thrown), the operation is validated.
 */
export async function test_api_community_membership_leave_success(
  connection: api.IConnection,
) {
  // 1. Register owner member (member1)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const member1Reg = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: "password1test",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Reg);

  // 2. Owner creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          // logo_uri and banner_uri are optional, omit since null is not assignable
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register member2 and authenticate as them (context switch)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Reg = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "password2test",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Reg);

  // 4. Member2 joins the community
  const membership =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 5. Member2 leaves the community (deletes membership)
  await api.functional.communityPlatform.member.communities.memberships.erase(
    connection,
    {
      communityId: community.id,
      membershipId: membership.id,
    },
  );
  // If no error, success
}
