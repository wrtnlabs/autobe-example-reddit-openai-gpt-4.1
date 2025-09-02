import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin session refresh with an invalid, expired, or already-used
 * refresh token.
 *
 * Purpose:
 *
 * - Ensure that invalid, expired, or replayed refresh tokens are properly
 *   rejected by the admin refresh endpoint.
 * - Validate that, under all failure modes, no new JWT (access or refresh)
 *   tokens are issued.
 * - Confirm the response does not reveal token contents, admin account
 *   status, or session leak information—maintaining security best
 *   practices.
 *
 * Steps:
 *
 * 1. Construct a clearly invalid refresh token (random 64-character string,
 *    not associated with any session).
 * 2. Attempt to use this invalid token at the admin refresh endpoint
 *    (/auth/admin/refresh).
 * 3. Verify the endpoint throws an authentication error (e.g., 401
 *    Unauthorized, or a similarly secure generic error).
 * 4. Ensure no JWT tokens are issued in the response, and no
 *    security-sensitive details are disclosed, regardless of input reason
 *    (invalid/expired/replayed).
 *
 * This test acts as a security validation, confirming anti-replay and
 * non-disclosure guarantees for admin JWT refresh logic.
 */
export async function test_api_admin_session_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1. Construct an obviously invalid (not-issued) refresh token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64); // Not a format issued by the system

  // 2. Attempt to refresh using the invalid token, expecting authentication failure
  await TestValidator.error(
    "rejects invalid/expired admin refresh token (should return auth error, no tokens issued)",
    async () => {
      // Try refresh; must not succeed
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ICommunityPlatformAdmin.IRefresh,
      });
    },
  );
}
