import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";

/**
 * Validates not-found error handling when querying a non-existent search
 * query log record by ID (admin context).
 *
 * This E2E test assures that, even with valid authentication as an admin
 * (created via /auth/admin/join), accessing GET
 * /communityPlatform/admin/search/queries/:searchQueryId with a
 * non-existent ID yields a correct not-found response (404).
 *
 * Steps:
 *
 * 1. Register a new admin account (for authentication context).
 * 2. Make a GET request to search query detail endpoint using a random UUID
 *    not present in the system.
 * 3. Assert that a not-found error occurs and no inappropriate data is
 *    returned.
 */
export async function test_api_admin_search_query_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin for authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Attempt to fetch a search query log record with a non-existent (random) UUID
  const randomNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should throw not-found error for non-existent search query ID",
    async () => {
      await api.functional.communityPlatform.admin.search.queries.at(
        connection,
        {
          searchQueryId: randomNonExistentId,
        },
      );
    },
  );
}
