import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful member login (/auth/member/login).
 *
 * This test verifies the full onboarding and authentication flow for
 * standard members:
 *
 * 1. Registers a new member account with valid random credentials
 * 2. Logs in using those credentials
 * 3. Asserts that authentication tokens are returned and usable
 * 4. Validates that the member object is returned without exposing sensitive
 *    fields
 * 5. Checks that last_login_at is present and recent
 *
 * Steps:
 *
 * 1. Register new member (dependency) via /auth/member/join
 * 2. Login with that member's credentials via /auth/member/login
 * 3. Assert JWT tokens are present (access, refresh, expiry fields)
 * 4. Assert member object has correct fields and never exposes password or
 *    hash
 * 5. Confirm last_login_at is updated and non-null
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with unique random credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);

  // Step 2: Perform login with the same credentials
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Verify JWT token structure and values
  const { token, member } = loginResult;
  typia.assert(token);
  TestValidator.predicate(
    "access token is present",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is present and valid",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is present and valid",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // Step 4: Check that member object fields match expectations and no sensitive info is present
  typia.assert(member);
  TestValidator.equals(
    "member email matches joined email",
    member.email,
    email,
  );
  TestValidator.predicate(
    "id is uuid",
    typeof member.id === "string" && /^[0-9a-f\-]{36}$/i.test(member.id),
  );
  TestValidator.predicate(
    "member has created_at",
    typeof member.created_at === "string" && member.created_at.length > 0,
  );
  TestValidator.predicate(
    "member has updated_at",
    typeof member.updated_at === "string" && member.updated_at.length > 0,
  );
  TestValidator.predicate("member is active", member.is_active === true);
  if (
    typeof member.display_name !== "undefined" &&
    member.display_name !== null
  )
    TestValidator.equals(
      "member display_name correct",
      member.display_name,
      displayName,
    );
  // The field deleted_at should be null or undefined in normal case
  TestValidator.equals(
    "deleted_at is null or undefined",
    member.deleted_at,
    null,
  );

  // Step 5: Confirm last_login_at is updated and non-null
  TestValidator.predicate(
    "last_login_at is present and ISO string",
    typeof member.last_login_at === "string" && member.last_login_at.length > 0,
  );

  // Step 6: Enforce that password or hash fields are never exposed anywhere in the result
  // This is crucial for security to prevent credential leakage
  const asJson = JSON.stringify(loginResult);
  TestValidator.predicate(
    "no password leakage in JSON",
    !/password/i.test(asJson),
  );
  TestValidator.predicate("no hash leakage in JSON", !/hash/i.test(asJson));
}
