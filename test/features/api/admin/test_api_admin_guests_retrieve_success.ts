import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test successful admin retrieval of a guest analytics record
 *
 * This test validates that an authenticated admin can successfully retrieve
 * detailed analytics information about a specific guest (anonymous session
 * or site visitor) by guest ID. This is a standard workflow for admin audit
 * or analytics purposes.
 *
 * Steps:
 *
 * 1. Register a new admin account using random credentials via POST
 *    /auth/admin/join. The join response includes an auth token and admin
 *    profile.
 * 2. Ensure admin authentication is applied in the connection context (handled
 *    by SDK after join call).
 * 3. Generate a valid guest UUID (simulate a known guest). Call GET
 *    /communityPlatform/admin/guests/{guestId} using that UUID. The
 *    endpoint requires admin authentication.
 * 4. Check the response matches the ICommunityPlatformGuest DTO structure.
 *    Assert:
 *
 *    - The guest.id matches guestId
 *    - Guest_identifier is present and non-empty
 *    - (If present) ip_address and user_agent are non-empty strings or null
 *    - Created_at is valid ISO8601 datetime
 *    - (If present) deleted_at is valid ISO8601 datetime or null
 *    - Response contains only allowed fields
 *
 * This test ensures that admin-level audit/analytics flows are working as
 * intended and that guest analytics records can be cleanly retrieved by
 * system administrators.
 */
export async function test_api_admin_guests_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain Authorization token for admin context
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Optional display_name omitted for minimal flow
  };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. Generate a valid guestId representing an existing guest for analytics look-up
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the guest analytics record as authenticated admin
  const guest: ICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.at(connection, {
      guestId,
    });
  typia.assert(guest);

  // 4. Validate guest fields and contract
  TestValidator.equals(
    "queried guestId matches response id",
    guest.id,
    guestId,
  );
  TestValidator.predicate(
    "guest_identifier is non-empty",
    typeof guest.guest_identifier === "string" &&
      guest.guest_identifier.length > 0,
  );
  if (guest.ip_address !== undefined && guest.ip_address !== null) {
    TestValidator.predicate(
      "ip_address is a non-empty string if present",
      typeof guest.ip_address === "string" && guest.ip_address.length > 0,
    );
  }
  if (guest.user_agent !== undefined && guest.user_agent !== null) {
    TestValidator.predicate(
      "user_agent is a non-empty string if present",
      typeof guest.user_agent === "string" && guest.user_agent.length > 0,
    );
  }
  TestValidator.predicate(
    "created_at is valid ISO8601",
    !isNaN(Date.parse(guest.created_at)),
  );
  if (guest.deleted_at !== undefined && guest.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid ISO8601 if present",
      !isNaN(Date.parse(guest.deleted_at)),
    );
  }
}
