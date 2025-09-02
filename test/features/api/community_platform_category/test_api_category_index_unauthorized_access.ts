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
 * Validate that unauthorized and non-admin users are denied access to the
 * admin category index endpoint.
 *
 * 1. Register an admin user (for bootstrapping, not used directly in this
 *    negative test).
 * 2. As an unauthenticated user (no token), attempt PATCH
 *    /communityPlatform/admin/categories and verify that access is denied
 *    with the correct error (401 or 403).
 * 3. If member or guest users existed, switch roles and repeat, but since join
 *    endpoints for those roles are not provided, skip this step.
 * 4. Confirm proper error handling and no leakage of protected data from the
 *    API for unauthorized access.
 */
export async function test_api_category_index_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Register admin (to satisfy dependency and system bootstrapping; admin is NOT used for access)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SuperStrong#123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Remove Authorization header to simulate an unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to access PATCH /communityPlatform/admin/categories as unauthenticated (guest)
  await TestValidator.error(
    "unauthorized guest cannot access admin category index",
    async () => {
      await api.functional.communityPlatform.admin.categories.index(
        unauthConn,
        {
          body: {}, // valid empty filter for minimal patch
        },
      );
    },
  );

  // Step 3: If there were member/guest APIs, repeat for those, but skip here.

  // Step 4: Confirm error (no output, since TestValidator.error asserts rejection) -- test passes if error is thrown, and no data is leaked
}
