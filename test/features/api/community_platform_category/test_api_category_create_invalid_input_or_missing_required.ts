import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Validate error handling (input validation) for community platform
 * category creation as admin.
 *
 * This test ensures that attempting to create a new category with missing
 * required fields or invalid data triggers proper validation errors, and no
 * categories are created. The admin authentication context is established
 * as a prerequisite before all create attempts.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin user
 * 2. Attempt to create a category with missing 'code' field
 * 3. Attempt to create a category with missing 'name' field
 * 4. Attempt to create a category with both 'code' and 'name' as empty strings
 * 5. Attempt to create a category with overly long strings for 'code' and
 *    'name'
 * 6. Confirm each request triggers an error response with appropriate
 *    validation handling
 */
export async function test_api_category_create_invalid_input_or_missing_required(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test_pw_12345",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminReg);

  // 2. Attempt to create a category with missing 'code'
  await TestValidator.error(
    "missing code triggers validation error",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          // Intentionally omit 'code' to simulate missing required
          body: {
            name: "Category without code",
          } as any,
        },
      );
    },
  );

  // 3. Attempt to create a category with missing 'name'
  await TestValidator.error(
    "missing name triggers validation error",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          // Intentionally omit 'name' to simulate missing required
          body: {
            code: "movies_tv",
          } as any,
        },
      );
    },
  );

  // 4. Attempt to create a category with both code and name as empty strings
  await TestValidator.error(
    "empty code and name triggers validation error",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          body: {
            code: "",
            name: "",
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 5. Attempt to create a category with overly long values for code/name
  await TestValidator.error(
    "overly long code and name triggers validation error",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          body: {
            code: RandomGenerator.alphabets(300),
            name: RandomGenerator.alphabets(300),
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
