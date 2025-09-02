import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful deletion (invalidation) of an admin session by its owner.
 *
 * This test verifies that when an admin deletes their session through the
 * appropriate API endpoint, the session is immediately invalidated
 * (soft-deleted), causing instant logout and ensuring previously issued
 * authentication tokens can no longer be used.
 *
 * Steps:
 *
 * 1. Register a new admin using the 'join' endpoint to acquire an initial
 *    authorized session (tokens + admin profile).
 * 2. With the authenticated session, call DELETE
 *    /communityPlatform/admin/sessions/{sessionId} to invalidate the
 *    session.
 *
 *    - Note: We use the admin's id as the sessionId since dedicated session IDs
 *         are not available in the current DTO/API.
 * 3. Validate that the session is invalidated by immediately attempting access
 *    with the same token (should be rejected).
 * 4. Use TestValidator.error to assert that secured endpoints cannot be
 *    accessed after logout/session deletion.
 */
export async function test_api_admin_session_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin, retrieving authorized session tokens and admin id
  const joinRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinRes);
  const adminSessionToken = joinRes.token.access;
  const sessionId = joinRes.admin.id; // As session objects/types are not exposed, use admin.id as proxy for sessionId.

  // 2. Delete (invalidate) the session using the API
  await api.functional.communityPlatform.admin.sessions.erase(connection, {
    sessionId: sessionId,
  });

  // 3. Attempt to use the old token after deletion; should be forbidden (security enforced)
  //    Simulate a connection with the previous (now invalid) token
  const invalidConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: adminSessionToken,
    },
  };
  await TestValidator.error(
    "Old admin token is unusable after session deletion (logout enforced)",
    async () => {
      // Attempt another protected action which requires authentication (re-join fails, token is invalid)
      await api.functional.auth.admin.join(invalidConn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformAdmin.IJoin,
      });
    },
  );
}
