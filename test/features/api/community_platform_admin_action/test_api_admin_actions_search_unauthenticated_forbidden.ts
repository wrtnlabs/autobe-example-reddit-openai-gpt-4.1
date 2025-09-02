import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import type { IPageICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that unauthenticated users are prohibited from listing admin
 * action logs.
 *
 * This test verifies strict access control enforcement on the PATCH
 * /communityPlatform/admin/adminActions endpoint. It ensures that only
 * properly authenticated admin users may search/admin action logs, and all
 * unauthenticated (or logged-out) attempts are correctly denied with an
 * error response.
 *
 * Why this test is necessary:
 *
 * - Confirms critical security: admin/moderation audit logs are not
 *   accessible to unauthorized/non-admin users.
 * - Prevents information leakage: attackers or non-privileged users should
 *   not be able to enumerate admin actions or internal audit data.
 * - Ensures robust negative access control by covering both cases: no
 *   authentication at all, and logged-out session (i.e., Authorization
 *   header removed).
 *
 * Step-by-step process:
 *
 * 1. Register a new admin using /auth/admin/join (prerequisite/dependency
 *    setup).
 * 2. Create a connection context with empty headers (simulates unauthenticated
 *    session).
 * 3. Attempt to PATCH /communityPlatform/admin/adminActions using the
 *    unauthenticated context with an empty search body object, and verify
 *    access is denied (TestValidator.error).
 * 4. Construct a second connection context with Authorization header
 *    explicitly removed (logged-out simulation), and repeat the
 *    request/assertion.
 * 5. Both attempts must result in access denial—no admin action data or
 *    partial data exposure occurs.
 */
export async function test_api_admin_actions_search_unauthenticated_forbidden(
  connection: api.IConnection,
) {
  // 1. Register an admin for dependency/initialization (ensures system setup, not used for the unauthenticated case)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Simulate an unauthenticated user by providing a connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list admin actions",
    async () => {
      await api.functional.communityPlatform.admin.adminActions.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 3. Simulate a logged-out session by removing the Authorization header
  const loggedOutConn: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  if (loggedOutConn.headers && loggedOutConn.headers.Authorization)
    delete loggedOutConn.headers.Authorization;
  await TestValidator.error(
    "logged-out admin cannot list admin actions",
    async () => {
      await api.functional.communityPlatform.admin.adminActions.index(
        loggedOutConn,
        {
          body: {},
        },
      );
    },
  );
}
