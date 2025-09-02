import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test retrieving a non-existent guest as an admin to verify privacy and
 * error handling.
 *
 * This function ensures the platform does not leak analytics entity details
 * or sensitive data when an admin retrieves a guestId that doesn't exist.
 * It first registers a new admin, establishes authentication, and then
 * attempts to retrieve a random guestId (UUID format) that should not
 * belong to any real guest record. The function asserts that the platform
 * returns a 404 Not Found error, validating proper business rule
 * enforcement for privacy and security; no guest data structure or residual
 * information is exposed in the error case.
 *
 * Steps:
 *
 * 1. Register a new admin using the /auth/admin/join endpoint (ensures a valid
 *    session).
 * 2. Generate a random guestId (UUID not linked to any existing guest).
 * 3. Attempt to retrieve analytics guest record with this guestId via
 *    /communityPlatform/admin/guests/{guestId}.
 * 4. Assert that a not found (HTTP 404) error occurs and no guest data is
 *    returned.
 */
export async function test_api_admin_guests_retrieve_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate the session.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "autobeTest123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Generate a random UUID that does not correspond to an existing guest
  const randomGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Defensive sanity check: unlikely but let's ensure we're not using the new admin's id
  if (randomGuestId === adminJoin.admin.id) {
    throw new Error("Random guestId should not match admin id");
  }

  // 3. Try retrieving guest analytics entity by non-existent UUID.
  // Assert that a 404 Not Found error is thrown and no guest data is ever leaked.
  await TestValidator.httpError(
    "retrieving a non-existent guest as admin returns 404 not found error and no guest info",
    404,
    async () => {
      await api.functional.communityPlatform.admin.guests.at(connection, {
        guestId: randomGuestId,
      });
    },
  );
}
