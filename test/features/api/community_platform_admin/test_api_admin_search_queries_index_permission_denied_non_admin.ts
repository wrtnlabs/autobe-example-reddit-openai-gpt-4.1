import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";
import type { IPageICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchQuery";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate enforcement of admin-only permissions on the search queries
 * endpoint.
 *
 * This test verifies that PATCH /communityPlatform/admin/search/queries is
 * inaccessible to unauthenticated users, enforcing the required admin-only
 * restriction.
 *
 * Steps:
 *
 * 1. Use an unauthenticated API connection (no Authorization token).
 * 2. Attempt to call PATCH /communityPlatform/admin/search/queries with a
 *    valid search query log request body.
 * 3. Assert that the response is an authorization/permission error (401 or
 *    403), not a data validation error.
 * 4. Confirm the endpoint's security policy is in effect for all non-admin
 *    users.
 */
export async function test_api_admin_search_queries_index_permission_denied_non_admin(
  connection: api.IConnection,
) {
  // Ensure connection is unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "PATCH /communityPlatform/admin/search/queries must deny permission to unauthenticated/non-admin users",
    async () => {
      await api.functional.communityPlatform.admin.search.queries.index(
        unauthConn,
        {
          body: typia.random<ICommunityPlatformSearchQuery.IRequest>(),
        },
      );
    },
  );
}
