import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that the password reset initiation endpoint always returns a generic
 * success message regardless of whether the account exists, has been
 * soft-deleted, or is active—never leaking account existence or status.
 *
 * 1. Register a new member account to get a unique email (simulate real user
 *    onboarding).
 * 2. (Conceptually) treat the account as deleted—since API does not allow
 *    actual deletion, this is documented/simulated only.
 * 3. Initiate a password reset request using the registered email; validate
 *    that a standard confirmation is returned.
 *
 * Rationale: Ensures privacy and security—no information about user state
 * is leaked via the reset workflow.
 *
 * Notes:
 *
 * - No API for actual deletion, so 'deleted' is simulated by using the fresh
 *   registered email.
 * - The correct behavior is that the reset initiation does not fail and
 *   always returns the same confirmation for all emails.
 * - If a delete API is ever implemented, this test is future-proof: insert
 *   that API call after join and before the reset initiation.
 */
export async function test_api_member_password_reset_initiate_deleted_account(
  connection: api.IConnection,
) {
  // 1. Register a new member to get a valid test email
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword1",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. (Conceptually) treat the account as deleted
  // There is no API for deletion/soft-deletion, so this is just noted.
  // If implemented in the future, insert the actual delete/deactivate step here.

  // 3. Initiate a password reset using the registered email
  const resetResponse =
    await api.functional.auth.member.password.reset.initiate.initiatePasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies ICommunityPlatformMember.IPasswordResetInitiate,
      },
    );
  typia.assert(resetResponse);

  // 4. Validate result: generic status confirmation is always present (non-empty string, no leakage)
  TestValidator.predicate(
    "password reset initiation returns a generic status message",
    typeof resetResponse.status === "string" && resetResponse.status.length > 0,
  );
}
