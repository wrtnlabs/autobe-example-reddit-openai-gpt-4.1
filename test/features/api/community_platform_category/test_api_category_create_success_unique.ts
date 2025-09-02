import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test successful creation of a new community category by an authenticated
 * admin.
 *
 * Validates full workflow: admin joins, creates a unique category, and the
 * result is checked for all expected fields, uniqueness, and type
 * correctness.
 *
 * 1. Register a new admin using unique credentials.
 * 2. Authenticate as the new admin (token automatically handled by
 *    connection).
 * 3. Compose a unique category code and name for creation.
 * 4. Create the category with optional description using admin privilege.
 * 5. Validate that response includes all expected fields (id, code, name,
 *    created_at, updated_at; description matches input or is null).
 * 6. Confirm field values (code, name) and type correctness.
 */
export async function test_api_category_create_success_unique(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Compose unique category data
  const categoryCode = `test_${RandomGenerator.alphaNumeric(8)}`;
  const categoryName = `Test Category ${RandomGenerator.alphaNumeric(5)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });

  // 3. Create the category
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: categoryCode,
        name: categoryName,
        description: categoryDescription,
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // 4. Validate response structure and intended values
  TestValidator.predicate(
    "category id is uuid",
    typeof category.id === "string" &&
      category.id.length > 0 &&
      category.id.includes("-"),
  );
  TestValidator.equals(
    "category code matches input",
    category.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "category created_at is ISO date-time",
    typeof category.created_at === "string" &&
      !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "category updated_at is ISO date-time",
    typeof category.updated_at === "string" &&
      !isNaN(Date.parse(category.updated_at)),
  );
}
