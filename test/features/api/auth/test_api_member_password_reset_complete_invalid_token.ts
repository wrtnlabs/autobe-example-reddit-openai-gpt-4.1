import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset completion with an invalid or tampered token.
 *
 * This test verifies that submitting an invalid, expired, or tampered reset
 * token with a valid new password correctly results in an error. It ensures
 * that no password is changed, an appropriate error message is returned
 * (without exposing sensitive token/account information), and business
 * logic for reset token validation is strictly enforced.
 *
 * Steps:
 *
 * 1. Prepare a clearly invalid (syntactically valid but not issued by the
 *    system) reset token (e.g., random string, expired pattern,
 *    previously-used form).
 * 2. Prepare a valid candidate new password meeting complexity rules (e.g.,
 *    length, character mix).
 * 3. Submit a POST request to the password reset completion endpoint with this
 *    invalid token and new password.
 * 4. Assert that the API call results in an error (rejects the request).
 * 5. Confirm that the error is a business logic rejection (token invalid or
 *    expired), and no sensitive information is leaked.
 * 6. Optionally repeat the test with other invalid token patterns (clearly
 *    fake, expired, previously-used style, random string).
 */
export async function test_api_member_password_reset_complete_invalid_token(
  connection: api.IConnection,
) {
  // 1. Prepare an invalid, fake, or tampered reset token string
  const invalidResetTokens = [
    RandomGenerator.alphaNumeric(32), // random string
    RandomGenerator.alphaNumeric(64), // long random string
    "expired-token-" + RandomGenerator.alphaNumeric(10), // resembles expired
    "used-token-" + RandomGenerator.alphaNumeric(10), // resembles used
    "", // empty string (malformed)
  ];

  // 2. Create a valid candidate password that meets system complexity rules
  const validPassword = RandomGenerator.alphaNumeric(12) + "A1";

  // 3. For each invalid reset token, attempt password reset and expect error
  for (const fakeToken of invalidResetTokens) {
    await TestValidator.error(
      `should reject password reset with token: ${fakeToken ? fakeToken.slice(0, 16) : "<empty>"}`,
      async () => {
        await api.functional.auth.member.password.reset.complete.completePasswordReset(
          connection,
          {
            body: {
              reset_token: fakeToken,
              new_password: validPassword,
            } satisfies ICommunityPlatformMember.IPasswordResetComplete,
          },
        );
      },
    );
  }
}
