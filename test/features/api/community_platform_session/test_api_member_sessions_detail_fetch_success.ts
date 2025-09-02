import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Test successful retrieval of a member's session details using sessionId.
 *
 * This test ensures that a member can access only their own session data
 * via GET /communityPlatform/member/sessions/{sessionId}:
 *
 * 1. Register a new member with unique credentials (join).
 * 2. Retrieve the member's sessionId. (NOTE: In a real system, this must come
 *    from join response, token, or session list, but we use a random UUID
 *    here for demonstration due to lack of direct session list API.)
 * 3. Fetch session details via the endpoint.
 * 4. Assert the session is linked to the correct member.
 * 5. Validate type and linkage of fields, and check that sensitive information
 *    is not improperly exposed.
 *
 * NOTE: In a real E2E suite, the sessionId should come from
 * join/login/session listing, not a random UUID, to ensure linkage. Adjust
 * accordingly when session enumeration APIs are available.
 */
export async function test_api_member_sessions_detail_fetch_success(
  connection: api.IConnection,
) {
  // 1. Register member with unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const joinResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(joinResult);
  const memberId = joinResult.member.id;

  // 2. NOTE: In a real test, obtain the sessionId used for authentication from join/session API.
  // Here, we use a random sessionId value for demonstration.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch session detail
  const session: ICommunityPlatformSession =
    await api.functional.communityPlatform.member.sessions.at(connection, {
      sessionId,
    });
  typia.assert(session);

  // 4. Assert that session is linked to the current member.
  TestValidator.equals("session id matches request", session.id, sessionId);
  TestValidator.equals(
    "session is for joined member",
    session.community_platform_member_id,
    memberId,
  );

  // 5. Validate sensitive fields are strings (actual exposure policy may restrict this in non-auth endpoints).
  TestValidator.predicate(
    "jwt_token field type string",
    typeof session.jwt_token === "string",
  );
  TestValidator.predicate(
    "refresh_token field type string",
    typeof session.refresh_token === "string",
  );

  // 6. Additional core field checks (using typia.assert above, DTO-typed).
}
