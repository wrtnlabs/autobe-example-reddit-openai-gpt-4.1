import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test successful soft deletion of a community category as an authenticated
 * admin.
 *
 * Business context:
 *
 * - Only admins are allowed to retire categories.
 * - Deletion is soft: the category is omitted from category lists but remains
 *   in the DB for audit.
 *
 * Step-by-step process:
 *
 * 1. Join as admin, authenticating and establishing privileged context.
 * 2. Create a new community category as that admin.
 * 3. Perform a soft-delete (erase) on the newly created category.
 * 4. (Documentation only) In a full E2E suite, verify the deleted category is
 *    omitted from all index/list results (no API provided for this in
 *    current SDK).
 * 5. (Audit verification - not testable) Note: the underlying category record
 *    should persist for audit, unverifiable via public APIs.
 */
export async function test_api_category_erase_success_admin(
  connection: api.IConnection,
) {
  // 1. Join as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a category as admin
  const categoryData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformCategory.ICreate;
  const createdCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // 3. Soft-delete the category
  await api.functional.communityPlatform.admin.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  /**
   * 4. (Documentation only): In a fully instrumented environment, verify that the
   *    deleted category does not appear in the list of categories returned by
   *    admin/user index endpoints. No such endpoint is exposed by the provided
   *    API SDK, so this must remain a doc note.
   *
   * Example (not implemented): const categories = await
   * api.functional.communityPlatform.admin.categories.index(connection);
   * TestValidator.predicate( "Soft-deleted category must not appear in category
   * index results", categories.every(category => category.id !==
   * createdCategory.id), );
   */

  /**
   * 5. (Audit): The underlying category row should still exist in the database for
   *    compliance and recovery. This property is not testable through the
   *    current API surface (doc note only).
   */
}
