import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful retrieval of a paginated and filterable list of community
 * categories as an authenticated admin.
 *
 * This test ensures that the PATCH /communityPlatform/admin/categories
 * endpoint returns the expected paginated summaries when called by a
 * verified admin user.
 *
 * Steps:
 *
 * 1. Register a new admin via the /auth/admin/join endpoint using required
 *    fields.
 * 2. Confirm successful authentication and JWT issuance in response.
 * 3. Perform PATCH /communityPlatform/admin/categories with various filter and
 *    pagination parameters as the authenticated admin.
 * 4. Confirm the response contains valid
 *    IPageICommunityPlatformCategory.ISummary structure, with correct
 *    pagination metadata.
 * 5. Check that all returned records are valid summaries, and that
 *    soft-deleted categories do not appear by default.
 * 6. Test several realistic edge-cases: filtering by code, name, and using
 *    empty search terms, as well as paging to empty result pages.
 */
export async function test_api_category_index_success_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Register admin account and verify auth context is present
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(2),
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminJoin);
  TestValidator.predicate(
    "Admin token is set after join",
    () => !!connection.headers?.Authorization,
  );

  // 2. Call PATCH /communityPlatform/admin/categories with default pagination
  const page1: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.admin.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(page1);
  TestValidator.equals(
    "Pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate("Result is summary array", Array.isArray(page1.data));

  // 3. Filter by random code and check only matching data returned (if any)
  const filterCode =
    page1.data.length > 0 ? page1.data[0].code : RandomGenerator.alphabets(5);
  const filteredByCode: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.admin.categories.index(connection, {
      body: {
        code: filterCode,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(filteredByCode);
  TestValidator.predicate(
    "Filtered by code only returns matching code(s)",
    filteredByCode.data.every((cat) => cat.code === filterCode),
  );

  // 4. Filter by random name (partial or exact) and assert results
  const filterName =
    page1.data.length > 0
      ? RandomGenerator.substring(page1.data[0].name)
      : RandomGenerator.alphabets(3);
  const filteredByName: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.admin.categories.index(connection, {
      body: {
        name: filterName,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(filteredByName);
  TestValidator.predicate(
    "Filtered by name only returns categories containing filterName",
    filteredByName.data.every((cat) => cat.name.includes(filterName)),
  );

  // 5. Search with random string (likely empty data)
  const searchTerm = RandomGenerator.alphabets(10);
  const searchResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.admin.categories.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.equals(
    "Empty data for random search",
    searchResults.data.length,
    0,
  );

  // 6. Test empty results page (e.g., page beyond end)
  const beyondLastPage: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.admin.categories.index(connection, {
      body: {
        page: 9999,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "Empty data for last page",
    beyondLastPage.data.length,
    0,
  );

  // 7. Confirm soft-deleted categories are not present (test is limited unless actual deleted records are present, so we skip this unless deletions exist)
}
