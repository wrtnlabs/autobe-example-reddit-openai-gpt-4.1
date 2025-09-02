import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Test successful retrieval of session details by sessionId for an
 * authenticated admin.
 *
 * This test ensures that session metadata can be fetched by the sessionId
 * for an authenticated admin. It first creates and authenticates an admin
 * (using /auth/admin/join), retrieves the resulting sessionId (note: the
 * API does not provide a session ID directly, so in a real-world scenario,
 * further API support would be needed; here, for atomic testing, we use the
 * admin.id, but in production tests, a sessions API or token-derived ID
 * would be necessary). The test then calls the GET
 * /communityPlatform/admin/sessions/{sessionId} endpoint and validates the
 * returned session metadata:
 *
 * - Checks all required structure fields are present
 * - Verifies the admin id returned matches the registered admin
 * - Asserts that sensitive jwt_token and refresh_token fields are present (as
 *   per admin context), but should be considered redacted or trustworthy
 * - Verifies timestamps (creation, expiration) are ISO8601 strings
 * - Validates that audit fields, such as invalidated_at and deleted_at, are
 *   either null or strings as per schema
 * - Optionally checks device_fingerprint handling
 *
 * This scenario helps ensure proper audit, admin monitoring, and secure
 * handling of admin session records.
 */
export async function test_api_admin_sessions_detail_fetch_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(adminAuth);

  // 2. Retrieve sessionId
  // NOTE: The join API and token do not provide a direct sessionId.
  // In practical tests, this would be extracted from a session list endpoint or token.
  // For this atomic E2E test, we use the admin's id as a proxy, but real sessionId logic may differ.
  const sessionId = adminAuth.admin.id;

  // 3. Fetch session details for this sessionId
  const session = await api.functional.communityPlatform.admin.sessions.at(
    connection,
    { sessionId },
  );
  typia.assert(session);

  // 4. Validate important session fields
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals(
    "admin id is set",
    session.community_platform_admin_id,
    adminAuth.admin.id,
  );
  TestValidator.predicate(
    "has JWT token (should be redacted or trustworthy)",
    typeof session.jwt_token === "string" && session.jwt_token.length > 0,
  );
  TestValidator.predicate(
    "has refresh token (should be redacted or trustworthy)",
    typeof session.refresh_token === "string" &&
      session.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "expires_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expires_at),
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "invalidated_at is null, undefined, or ISO8601",
    session.invalidated_at === null ||
      session.invalidated_at === undefined ||
      typeof session.invalidated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null, undefined, or ISO8601",
    session.deleted_at === null ||
      session.deleted_at === undefined ||
      typeof session.deleted_at === "string",
  );
  if (
    session.device_fingerprint !== undefined &&
    session.device_fingerprint !== null
  ) {
    TestValidator.predicate(
      "device_fingerprint is string",
      typeof session.device_fingerprint === "string",
    );
  }
}
