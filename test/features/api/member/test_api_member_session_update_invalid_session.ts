import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Validate that updating a non-existent member session results in an error.
 *
 * This test ensures the API rejects update requests targeting sessions that
 * do not exist. The typical client-side business flow is as follows:
 *
 * 1. Register a new member (POST /auth/member/join) to establish an
 *    authenticated session.
 * 2. Attempt to update a member session (PUT
 *    /communityPlatform/member/sessions/{sessionId}) using a random,
 *    non-existent sessionId.
 * 3. Confirm that the API responds with an error indicating that the session
 *    cannot be found or updated.
 *
 * Steps:
 *
 * 1. Register a new member using POST /auth/member/join with random valid
 *    credentials.
 * 2. Create a random sessionId (UUID) that is not associated with any existing
 *    session.
 * 3. Attempt to invoke PUT /communityPlatform/member/sessions/{sessionId} with
 *    the random ID, providing a generic valid session update body.
 * 4. Assert that an error is thrown (using TestValidator.error) and no success
 *    response is returned.
 */
export async function test_api_member_session_update_invalid_session(
  connection: api.IConnection,
) {
  // 1. Register a new member to obtain an authentication token
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(
      RandomGenerator.pick([1, 2, 3] as const),
    ),
  } satisfies ICommunityPlatformMember.ICreate;
  const authResult = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(authResult);

  // 2. Generate a random, non-existent sessionId (UUID format)
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid update body (values don't matter since session doesn't exist)
  const updateBody = {
    device_fingerprint: RandomGenerator.alphaNumeric(16),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
    invalidated_at: null,
    deleted_at: null,
  } satisfies ICommunityPlatformSession.IUpdate;

  // 4. Attempt to update a session using the random sessionId; expect error
  await TestValidator.error(
    "Updating a non-existent member session must result in an error",
    async () => {
      await api.functional.communityPlatform.member.sessions.update(
        connection,
        {
          sessionId: randomSessionId,
          body: updateBody,
        },
      );
    },
  );
}
