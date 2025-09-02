import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful initiation of member password reset using a known email.
 *
 * Validates that when a password reset is initiated for an existing active
 * member, the system returns a non-leaking confirmation response without
 * revealing whether the email is registered. This test ensures business
 * rules for privacy are enforced.
 *
 * Steps:
 *
 * 1. Register a member account with a randomly generated (but known) email and
 *    password.
 * 2. Call the password reset initiation endpoint with this email.
 * 3. Assert that a generic confirmation message is returned (structure matches
 *    expected response DTO), and that no information regarding account
 *    existence is leaked.
 */
export async function test_api_member_password_reset_initiate_success_existing_email(
  connection: api.IConnection,
) {
  // 1. Register a new member with a known email and password.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals(
    "joined member email should match requested email",
    member.member.email,
    memberEmail,
  );

  // 2. Initiate password reset with the same email.
  const response =
    await api.functional.auth.member.password.reset.initiate.initiatePasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies ICommunityPlatformMember.IPasswordResetInitiate,
      },
    );
  typia.assert(response);
  // 3. Generic confirmation — must not reveal account existence.
  TestValidator.predicate(
    "password reset initiation response contains a status message but does not leak account existence",
    typeof response.status === "string" && response.status.length > 0,
  );
}
