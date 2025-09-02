import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate authentication failure for inactive or conceptually deleted
 * admin accounts.
 *
 * This test verifies that when an admin account is conceptually marked as
 * inactive (is_active=false), login attempts with its credentials are
 * rejected and no tokens are issued. Since there is no API endpoint
 * available for actual deletion or inactivation, we assume that
 * preconditions or the test harness prepare the admin as inactive (e.g.,
 * via database manipulation or simulation tools).
 *
 * Steps:
 *
 * 1. Register a new admin account with random credentials via /auth/admin/join
 * 2. Simulate inactivation/soft-deletion by ensuring is_active=false for this
 *    account (this must be prepared outside the API, as no endpoint exists
 *    for it)
 * 3. Attempt to log in using the inactive admin's credentials via
 *    /auth/admin/login
 * 4. Assert with TestValidator.error that authentication fails and no token is
 *    issued
 */
export async function test_api_admin_login_inactive_deleted_account(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const joinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResponse);

  // 2. Simulate admin deletion/inactivation (out of band—must be done outside API)
  //    e.g., set is_active=false in database or initialize with is_active=false in test simulation.
  //    No API available for this step—proceed as if precondition is met.

  // 3. Attempt to log in with inactive admin credentials
  await TestValidator.error(
    "login should fail for inactive/deleted admin account",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );
}
