import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate rejection of member refresh with an invalid or expired token.
 *
 * This test ensures that the /auth/member/refresh endpoint returns a clear
 * authentication error when a user attempts to refresh their session using
 * an invalid or expired refresh token. It confirms that no new JWT tokens
 * are issued, no user identity information is leaked, and session/account
 * state remains unchanged in this failure scenario. The focus is on
 * security: the API must not reveal member data or inadvertently renew
 * session state when presented with an improper token.
 *
 * Steps:
 *
 * 1. Construct a syntactically valid but non-existent or obviously invalid
 *    refresh token string.
 * 2. Call the /auth/member/refresh endpoint using this token via the SDK.
 * 3. Assert that an authentication error (such as HTTP 401/403) is thrown and
 *    that no JWT tokens or member data are returned.
 * 4. Do not attempt to inspect output data on error (as errors are handled by
 *    exceptions, not successful responses).
 */
export async function test_api_member_token_refresh_invalid_token_failure(
  connection: api.IConnection,
) {
  // 1. Create a syntactically valid but invalid refresh token
  const invalidRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + // header
    "INVALID_INVALID_INVALID." + // deliberately fake payload/invalid
    RandomGenerator.alphaNumeric(128); // fake signature

  // 2. Attempt the refresh and expect an authentication error
  await TestValidator.error(
    "should return authentication error for invalid/expired refresh token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ICommunityPlatformMember.IRefreshRequest,
      });
    },
  );
  // 3. No further checks needed: error thrown means test passes. No member data or tokens should be in any success path.
}
