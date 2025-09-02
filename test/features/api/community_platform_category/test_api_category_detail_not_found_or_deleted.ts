import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test error handling for non-existent or deleted community category
 * details.
 *
 * Validates that attempting to fetch a community category with a
 * non-existent categoryId returns a not found error. Also validates that
 * fetching a category which has been soft-deleted (using the erase
 * endpoint) returns a not found error. The test ensures proper API not
 * found handling for both missing and logically deleted categories for
 * administrators.
 *
 * Steps:
 *
 * 1. Sign up as an admin (required for authentication and all subsequent
 *    operations)
 * 2. Try to fetch a category with a random UUID that was never created (should
 *    fail with not found)
 * 3. Create a new community category to obtain a valid categoryId
 * 4. Soft delete this category using the erase endpoint
 * 5. Attempt to fetch the soft-deleted category (should fail with not found)
 */
export async function test_api_category_detail_not_found_or_deleted(
  connection: api.IConnection,
) {
  // 1. Sign up as admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Try to fetch a category with random (never-created) UUID - expect not found
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent categoryId should return not found",
    async () => {
      await api.functional.communityPlatform.admin.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );

  // 3. Create a new category
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // 4. Soft delete the category
  await api.functional.communityPlatform.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // 5. Attempt to fetch the soft-deleted categoryId - expect not found
  await TestValidator.error(
    "fetching soft-deleted categoryId should return not found",
    async () => {
      await api.functional.communityPlatform.admin.categories.at(connection, {
        categoryId: category.id,
      });
    },
  );
}
