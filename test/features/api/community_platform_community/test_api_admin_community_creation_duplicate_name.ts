import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validate that the API prevents creating a community with a duplicate
 * name.
 *
 * Business context: Community names must be unique platform-wide. Register
 * an admin, create a category, and then create a community with a unique
 * name. Attempt to create another community with the same name; verify the
 * API rejects this due to the duplicate name constraint.
 *
 * Steps:
 *
 * 1. Register a new admin and obtain authorization.
 * 2. Create a unique community category as admin
 * 3. Create a community with a unique name in the category
 * 4. Attempt to create another community with the same name (should fail)
 * 5. Assert a conflict/validation error is returned on the second attempt
 */
export async function test_api_admin_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const email = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password: "StrongPassw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Create a unique community category
  const categoryInput: ICommunityPlatformCategory.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  };
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 3. Create a community with a unique name in this category
  const communityName = RandomGenerator.alphaNumeric(12);
  const firstCreateInput: ICommunityPlatformCommunity.ICreate = {
    category_id: category.id,
    name: communityName,
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    logo_uri: undefined,
    banner_uri: undefined,
  };
  const firstCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: firstCreateInput },
    );
  typia.assert(firstCommunity);

  // 4. Attempt to create another community with the same name (edge case)
  const secondCreateInput: ICommunityPlatformCommunity.ICreate = {
    category_id: category.id,
    name: communityName, // duplicate
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri: undefined,
    banner_uri: undefined,
  };
  await TestValidator.error("rejects duplicate community name", async () => {
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: secondCreateInput },
    );
  });
}
