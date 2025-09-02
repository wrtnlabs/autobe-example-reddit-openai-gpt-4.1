import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Tests successful admin login process and resulting session and entity.
 *
 * 1. Register a new admin account for the login scenario
 * 2. Clear the Authorization header to ensure a true unauthenticated login
 *    attempt
 * 3. Call /auth/admin/login with valid email/password
 * 4. Assert that JWT access & refresh tokens are correct and non-empty
 * 5. Check that the admin details match those from registration
 * 6. Confirm that login updates last_login_at and that timestamps/permissions
 *    are as expected
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account for login test
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const registerResult = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(registerResult);

  // 2. Simulate unauthenticated connection by clearing Authorization header
  connection.headers ??= {};
  if (connection.headers.Authorization) delete connection.headers.Authorization;

  // 3. Attempt login with valid credentials
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 4. Validate JWT tokens are correctly returned
  TestValidator.predicate(
    "access token should be correctly issued",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token should be correctly issued",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "expired_at is in ISO 8601 string format",
    typeof loginResult.token.expired_at === "string" &&
      loginResult.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "refreshable_until is in ISO 8601 string format",
    typeof loginResult.token.refreshable_until === "string" &&
      loginResult.token.refreshable_until.includes("T"),
  );

  // 5. Validate admin entity details
  TestValidator.equals(
    "admin id should match registration",
    loginResult.admin.id,
    registerResult.admin.id,
  );
  TestValidator.equals(
    "admin email should match registration",
    loginResult.admin.email,
    email,
  );
  TestValidator.equals(
    "admin display_name should match registration",
    loginResult.admin.display_name,
    displayName,
  );
  TestValidator.predicate(
    "loginResult.admin.is_active is true",
    loginResult.admin.is_active === true,
  );
  TestValidator.equals(
    "loginResult.admin.is_super_admin is false by default",
    loginResult.admin.is_super_admin,
    false,
  );

  // 6. Confirm login updates last_login_at and relevant timestamps
  TestValidator.predicate(
    "last_login_at is set to ISO string after login",
    typeof loginResult.admin.last_login_at === "string" &&
      loginResult.admin.last_login_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is at/after created_at (post-login update)",
    new Date(loginResult.admin.updated_at).getTime() >=
      new Date(loginResult.admin.created_at).getTime(),
  );
}
