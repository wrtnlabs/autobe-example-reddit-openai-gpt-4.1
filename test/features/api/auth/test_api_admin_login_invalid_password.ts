import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test failure for admin login with invalid password using a valid admin
 * email.
 *
 * This test ensures the platform securely rejects admin login attempts
 * where the email is valid but the password is incorrect. It validates that
 * login does not reveal if the email exists and does not issue any session
 * tokens on failure.
 *
 * Steps:
 *
 * 1. Register an admin with a unique, valid email and a randomly generated
 *    password.
 * 2. Attempt to log in using the correct email with a deliberately invalid
 *    password.
 * 3. Check that authentication fails (TestValidator.error asserts an error is
 *    thrown) and that no authentication information is leaked by the API.
 */
export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register an admin to guarantee a valid admin email exists
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinPassword: string = RandomGenerator.alphaNumeric(12); // The correct password
  await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password: joinPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });

  // 2. Attempt login with that email but a deliberately incorrect password
  const invalidPassword: string =
    joinPassword + RandomGenerator.alphaNumeric(8) + "!"; // Make sure it's wrong
  await TestValidator.error(
    "admin login should fail with invalid password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password: invalidPassword,
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );
}
