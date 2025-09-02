import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Validate conflict error when attempting to update a community category's
 * name to duplicate another category's name (violating uniqueness
 * constraint).
 *
 * This test simulates the following workflow:
 *
 * 1. Admin account is created and authenticated.
 * 2. The admin creates a first category with a unique code and name.
 * 3. The admin creates a second category with a different (also unique) code
 *    and name.
 * 4. Attempt to update the second category's name to match the first
 *    category's name (forcing a uniqueness conflict on the name field).
 * 5. Confirm that the API returns an error (conflict or validation error) in
 *    response and does not allow the duplication.
 *
 * This ensures the platform enforces category name uniqueness not only on
 * creation but also on updates.
 */
export async function test_api_category_update_duplicate_code_or_name(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd1234";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create first category with unique code and name
  const categoryCode1 = RandomGenerator.alphaNumeric(10);
  const categoryName1 = RandomGenerator.name(3);
  const category1 =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: categoryCode1,
        name: categoryName1,
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category1);

  // 3. Create second category with a different code and name
  let categoryCode2: string;
  do {
    categoryCode2 = RandomGenerator.alphaNumeric(10);
  } while (categoryCode2 === categoryCode1);
  const categoryName2 = RandomGenerator.name(3);
  let category2 =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: categoryCode2,
        name: categoryName2,
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category2);

  // 4. Try to update the second category to have the same name as the first category (should fail)
  await TestValidator.error(
    "category update should fail when setting duplicate name",
    async () => {
      await api.functional.communityPlatform.admin.categories.update(
        connection,
        {
          categoryId: category2.id,
          body: {
            name: categoryName1,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );
}
