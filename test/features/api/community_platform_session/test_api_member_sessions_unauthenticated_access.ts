import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import type { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error response for unauthenticated session index attempt
 *
 * This test verifies that the /communityPlatform/member/sessions endpoint
 * correctly requires authentication. The test procedure is as follows:
 *
 * 1. Register a new member account using POST /auth/member/join, and confirm
 *    successful registration.
 * 2. Prepare a new, unauthenticated connection (without Authorization header).
 * 3. Using the unauthenticated connection, attempt to retrieve current user's
 *    session index via PATCH /communityPlatform/member/sessions, with any
 *    valid/random request body.
 * 4. Expect and verify that the API call fails, throwing an authorization
 *    error.
 * 5. Assert that no session data is leaked and only the error occurrence is
 *    validated.
 */
export async function test_api_member_sessions_unauthenticated_access(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Prepare unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt session index and validate error (should be unauthorized)
  await TestValidator.error(
    "unauthenticated users cannot retrieve member session history",
    async () => {
      await api.functional.communityPlatform.member.sessions.index(
        unauthConnection,
        {
          body: {}, // empty body is valid per IRequest
        },
      );
    },
  );
}
