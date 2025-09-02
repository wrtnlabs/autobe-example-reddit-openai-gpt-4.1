import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Verify password reset initiation with a non-existent email address by
 * calling the password reset initiation API endpoint with a random email
 * that is extremely unlikely to exist. Confirm that the status response is
 * returned and does not reveal whether the email exists in the platform.
 *
 * Scenario steps:
 *
 * 1. Create a highly unlikely (unique and random) non-existent email address
 *    for the test.
 * 2. Call the password reset initiation endpoint with this fake email.
 * 3. Assert that the response matches the expected response type and that the
 *    status message is present and non-empty.
 * 4. Confirm that the API does not leak any information about whether the
 *    email exists, in compliance with security requirements for password
 *    reset flows.
 */
export async function test_api_member_password_reset_initiate_nonexistent_email(
  connection: api.IConnection,
) {
  // Step 1: Generate a random email address that is extremely unlikely to exist
  const nonExistentEmail: string = `nonexistent_${RandomGenerator.alphaNumeric(24)}@example.com`;
  // This naming ensures that the test email is unique and not associated with any real account.

  // Step 2: Attempt to initiate a password reset for the non-existent email
  const response =
    await api.functional.auth.member.password.reset.initiate.initiatePasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ICommunityPlatformMember.IPasswordResetInitiate,
      },
    );

  // Step 3: Type assertion of the API response
  typia.assert<ICommunityPlatformMember.IPasswordResetInitiateResponse>(
    response,
  );

  // Step 4: Assert the status message is non-empty and present, confirming privacy
  TestValidator.predicate(
    "status field is a non-empty string",
    typeof response.status === "string" && response.status.length > 0,
  );
}
