import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test the successful update of a community category by an authenticated
 * admin.
 *
 * This test covers a privileged scenario where only authenticated admins
 * can update existing category details. It ensures business rules regarding
 * immutability (code cannot be changed) are respected and audits the
 * behavior of the update endpoint for realistic life-cycle flows.
 *
 * **Workflow:**
 *
 * 1. Register a new admin. This establishes the authentication context.
 * 2. Create a new community category (with random code, name, and
 *    description).
 * 3. Update the mutable fields of the category (name, description). Attempting
 *    to change code is not allowed.
 * 4. Validate that the returned category has the same code as before, with
 *    updated name/description, and other fields like id, created_at, and
 *    updated_at behaving as expected.
 */
export async function test_api_category_update_success_admin(
  connection: api.IConnection,
) {
  // 1. Register as a new admin (authentication prerequisite)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.admin.email,
    adminJoinInput.email,
  );
  typia.assert<string & tags.Format<"uuid">>(adminAuth.admin.id);

  // 2. Create a new category
  const categoryCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryCreateInput,
    });
  typia.assert(category);
  TestValidator.equals(
    "new category code matches input",
    category.code,
    categoryCreateInput.code,
  );

  // 3. Prepare update input (change name, description; code remains the same)
  const updateInput = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCategory.IUpdate;

  // 4. Update the category by UUID
  const updated =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryId: category.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 5. Validation
  TestValidator.equals(
    "updated category id unchanged",
    updated.id,
    category.id,
  );
  TestValidator.equals(
    "updated category code unchanged (immutable)",
    updated.code,
    category.code,
  );
  TestValidator.equals(
    "category name updated correctly",
    updated.name,
    updateInput.name,
  );
  TestValidator.equals(
    "category description updated correctly",
    updated.description,
    updateInput.description,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    category.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    category.updated_at,
  );
}
