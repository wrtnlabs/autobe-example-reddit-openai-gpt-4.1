import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful admin account registration via POST
 * /auth/admin/join and duplicate prevention.
 *
 * Scenario:
 *
 * 1. Generate a unique random email and a valid password for a new admin
 *    account.
 * 2. Register the admin via api.functional.auth.admin.join with the email,
 *    password, and an optional display_name.
 * 3. Validate the response contains valid JWT tokens, and the returned admin
 *    entity satisfies audit requirements:
 *
 *    - Is_active is true
 *    - Is_super_admin is false on registration
 *    - Email matches the input
 *    - Display_name is correctly set (if provided)
 *    - Timestamps exist and are formatted correctly
 * 4. Immediately use the token from step 3 to confirm the connection is
 *    authenticated (connection.headers.Authorization is set).
 * 5. Attempt to register another admin with the same email; expect
 *    registration to fail (TestValidator.error).
 */
export async function test_api_admin_account_join_success(
  connection: api.IConnection,
) {
  // 1. Generate unique email and valid password
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16); // sufficiently complex
  const displayName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });

  // 2. Register the admin
  const result: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(result);
  typia.assert<ICommunityPlatformAdmin.IAuthorized>(result);

  // 3. Validate audit and business fields
  const admin = result.admin;
  typia.assert<typeof admin>(admin);
  TestValidator.equals("email matches input", admin.email, email);
  TestValidator.equals(
    "display name matches input",
    admin.display_name,
    displayName,
  );
  TestValidator.equals("admin is active", admin.is_active, true);
  TestValidator.equals(
    "admin is_super_admin is false by default",
    admin.is_super_admin,
    false,
  );
  // id is checked by typia.assert already (uuid). But also check nonempty for clarity
  TestValidator.predicate(
    "admin id is non-empty string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "created_at has date-time format",
    typeof admin.created_at === "string" && admin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at has date-time format",
    typeof admin.updated_at === "string" && admin.updated_at.length > 0,
  );
  TestValidator.equals(
    "last_login_at is null on registration",
    admin.last_login_at,
    null,
  );

  // Validate token fields
  const token = result.token;
  typia.assert<typeof token>(token);
  TestValidator.predicate(
    "access token returned",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token returned",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at has date-time format",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until has date-time format",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 4. Check the connection is authenticated
  TestValidator.equals(
    "connection Authorization header set",
    connection.headers?.Authorization,
    token.access,
  );

  // 5. Attempt duplicate registration (should fail)
  await TestValidator.error("duplicate registration should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  });
}
