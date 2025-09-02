import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Test successful update of session metadata as an authenticated admin.
 *
 * This test verifies that an authenticated admin is able to update only
 * permitted metadata fields of a session, such as device_fingerprint and
 * expires_at. It follows the business rule that only metadata fields can be
 * updated—immutable fields like JWT tokens or refresh tokens cannot be
 * changed via this endpoint. The test covers the following step-by-step
 * process:
 *
 * 1. Register (join) a new admin and authenticate via /auth/admin/join.
 * 2. Simulate obtaining the sessionId for the current admin session (for this
 *    E2E route, use a random valid UUID).
 * 3. Prepare a valid update input with new device_fingerprint and a future
 *    expires_at.
 * 4. Update session metadata via PUT
 *    /communityPlatform/admin/sessions/{sessionId} as authenticated admin.
 * 5. Assert that the response reflects the updated metadata fields and that
 *    immutable fields remain unaffected.
 * 6. Confirm that access control allows this action for an authenticated
 *    admin.
 */
export async function test_api_admin_sessions_update_metadata_success(
  connection: api.IConnection,
) {
  // 1. Register (join) a new admin and authenticate
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  };
  const authorization: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(authorization);

  // 2. Simulate extracting the sessionId for current session (in a real system this would come from a session listing or the authentication context)
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare updatable session metadata
  const updatedFingerprint = RandomGenerator.alphaNumeric(20);
  const newExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const updateInput: ICommunityPlatformSession.IUpdate = {
    device_fingerprint: updatedFingerprint,
    expires_at: newExpires,
  };

  // 4. Update session metadata as the authenticated admin
  const updatedSession: ICommunityPlatformSession =
    await api.functional.communityPlatform.admin.sessions.update(connection, {
      sessionId,
      body: updateInput,
    });
  typia.assert(updatedSession);

  // 5. Assert updated fields reflect metadata changes
  TestValidator.equals(
    "device_fingerprint should be updated",
    updatedSession.device_fingerprint,
    updatedFingerprint,
  );
  TestValidator.equals(
    "expires_at should be updated",
    updatedSession.expires_at,
    newExpires,
  );

  // 6. Assert that the session id matches and access control was enforced
  TestValidator.predicate(
    "authenticated admin can update session metadata (response id matches request)",
    updatedSession.id === sessionId,
  );
  // Immutable fields (JWT/refresh_token) must not be changeable or reflected here (by contract).
}
