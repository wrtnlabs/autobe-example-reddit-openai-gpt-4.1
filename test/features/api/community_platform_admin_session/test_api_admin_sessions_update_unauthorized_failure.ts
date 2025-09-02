import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Validate that unauthorized users are unable to update sensitive platform
 * session metadata via the admin API.
 *
 * This test ensures that PUT requests to
 * /communityPlatform/admin/sessions/{sessionId} without proper admin
 * authentication (Anonymous/ordinary users) are unsuccessful and return an
 * authorization error.
 *
 * Implementation steps:
 *
 * 1. Register a new admin user using the admin join endpoint (to ensure at
 *    least one admin exists and the platform is in a valid state).
 * 2. Prepare a random, valid session UUID and session update DTO with
 *    plausible test values for the update attempt. (Note: No session
 *    listing/creation endpoint is available, so a random valid UUID is
 *    used, which is sufficient to test auth logic.)
 * 3. Create a new connection object with headers unset (explicitly no
 *    Authorization), simulating a completely unauthenticated user.
 * 4. Attempt to update an arbitrary session as an unauthorized user.
 * 5. Use TestValidator.error to check that the API rejects the request with an
 *    error (authorization failure expected).
 *
 * This test confirms that privilege escalation to sensitive session audit
 * functionality is strictly forbidden for unauthenticated/non-admin users,
 * ensuring compliance with security policies for admin endpoints.
 */
export async function test_api_admin_sessions_update_unauthorized_failure(
  connection: api.IConnection,
) {
  // Step 1: Register an initial admin (setup)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Prepare random session ID and update body for attempted update (no session listing endpoint provided)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    device_fingerprint: RandomGenerator.alphaNumeric(16),
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour in future
  } satisfies ICommunityPlatformSession.IUpdate;

  // Step 3: Create an unauthorized connection (no Authorization header)
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Attempt unauthorized session update (should fail)
  await TestValidator.error(
    "unauthorized session update should be forbidden",
    async () => {
      await api.functional.communityPlatform.admin.sessions.update(
        unauthorizedConn,
        {
          sessionId,
          body: updateBody,
        },
      );
    },
  );
}
