import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import type { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Ensure that unauthorized (unauthenticated) users cannot audit admin
 * session data.
 *
 * This test verifies platform-level access controls by confirming that the
 * PATCH /communityPlatform/admin/sessions endpoint—which exposes sensitive
 * session/audit information—refuses requests from clients who do not
 * present valid admin authentication. Merely registering (joining) as an
 * admin is insufficient: Only authenticated admin sessions may access the
 * endpoint. This defends against privilege escalation and accidental data
 * disclosures.
 *
 * Process:
 *
 * 1. Register a valid admin account by calling POST /auth/admin/join
 *    (dependency step). Do NOT reuse the returned Authorization token or
 *    profile afterwards.
 * 2. Prepare a new api.IConnection instance with empty headers (guaranteed no
 *    Authorization present).
 * 3. Attempt a PATCH call to /communityPlatform/admin/sessions with this
 *    unauthenticated connection and a valid (empty) IRequest body.
 * 4. Verify that the API rejects the unauthorized attempt, raising an error
 *    (status code may be 401/403/etc).
 * 5. Confirm by assertion that unauthorized users cannot audit admin sessions
 *    and the endpoint remains secure.
 */
export async function test_api_admin_sessions_search_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Register an admin user (dependency): create but do NOT use returned Authorization token—no subsequent authenticated requests.
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Prepare a new connection with *no* Authorization header at all.
  //    This ensures the PATCH request is sent as an unauthenticated client.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt admin session auditing while unauthorized: must trigger error.
  await TestValidator.error(
    "unauthenticated users cannot audit admin sessions",
    async () => {
      await api.functional.communityPlatform.admin.sessions.index(unauthConn, {
        body: {}, // ICommunityPlatformSession.IRequest allows all-optional fields (this is a valid query)
      });
    },
  );
}
