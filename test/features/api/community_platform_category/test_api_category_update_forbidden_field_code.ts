import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Validate that updating the immutable community category 'code' field is
 * forbidden for admin users.
 *
 * Steps:
 *
 * 1. Create an admin account and establish auth context.
 * 2. Create a new community platform category (with required code and name).
 * 3. Attempt to update the created category's 'code' field using the update
 *    endpoint, expecting the operation to be rejected (field
 *    immutability).
 * 4. Confirm correct error response using TestValidator.error. No attempt
 *    should succeed in updating an immutable field.
 */
export async function test_api_category_update_forbidden_field_code(
  connection: api.IConnection,
) {
  // 1. Register an admin account and obtain authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Abcde12345!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a new community category to set up test context
  const categoryInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);
  TestValidator.equals(
    "created category code matches input",
    category.code,
    categoryInput.code,
  );

  // 3. Attempt to update the immutable 'code' field—should fail with forbidden/validation error
  await TestValidator.error(
    "update of immutable category code field is blocked",
    async () => {
      await api.functional.communityPlatform.admin.categories.update(
        connection,
        {
          categoryId: category.id,
          // The following cast deliberately bypasses ICommunityPlatformCategory.IUpdate type safety
          // to simulate a forbidden-field update attempt for E2E validation only:
          body: {
            code: category.code + "_new", // forbidden: code is immutable
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 4 }),
          } as any, // Here, 'code' is explicitly not allowed by DTO, just for this failure-case.
        },
      );
    },
  );

  // No further verification is performed due to lack of available category read endpoint.
}
