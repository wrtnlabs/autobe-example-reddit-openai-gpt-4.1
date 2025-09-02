import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate refreshing a guest session with a valid (non-expired)
 * refresh_token.
 *
 * Ensures guest session continuity and analytics record preservation for a
 * temporary, anonymous user.
 *
 * 1. Register a guest identity using /auth/guest/join
 *
 *    - Obtain guest session JWT and refresh_token
 *    - Save guest.id and refresh_token for use in refresh flow
 * 2. Call /auth/guest/refresh with valid refresh_token
 *
 *    - Should return a new JWT (IAuthorizationToken)
 *    - Guest.id should match pre-refresh guest.id, no new guest is created
 * 3. Validate that:
 *
 *    - New access token is returned and not empty
 *    - Guest.id post-refresh is identical
 *    - Guest_identifier post-refresh is identical
 *    - Guest analytics record (excluding timestamps) is preserved
 *    - All typed values match DTO constraints
 */
export async function test_api_guest_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Register/Join guest session
  const joinResult: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ICommunityPlatformGuest.ICreate,
    });
  typia.assert(joinResult);

  // Save tokens and initial guest identity
  const refreshToken: string = joinResult.token.refresh;
  const guestBefore = joinResult.guest;

  // Step 2: Refresh session using valid refresh token
  const refreshResult: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformGuest.IRefreshRequest,
    });
  typia.assert(refreshResult);

  // Step 3: Validation of session continuity and type safety
  TestValidator.predicate(
    "guest.refresh returns a non-empty new JWT token",
    !!refreshResult.token.access && refreshResult.token.access.length > 0,
  );
  TestValidator.equals(
    "refreshed guest id matches original",
    refreshResult.guest.id,
    guestBefore.id,
  );
  TestValidator.equals(
    "refreshed guest identifier matches original",
    refreshResult.guest.guest_identifier,
    guestBefore.guest_identifier,
  );
  // Optional: created_at could, in some backend implementations, be changed on refresh; exclude it
  TestValidator.equals(
    "refreshed guest analytics record is preserved (excluding created_at)",
    refreshResult.guest,
    guestBefore,
    (key) => key === "created_at",
  );
}
