import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the successful refresh of JWT tokens for an authenticated admin
 * account.
 *
 * Business context: Admins should be able to seamlessly refresh their
 * session and receive new authorization tokens as long as their refresh
 * token is valid, without the need to re-enter their credentials. This
 * supports continuous privileged sessions for admin users, meeting security
 * and convenience requirements.
 *
 * This test ensures that the refresh endpoint correctly validates a valid,
 * non-expired refresh token, issues new access/refresh tokens, and
 * maintains correct admin privilege claims.
 *
 * Step-by-step process:
 *
 * 1. Register a new admin account (and auto-login) to obtain initial
 *    access/refresh tokens.
 * 2. Trigger a refresh by submitting the valid, unexpired refresh token.
 * 3. Validate the refreshed token structure and correct admin information.
 * 4. Confirm that new JWT tokens differ from the original (i.e., fresh tokens
 *    are issued).
 * 5. Verify that privilege flags and admin IDs are unchanged, and that
 *    expiration/refreshable fields reflect extension of session lifetime.
 */
export async function test_api_admin_session_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register and login as a new admin (admin join)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const originalAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(originalAuth);

  // 2. Submit a valid, unexpired refresh token to /auth/admin/refresh
  const refreshInput = {
    refresh_token: originalAuth.token.refresh,
  } satisfies ICommunityPlatformAdmin.IRefresh;
  const refreshedAuth = await api.functional.auth.admin.refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshedAuth);

  // 3. Validate the refreshed authorization response structure
  TestValidator.predicate(
    "new access token should be non-empty string",
    typeof refreshedAuth.token.access === "string" &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be non-empty string",
    typeof refreshedAuth.token.refresh === "string" &&
      refreshedAuth.token.refresh.length > 0,
  );

  // 4. Confirm new JWT access and refresh tokens are issued (should be different from original)
  TestValidator.notEquals(
    "access token is rotated and differs from previous",
    refreshedAuth.token.access,
    originalAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated and differs from previous",
    refreshedAuth.token.refresh,
    originalAuth.token.refresh,
  );

  // 5. Admin ID and privilege flags are unchanged
  TestValidator.equals(
    "admin id remains the same",
    refreshedAuth.admin.id,
    originalAuth.admin.id,
  );
  TestValidator.equals(
    "admin email remains the same",
    refreshedAuth.admin.email,
    originalAuth.admin.email,
  );
  TestValidator.equals(
    "super admin privilege unchanged",
    refreshedAuth.admin.is_super_admin,
    originalAuth.admin.is_super_admin,
  );
  TestValidator.equals(
    "admin active flag unchanged",
    refreshedAuth.admin.is_active,
    true,
  );
  TestValidator.equals(
    "admin display name remains unchanged",
    refreshedAuth.admin.display_name,
    originalAuth.admin.display_name,
  );

  // 6. Expiry/refresh-lifetime fields are extended (refreshable_until should be later than before)
  TestValidator.predicate(
    "refreshed access token expiry is in the future",
    new Date(refreshedAuth.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until increased or at least not earlier than before",
    new Date(refreshedAuth.token.refreshable_until).getTime() >=
      new Date(originalAuth.token.refreshable_until).getTime(),
  );
}
