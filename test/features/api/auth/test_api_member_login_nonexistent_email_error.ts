import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test login failure with a valid but non-existent email.
 *
 * This test covers the negative authentication scenario where a correct
 * email format is used, but the email is not registered as a member. The
 * API must respond with a generic error, giving no indication of whether
 * the account exists or not, thus preventing account enumeration. No test
 * dependencies or pre-setup of test users is needed.
 *
 * 1. Generate a random, valid email address which is not registered.
 * 2. Generate a plausible random password.
 * 3. Attempt to login using the random credentials.
 * 4. Validate that a runtime error is thrown and that no information leak
 *    occurs regarding account existence.
 */
export async function test_api_member_login_nonexistent_email_error(
  connection: api.IConnection,
) {
  // 1. Generate a random, valid email for an unregistered user
  const email = typia.random<string & tags.Format<"email">>();
  // 2. Generate a plausible random password
  const password = RandomGenerator.alphaNumeric(16);

  // 3 & 4. Attempt to login and assert that an error is thrown, revealing no account existence information
  await TestValidator.error(
    "login with non-existent email fails generically",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email,
          password,
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
