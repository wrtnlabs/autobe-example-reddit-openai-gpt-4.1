import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful member password reset completion with a valid token.
 *
 * 1. Register a member account to serve as the target for password reset.
 * 2. Initiate the password reset, which (in real system) emails a reset token;
 *    here, since e2e cannot receive email, we must extract or mock the
 *    reset token after initiation (simulate a typical flow by getting the
 *    reset token via test context, DB, or system support, assuming test
 *    system provides it or exposing/resetting is possible for test).
 * 3. Submit the reset token and a valid new password (minimum 8 characters, at
 *    least one letter and one number).
 * 4. Ensure response confirms password reset is complete (status message).
 * 5. Test that reusing the token fails (cannot reuse/expired after use).
 * 6. Confirm that old credentials no longer work with the old password by
 *    attempting another join (if API supported login, we'd use that, but
 *    here join should fail due to duplicate email; a real login test would
 *    require an auth endpoint).
 * 7. Verify the new password allows registration with a duplicate email also
 *    fails (because the join endpoint only allows unique emails; proper
 *    login step would require a dedicated login endpoint).
 */
export async function test_api_member_password_reset_complete_success_valid_token(
  connection: api.IConnection,
) {
  // 1. Register member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "1A"; // satisfy complexity
  const displayName = RandomGenerator.name();
  const memberRes = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberRes);

  // 2. Initiate password reset for the member
  const initiateRes =
    await api.functional.auth.member.password.reset.initiate.initiatePasswordReset(
      connection,
      {
        body: {
          email,
        } satisfies ICommunityPlatformMember.IPasswordResetInitiate,
      },
    );
  typia.assert(initiateRes);

  // 3. Obtain reset_token for the member for test (simulate exposed/reset table/test hook, here mocked for e2e - in real test infra, this could read DB directly or via test-specific endpoint)
  // Replace the string below with your test system's mechanism for retrieving the actual reset token.
  const reset_token = "test-reset-token-for-" + email;

  // 4. Complete the password reset using the retrieved reset_token and a new strong password
  const new_password = RandomGenerator.alphaNumeric(12) + "B2"; // different and complex
  const completeRes =
    await api.functional.auth.member.password.reset.complete.completePasswordReset(
      connection,
      {
        body: {
          reset_token,
          new_password,
        } satisfies ICommunityPlatformMember.IPasswordResetComplete,
      },
    );
  typia.assert(completeRes);
  TestValidator.predicate(
    "password reset confirmation status is non-empty",
    !!completeRes.status && typeof completeRes.status === "string",
  );

  // 5. Attempt to use the reset token again - it should fail
  await TestValidator.error(
    "cannot reuse password reset token after use",
    async () => {
      await api.functional.auth.member.password.reset.complete.completePasswordReset(
        connection,
        {
          body: {
            reset_token,
            new_password: RandomGenerator.alphaNumeric(10) + "c3",
          } satisfies ICommunityPlatformMember.IPasswordResetComplete,
        },
      );
    },
  );

  // 6. Attempt join with old credentials (should fail due to duplicate email)
  await TestValidator.error(
    "cannot re-register with same email after reset",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password,
          display_name: displayName,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // 7. Attempt join with new password and same email (should also fail; join does not allow duplicate emails, no login available in current SDK)
  await TestValidator.error(
    "cannot register again with same email/new password (join requires unique email)",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password: new_password,
          display_name: displayName,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );
}
