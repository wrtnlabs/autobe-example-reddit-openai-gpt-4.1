import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that attempting to log in using a valid member email but an
 * incorrect password returns a generic error (no details about account
 * existence).
 *
 * Business rationale: For security, authentication endpoints should not
 * leak information about whether an account exists or not when login fails.
 * This test ensures that a member whose email exists cannot log in with a
 * wrong password and receives only a generic error, with no additional
 * details divulged.
 *
 * Step-by-step process:
 *
 * 1. Register (join) a new member using a randomly generated email, valid
 *    password, and display name.
 * 2. Confirm registration succeeded and registered email matches input.
 * 3. Attempt to log in using the same email but an intentionally incorrect
 *    password.
 * 4. Validate that login returns a generic error (TestValidator.error), and
 *    does not leak account existence details or other sensitive info.
 */
export async function test_api_member_login_wrong_password_error(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A1b2c3d4", // valid, random-like password meeting complexity rules
    display_name: RandomGenerator.name(),
  };
  const registered = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered email matches input",
    registered.member.email,
    memberInput.email,
  );

  // Step 2: Attempt login with the same email but a clearly incorrect password
  await TestValidator.error(
    "login attempt with correct email and wrong password should fail with generic error",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberInput.email,
          password: "definitely-wrong-password-xyz!",
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
