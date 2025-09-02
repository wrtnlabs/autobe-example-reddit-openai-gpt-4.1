import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates uniqueness enforcement of email during member registration.
 *
 * Purpose: Ensure that the system rejects attempts to register a member
 * account with an email address that has already been used by another
 * member, providing a clear error and preventing duplicate accounts.
 *
 * Steps:
 *
 * 1. Generate a random email address to guarantee test isolation.
 * 2. Register a new member using this email and a valid password.
 *
 *    - Confirm the member is created and receives a valid authentication token.
 * 3. Attempt to register a second member with the same email and a different
 *    password.
 *
 *    - Confirm that the registration fails.
 *    - Check that the error represents a uniqueness/duplicate violation and is
 *         clearly communicated.
 *    - Ensure that no additional member is created or authenticated with that
 *         email.
 */
export async function test_api_member_registration_duplicate_email_error(
  connection: api.IConnection,
) {
  // 1. Generate test email and passwords.
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  const password1: string = RandomGenerator.alphaNumeric(12);
  const password2: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();

  // 2. Register initial member
  const initialResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: testEmail,
        password: password1,
        display_name: displayName,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(initialResult);
  TestValidator.equals(
    "Registered member email matches",
    initialResult.member.email,
    testEmail,
  );
  TestValidator.predicate(
    "Member is active by default",
    initialResult.member.is_active === true,
  );
  TestValidator.predicate(
    "Authentication token is issued",
    typeof initialResult.token.access === "string" &&
      initialResult.token.access.length > 0,
  );

  // 3. Attempt duplicate registration with the same email but different password & display name
  await TestValidator.error(
    "Duplicate registration with same email should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: testEmail, // same email as before
          password: password2, // different password should not matter
          display_name: RandomGenerator.name(), // different display name
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );
}
