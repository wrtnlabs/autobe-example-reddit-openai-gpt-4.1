import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Test successful update of session metadata as a member.
 *
 * This test simulates the workflow of a registered member updating metadata
 * for their own session on the community platform. This scenario covers the
 * straightforward happy-path update, verifying that the intended metadata
 * fields are changed and properly reflected by the API response.
 *
 * Steps:
 *
 * 1. Register a new member using /auth/member/join, creating an authenticated
 *    session for the user. This returns
 *    ICommunityPlatformMember.IAuthorized.
 * 2. (Test context limitation) Since the sessionId is not directly provided by
 *    the API in the join response, a random valid UUID is generated as the
 *    sessionId for demonstration purposes.
 * 3. Create a session update object (ICommunityPlatformSession.IUpdate)
 *    including a new device_fingerprint and a future expires_at timestamp.
 * 4. Call PUT /communityPlatform/member/sessions/{sessionId} with the
 *    authenticated member, passing the update object in the request body.
 * 5. Assert the returned session updates the intended fields. Validate that:
 *
 *    - Device_fingerprint == input
 *    - Expires_at == input
 *    - The session owner member ID is present (in real tests, this would match
 *         the newly registered member's ID)
 *    - API response matches ICommunityPlatformSession structure
 */
export async function test_api_member_session_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new member with random credentials and display name
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2. In real world, sessionId should be acquired from the session context, but here we simulate with a random UUID
  //    (This reflects a test harness/mock limitation; actual linkage is required in real E2E)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update metadata
  const newFingerprint = RandomGenerator.alphaNumeric(32);
  const newExpiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString() as string & tags.Format<"date-time">;
  const updateBody = {
    device_fingerprint: newFingerprint,
    expires_at: newExpiresAt,
  } satisfies ICommunityPlatformSession.IUpdate;

  // 4. Attempt session metadata update as the member
  const updated = await api.functional.communityPlatform.member.sessions.update(
    connection,
    {
      sessionId,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 5. Validate response fields
  TestValidator.equals(
    "device fingerprint should be updated",
    updated.device_fingerprint,
    newFingerprint,
  );
  TestValidator.equals(
    "expires_at should be updated",
    updated.expires_at,
    newExpiresAt,
  );
  TestValidator.predicate(
    "session owner member_id should be present",
    typeof updated.community_platform_member_id === "string" &&
      updated.community_platform_member_id.length > 0,
  );
}
