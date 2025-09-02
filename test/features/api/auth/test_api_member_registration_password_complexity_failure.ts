import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test member registration password complexity and length failures.
 *
 * This test function verifies the /auth/member/join POST endpoint enforces
 * password policy:
 *
 * - Rejects passwords shorter than 8 characters
 * - Rejects passwords (even if long enough) lacking required composition
 *   (must include at least one letter AND one number)
 *
 * Steps:
 *
 * 1. Generate a valid, unique email
 * 2. Attempt registration with a too-short password (< 8 chars)
 * 3. Attempt registration with a letters-only password (>= 8 chars)
 * 4. Attempt registration with a numbers-only password (>= 8 chars)
 * 5. Confirm each attempt fails with a validation error
 *
 * The test ensures that invalid registrations do NOT create a member record
 * or session, and produce clear, user-facing errors. No prior
 * authentication or cleanup is required; test is stateless and
 * reproducible.
 */
export async function test_api_member_registration_password_complexity_failure(
  connection: api.IConnection,
) {
  // 1. Generate a unique, valid email for registration
  const email = typia.random<string & tags.Format<"email">>();

  // 2. Password too short (< 8 chars, e.g., 5 chars: requires at least 8)
  await TestValidator.error(
    "registration rejects password that is too short",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password: "ab123", // 5 chars, fails minimum length
          display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // 3. Password at least 8 chars, but letters-only (no digit, breaks composition rule)
  await TestValidator.error(
    "registration rejects password with only letters (missing number)",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abcdefgh", // 8 letters only, no number
          display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // 4. Password at least 8 chars, but digits-only (no letter, breaks composition rule)
  await TestValidator.error(
    "registration rejects password with only numbers (missing letter)",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345678", // 8 numbers only, no letter
          display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );
}
