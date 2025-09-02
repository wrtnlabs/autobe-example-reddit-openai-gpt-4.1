import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful new member registration.
 *
 * Validates the end-to-end process of signing up a new platform member via
 * `/auth/member/join`. Ensures that providing a unique, valid email, a
 * password meeting complexity (>=8 chars, with at least one letter and one
 * number), and an optional display name results in:
 *
 * - Creation of a new member record with correct properties (id, email,
 *   is_active, display_name, dates).
 * - Issuance of JWT tokens for authentication (access and refresh).
 * - The activation flag (`is_active`) being set to true and no soft-delete
 *   dates present.
 * - The member data is persisted consistent with business rules.
 *
 * Each response field is validated for correct type, format, and expected
 * semantics. Randomized test data ensures unique/happy path, with
 * registration for both explicit display name and null (Anonymous). Also
 * checks critical conditions such as correct token assignment and date
 * field presence. Error edge cases and registration failure are out of
 * scope for this function.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // ---- Test explicit display_name branch ----
  const registrationExplicit: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password:
      RandomGenerator.alphaNumeric(6) +
      RandomGenerator.alphabets(3) +
      String(Math.floor(Math.random() * 10)), // >=10 chars, at least one letter and number
    display_name: RandomGenerator.name(2),
  };
  const resultExplicit = await api.functional.auth.member.join(connection, {
    body: registrationExplicit,
  });
  typia.assert(resultExplicit);
  const { token: token1, member: member1 } = resultExplicit;
  typia.assert(token1);
  typia.assert(member1);

  // --- Token assertions ---
  TestValidator.predicate(
    "access token is present/string/non-empty",
    typeof token1.access === "string" && token1.access.length > 30,
  );
  TestValidator.predicate(
    "refresh token is present/string/non-empty",
    typeof token1.refresh === "string" && token1.refresh.length > 30,
  );
  TestValidator.predicate(
    "access token expiration is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(token1.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      token1.refreshable_until,
    ),
  );

  // --- Member entity assertions ---
  TestValidator.predicate(
    "member id is a uuid",
    typeof member1.id === "string" && member1.id.length === 36,
  );
  TestValidator.equals(
    "member email matches input",
    member1.email,
    registrationExplicit.email,
  );
  TestValidator.equals("member is active", member1.is_active, true);
  TestValidator.equals(
    "display_name matches input",
    member1.display_name,
    registrationExplicit.display_name,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(member1.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(member1.updated_at),
  );
  TestValidator.equals(
    "no soft-delete date on new member",
    member1.deleted_at,
    null,
  );
  TestValidator.equals(
    "last_login_at not yet assigned",
    member1.last_login_at,
    null,
  );

  // ---- Test display_name null branch (should default to 'Anonymous') ----
  const registrationNull: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password:
      RandomGenerator.alphaNumeric(6) +
      RandomGenerator.alphabets(3) +
      String(Math.floor(Math.random() * 10)),
    display_name: null,
  };
  const resultNull = await api.functional.auth.member.join(connection, {
    body: registrationNull,
  });
  typia.assert(resultNull);
  const { token: token2, member: member2 } = resultNull;

  TestValidator.predicate(
    "access token is present/string/non-empty",
    typeof token2.access === "string" && token2.access.length > 30,
  );
  TestValidator.predicate(
    "refresh token is present/string/non-empty",
    typeof token2.refresh === "string" && token2.refresh.length > 30,
  );
  TestValidator.equals(
    "member email matches input (null branch)",
    member2.email,
    registrationNull.email,
  );
  TestValidator.equals(
    "member is active (null branch)",
    member2.is_active,
    true,
  );
  TestValidator.equals(
    "display_name is null if not set (or server sets to Anonymous)",
    member2.display_name,
    null,
  ); // Platform may fill or leave as null
  TestValidator.equals(
    "no soft-delete date on new member (null branch)",
    member2.deleted_at,
    null,
  );
  TestValidator.equals(
    "last_login_at not yet assigned (null branch)",
    member2.last_login_at,
    null,
  );
}
