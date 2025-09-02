import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that repeated guest join requests create new, unique sessions
 * and guest identifiers each time.
 *
 * Business context: Platforms permit anonymous, read-only access via guest
 * sessions for analytics. Every call to /auth/guest/join must return a new
 * guest identity, even from the same device, ensuring unique visitor
 * tracking. This preserves analytics integrity and prevents session or
 * token reuse.
 *
 * Test process:
 *
 * 1. Call api.functional.auth.guest.join(...) to request a new guest session.
 * 2. Assert the response matches ICommunityPlatformGuest.IAuthorized and
 *    contains expected fields.
 * 3. Call api.functional.auth.guest.join(...) again from the same session.
 * 4. Assert the second response is also valid and unique (compare
 *    guest_identifier, id, and token).
 * 5. Ensure that both sessions are fully distinct, supporting accurate
 *    analytics and stateless guest tracking.
 */
export async function test_api_guest_identity_redundant_join_creates_new_session(
  connection: api.IConnection,
) {
  // 1. Request first guest session
  const guest1 = await api.functional.auth.guest.join(connection, {
    body: {} satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(guest1);

  // 2. Request second guest session (simulate repeat join from same device/session)
  const guest2 = await api.functional.auth.guest.join(connection, {
    body: {} satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(guest2);

  // 3. Validate uniqueness of guest_identifier, id, and JWT access token
  TestValidator.notEquals(
    "guest identifiers are unique",
    guest1.guest.guest_identifier,
    guest2.guest.guest_identifier,
  );
  TestValidator.notEquals(
    "guest ids are unique",
    guest1.guest.id,
    guest2.guest.id,
  );
  TestValidator.notEquals(
    "JWT tokens are unique",
    guest1.token.access,
    guest2.token.access,
  );
}
