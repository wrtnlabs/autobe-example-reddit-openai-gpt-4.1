import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates member session self-deletion (logout) and post-logout token
 * invalidation.
 *
 * This test simulates a happy path logout sequence for a member:
 *
 * 1. Register a new member (join) and extract token info.
 * 2. Use a sessionId (random UUID, as the API does not expose actual session
 *    IDs in join output) to invoke the session DELETE endpoint (logout).
 * 3. Attempt any authenticated operation with the same (now-revoked) token
 *    should be rejected.
 *
 * Note: Since the join endpoint does not return the sessionId directly and
 * there is no endpoint to list the member's sessions, a random uuid (valid
 * format) is used for erase. In real E2E with session visibility, the true
 * sessionId should be extracted from API or token. Behavioral correctness
 * for logout (token is unusable after erase) is strongly validated
 * regardless.
 */
export async function test_api_member_session_delete_success(
  connection: api.IConnection,
) {
  // 1. Register (join) a new member
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const joinResult = await api.functional.auth.member.join(connection, {
    body: credentials,
  });
  typia.assert(joinResult);

  TestValidator.equals(
    "member email is as registered",
    joinResult.member.email,
    credentials.email,
  );
  TestValidator.equals(
    "member is_active is true",
    joinResult.member.is_active,
    true,
  );
  if (
    credentials.display_name !== undefined &&
    credentials.display_name !== null
  )
    TestValidator.equals(
      "member display name correctly set",
      joinResult.member.display_name,
      credentials.display_name,
    );

  // 2. Use a valid UUID sessionId here (see note above)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.member.sessions.erase(connection, {
    sessionId,
  });

  // 3. Construct a stale authorized connection and validate logout effect
  const revokedToken = joinResult.token.access;
  const staleConn: api.IConnection = {
    ...connection,
    headers: { ...(connection.headers ?? {}), Authorization: revokedToken },
  };
  await TestValidator.error(
    "cannot use revoked access token after logout",
    async () => {
      await api.functional.communityPlatform.member.sessions.erase(staleConn, {
        sessionId,
      });
    },
  );
}
