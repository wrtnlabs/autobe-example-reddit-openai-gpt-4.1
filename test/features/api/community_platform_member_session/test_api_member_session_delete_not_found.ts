import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify error response when a member tries to delete a non-existent
 * session.
 *
 * This test validates that the API does not allow members to delete a
 * session that doesn't exist (using a random UUID) and returns an
 * appropriate not found or already deleted error, satisfying audit and
 * security constraints.
 *
 * Steps:
 *
 * 1. Register a new member via /auth/member/join to obtain authentication.
 * 2. Attempt to delete a session using DELETE
 *    /communityPlatform/member/sessions/{sessionId}, with sessionId set to
 *    a fresh random UUID (almost certainly unused).
 * 3. Validate that the result is an error (not found or already deleted),
 *    confirming the API does not accept deletion of non-existent sessions
 *    and enforces proper security barriers.
 */
export async function test_api_member_session_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register as a new member to establish authentication
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);

  // 2. Attempt delete with a random, likely-nonexistent sessionId
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to delete a non-existent session, returning not found or already deleted error",
    async () => {
      await api.functional.communityPlatform.member.sessions.erase(connection, {
        sessionId: randomSessionId,
      });
    },
  );
}
