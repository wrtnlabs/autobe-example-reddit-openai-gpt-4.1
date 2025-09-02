import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test deletion of a non-existent or already deleted community category by
 * admin.
 *
 * This test validates that attempting to soft-delete a category that
 * doesn't exist, or one that has already been deleted, correctly returns a
 * 'not found' error. This ensures robust error handling and prevents
 * improper silent failures.
 *
 * Steps:
 *
 * 1. Register an admin account for authentication. Authentication context is
 *    required for category admin operations.
 * 2. Attempt to delete a random UUID (never created as a category) and assert
 *    a 'not found' error is thrown.
 * 3. Create a new platform category as an admin.
 * 4. Soft delete the category (should succeed on first attempt).
 * 5. Attempt to delete the same category again. Assert a 'not found' error is
 *    thrown for repeat deletion attempt.
 */
export async function test_api_category_erase_not_found_or_already_deleted(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPW1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Attempt to delete a random (non-existent) category UUID
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent category triggers not found error",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryId: randomCategoryId,
        },
      );
    },
  );

  // 3. Create a new community category
  const uniqueCode = RandomGenerator.alphaNumeric(12);
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: uniqueCode,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // 4. Soft-delete the just created category (should succeed)
  await api.functional.communityPlatform.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // 5. Attempt to delete the category once more (should return not found)
  await TestValidator.error(
    "re-deleting already deleted category returns not found error",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryId: category.id,
        },
      );
    },
  );
}
