import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";

/**
 * Test retrieving details of a non-existent community membership within a
 * real community.
 *
 * This test ensures the backend properly throws a not-found error when a
 * request is made for a community membershipId that does not exist, even
 * though the communityId is valid.
 *
 * Steps:
 *
 * 1. Register a new member account (obtaining member authentication context)
 * 2. Create a new community as the registered member (to provide a real
 *    communityId)
 * 3. Attempt to GET membership detail with this real communityId BUT a random
 *    (nonexistent) membershipId
 * 4. Expect an error to be thrown (not found, or similar business error
 *    indicating non-existence)
 */
export async function test_api_community_membership_detail_not_found_failure(
  connection: api.IConnection,
) {
  // 1. Register a new member and obtain login context
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a new community as this member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          // logo_uri and banner_uri omitted (not present if unset)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Attempt to fetch a membership with a non-existent membershipId
  const invalidMembershipId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with not found for invalid membershipId",
    async () => {
      await api.functional.communityPlatform.member.communities.memberships.at(
        connection,
        {
          communityId: community.id,
          membershipId: invalidMembershipId,
        },
      );
    },
  );
}
