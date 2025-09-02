import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful session refresh for a member using a valid refresh token.
 *
 * This test ensures the correct functioning of the member session renewal
 * endpoint. It follows these steps:
 *
 * 1. Register a new member. The /auth/member/join endpoint returns the member
 *    object and JWT tokens.
 * 2. Extract the refresh token from the join response.
 * 3. Call /auth/member/refresh with the valid refresh token.
 * 4. On success, verify that: a) New session tokens are issued (access/refresh
 *    tokens changed). b) The member claims/identity in the response matches
 *    the original member (same id, email, etc).
 *
 * This covers the main happy path for token refresh and validates
 * token/identity continuity for session renewal.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new member to generate initial refresh token
  const createInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const joinResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createInput });
  typia.assert(joinResult);

  // 2. Extract the refresh token from join result
  const refreshToken = joinResult.token.refresh;

  // 3. Call refresh endpoint with valid refresh token
  const refreshResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformMember.IRefreshRequest,
    });
  typia.assert(refreshResult);

  // 4.a) Ensure new session tokens are issued (should rotate)
  TestValidator.notEquals(
    "new access token is different from old one",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from old one",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );

  // 4.b) Ensure member information remains identical (identity continuity)
  TestValidator.equals(
    "member id remains unchanged",
    refreshResult.member.id,
    joinResult.member.id,
  );
  TestValidator.equals(
    "member email remains unchanged",
    refreshResult.member.email,
    joinResult.member.email,
  );
  TestValidator.equals(
    "member is_active remains true",
    refreshResult.member.is_active,
    joinResult.member.is_active,
  );
  TestValidator.equals(
    "member display name matches",
    refreshResult.member.display_name,
    joinResult.member.display_name,
  );
  TestValidator.equals(
    "member created_at unchanged",
    refreshResult.member.created_at,
    joinResult.member.created_at,
  );
  // updated_at or last_login_at may change as a result of refresh, but should always be valid date-time strings
  TestValidator.equals(
    "member updated_at is string",
    typeof refreshResult.member.updated_at,
    "string",
  );
  if (
    refreshResult.member.last_login_at !== null &&
    refreshResult.member.last_login_at !== undefined
  )
    TestValidator.equals(
      "member last_login_at is string if set",
      typeof refreshResult.member.last_login_at,
      "string",
    );
  // Optionally check that account has not been soft-deleted
  if (
    refreshResult.member.deleted_at !== null &&
    refreshResult.member.deleted_at !== undefined
  )
    TestValidator.equals(
      "member not deleted after refresh",
      refreshResult.member.deleted_at,
      null,
    );
}
