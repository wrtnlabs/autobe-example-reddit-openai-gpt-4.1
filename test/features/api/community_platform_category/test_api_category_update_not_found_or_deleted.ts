import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test error handling when updating a non-existent or deleted category.
 *
 * This test validates that the community platform category update endpoint
 * correctly returns a not found error (404) when attempting to update a
 * category that does not exist or one that has been soft-deleted. The test
 * ensures:
 *
 * 1. An admin account is registered and authenticated for privileged
 *    operations.
 * 2. An attempt to update a random (never created) categoryId should return a
 *    404 error.
 * 3. When a category is created and then deleted (soft deleted), any update
 *    attempt on that category should also return a 404 error.
 *
 * These checks confirm robust error handling and that deleted categories
 * are truly protected from modification.
 *
 * **Process Steps:**
 *
 * 1. Register and authenticate as an admin
 * 2. Attempt to update a non-existent category (random UUID)—expect HTTP 404
 *    not found
 * 3. Create a valid category
 * 4. Soft delete the valid category
 * 5. Attempt to update the just-deleted category—expect HTTP 404 not found
 */
export async function test_api_category_update_not_found_or_deleted(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "strongPassword123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Attempt to update a non-existent category (random UUID)—should return 404
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "updating non-existent category should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.categories.update(
        connection,
        {
          categoryId: randomCategoryId,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 3. Create a real category
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // 4. Soft delete that category
  await api.functional.communityPlatform.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // 5. Attempt to update the just-deleted category—should return 404
  await TestValidator.httpError(
    "updating a deleted category should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.categories.update(
        connection,
        {
          categoryId: category.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );
}
