import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Validate successful retrieval of a community platform category detail as
 * admin.
 *
 * This test ensures that after authenticating as an admin, a category can
 * be created, and its details can then be queried by UUID, with all
 * expected fields matching and being well-formed. It covers authorization,
 * creation, and detail retrieval flows.
 *
 * Steps:
 *
 * 1. Register (join) as an admin to obtain authentication and authorization
 *    context.
 * 2. Create a new category via the admin endpoint, storing all entered fields.
 * 3. Fetch the created category's detail using its UUID.
 * 4. Assert all fields in the detail response, including code, name,
 *    description, and timestamps, match those provided or expected by the
 *    system.
 * 5. Type and business logic validations for the returned category entity.
 */
export async function test_api_category_detail_success_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Admin join to get authentication
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 2. Create a new category as admin
  const categoryCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const createdCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryCreateInput,
    });
  typia.assert(createdCategory);

  // 3. Query detail of the newly created category as admin
  const fetchedCategory =
    await api.functional.communityPlatform.admin.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(fetchedCategory);

  // 4. Validate response fields match those entered and are well-formed
  TestValidator.equals(
    "category id matches returned resource",
    fetchedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category code matches input",
    fetchedCategory.code,
    categoryCreateInput.code,
  );
  TestValidator.equals(
    "category name matches input",
    fetchedCategory.name,
    categoryCreateInput.name,
  );
  TestValidator.equals(
    "category description matches input",
    fetchedCategory.description,
    categoryCreateInput.description,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof fetchedCategory.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.+)?$/.test(
        fetchedCategory.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof fetchedCategory.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.+)?$/.test(
        fetchedCategory.updated_at,
      ),
  );
  TestValidator.predicate(
    "id is a valid UUID format",
    typeof fetchedCategory.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        fetchedCategory.id,
      ),
  );
}
