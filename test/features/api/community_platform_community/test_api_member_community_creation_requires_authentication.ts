import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test that creating a new community as a guest (not logged in) is
 * forbidden.
 *
 * This E2E test ensures that the community creation endpoint enforces
 * proper authentication checks.
 *
 * Steps:
 *
 * 1. Register a new member account (does not use its token for the test, just
 *    ensures that a valid member exists)
 * 2. Prepare a valid new ICommunityPlatformCommunity.ICreate object with
 *    random data
 * 3. Create a connection WITHOUT an Authorization header to simulate a guest
 *    user
 * 4. Attempt to create a new community using the guest connection and expect
 *    an authorization error (e.g., 401/403)
 *
 * This test validates that only authenticated users can create communities,
 * and unauthenticated guests are properly rejected by the API.
 */
export async function test_api_member_community_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a member (but intentionally do not use its token)
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. Prepare valid request body for community creation
  const createBody = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    // logo_uri and banner_uri are optional and omitted for edge testing
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 3. Remove Authorization header from connection to simulate guest
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to create a community as guest and expect an error
  await TestValidator.error(
    "guest cannot create member community",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        guestConnection,
        { body: createBody },
      );
    },
  );
}
