import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Ensure that guest analytics for the platform are protected from
 * unauthenticated access.
 *
 * This test confirms that the PATCH /communityPlatform/admin/guests
 * endpoint is inaccessible to non-authenticated users. The guest analytics
 * endpoint is restricted to admin users and must not leak auditing data to
 * anonymous clients.
 *
 * Steps:
 *
 * 1. Register a new admin account via POST /auth/admin/join to ensure setup
 *    routines are working (but do not login).
 * 2. Construct an API connection object with no Authorization header to
 *    simulate a guest/non-authenticated client.
 * 3. Attempt to retrieve the guest analytics list via PATCH
 *    /communityPlatform/admin/guests with empty or default search.
 * 4. Expect and validate an error response indicating insufficient
 *    authentication (401 or 403).
 * 5. Confirm that no guest analytics data is leaked to the unauthenticated
 *    context.
 */
export async function test_api_admin_guests_list_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin (setup only, not used for this test)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "test1234!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create an unauthenticated connection (remove Authorization if present)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3/4: Attempt to access PATCH /communityPlatform/admin/guests as guest and expect authorization error
  await TestValidator.error(
    "PATCH /communityPlatform/admin/guests must reject unauthenticated access",
    async () => {
      await api.functional.communityPlatform.admin.guests.index(unauthConn, {
        body: {},
      });
    },
  );
}
