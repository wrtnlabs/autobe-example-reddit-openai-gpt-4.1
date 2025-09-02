import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the creation of a guest identity and JWT issuance for
 * unauthenticated users.
 *
 * This test ensures that a non-authenticated user can join as a guest using
 * the /auth/guest/join endpoint. It verifies the following:
 *
 * - No authentication tokens or prior setup required.
 * - The backend generates a unique guest_identifier and persists the guest
 *   session.
 * - The response returns an ICommunityPlatformGuest.IAuthorized object with a
 *   JWT access/refresh token and guest identity info.
 * - The returned token grants only read-only permissions (business
 *   requirement).
 * - All key fields are present and correctly formatted: id (uuid),
 *   guest_identifier (string), created_at (date-time), etc.
 * - Guest object should NOT contain any personal PII or privileged fields.
 *
 * Steps:
 *
 * 1. Call the join API with an empty body.
 * 2. Validate that the returned structure exactly matches
 *    ICommunityPlatformGuest.IAuthorized (token + guest info).
 * 3. Assert the guest and token fields: check uuid, guest_identifier (not
 *    empty), issued-at timestamp, etc.
 * 4. Assert that no authentication header or prior state was required to call
 *    the endpoint.
 * 5. Optionally, validate that subsequent access as guest (with token) only
 *    allows read/view permissions (not implemented here if not supported).
 */
export async function test_api_guest_identity_creation_and_jwt_issuance(
  connection: api.IConnection,
) {
  // 1. Call the guest join API with empty body
  const output = await api.functional.auth.guest.join(connection, {
    body: {} satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(output);

  // 2. Validate the structure and types of the response
  // Output includes: { token: { access, refresh, expired_at, refreshable_until }, guest: {...} }
  TestValidator.predicate(
    "token.access is a non-empty JWT",
    typeof output.token.access === "string" && output.token.access.length > 32,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty refresh JWT",
    typeof output.token.refresh === "string" &&
      output.token.refresh.length > 32,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output.token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output.token.refreshable_until),
  );
  TestValidator.predicate(
    "guest.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      output.guest.id,
    ),
  );
  TestValidator.predicate(
    "guest_identifier is not empty",
    typeof output.guest.guest_identifier === "string" &&
      output.guest.guest_identifier.length > 6,
  );
  TestValidator.predicate(
    "guest.created_at is ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output.guest.created_at),
  );
  TestValidator.predicate(
    "guest deleted_at is null or undefined",
    output.guest.deleted_at === null || output.guest.deleted_at === undefined,
  );
  TestValidator.predicate(
    "guest has no personal PII",
    output.guest.ip_address === null || output.guest.ip_address === undefined,
  );
  TestValidator.predicate(
    "guest has no user agent info",
    output.guest.user_agent === null || output.guest.user_agent === undefined,
  );
}
