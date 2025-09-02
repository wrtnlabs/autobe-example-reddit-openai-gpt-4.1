import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Tests enforcement of unique community name constraint during community
 * creation.
 *
 * This test validates that it is not possible to create two communities
 * with the same name through the member API. The scenario covers both the
 * happy path (single creation with unique name) and the error path
 * (duplication attempt). It ensures the business rule for unique, immutable
 * community names (slugs) is enforced by the backend service.
 *
 * Steps:
 *
 * 1. Register a new member (for authentication and isolation).
 * 2. As this member, create the first community with a unique random name (and
 *    all necessary required fields).
 * 3. Attempt to create a second community using exactly the same name (and
 *    required metadata) as the first one.
 * 4. Verify that the second attempt fails (TestValidator.error), ensuring API
 *    uniqueness enforcement on the name field. Optionally, check that the
 *    error occurs as expected (e.g., conflict error, duplication error,
 *    etc.).
 */
export async function test_api_member_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Register a new member for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "authenticated member email matches input",
    memberAuth.member.email,
    email,
  );

  // 2. Create the first community with a unique random name
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const createCommunityInput = {
    category_id: categoryId,
    name: communityName,
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: createCommunityInput,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community name matches input",
    firstCommunity.name,
    communityName,
  );

  // 3. Attempt to create a second community with the same name
  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            ...createCommunityInput,
          },
        },
      );
    },
  );
}
