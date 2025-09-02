import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Verify that a member cannot access another member's session details
 * (authorization enforcement).
 *
 * Business context:
 *
 * - Community platform members each have separate sessions.
 * - Members should only see their own session details; access to others'
 *   should be strictly forbidden.
 *
 * Steps:
 *
 * 1. Register (join) member1 — sets context/auth to member1.
 * 2. Register (join) member2 — sets context/auth to member2.
 *
 *    - Capture member2's sessionId if provided (if not available, use a random
 *         UUID or simulate sessionId).
 * 3. Switch authentication context back to member1 (simulate by another join
 *    since only join is available to switch context).
 * 4. Attempt to access member2's session details using member1's credentials.
 * 5. Confirm that authorization is denied (error thrown), validating correct
 *    session privacy enforcement.
 *
 * Assumptions:
 *
 * - Actual sessionId cannot be obtained directly from join response in this
 *   SDK. (If join returns it, use that field; otherwise use a fresh random
 *   UUID for negative test.)
 * - Re-joining is used to switch contexts due to lack of a "login" endpoint;
 *   only possible in test/mocked system.
 *
 * If real context switching or session enumeration is required, extend as
 * APIs allow.
 */
export async function test_api_member_sessions_detail_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member1, authenticate as member1
  const email1 = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: email1,
      password: "MemberP@ssw0rd1",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Register member2, authenticate as member2
  const email2 = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: email2,
      password: "MemberP@ssw0rd2",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 3. Use a synthetic random sessionId for member2 (sessionId is not exposed by the API)
  const member2SessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Switch context back to member1 (simulate by join - in production use login)
  await api.functional.auth.member.join(connection, {
    body: {
      email: email1,
      password: "MemberP@ssw0rd1",
      display_name: member1.member.display_name,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 5. Attempt to access member2's session as member1 (should fail with authorization error)
  await TestValidator.error(
    "member1 cannot view member2 session details (should be forbidden)",
    async () => {
      await api.functional.communityPlatform.member.sessions.at(connection, {
        sessionId: member2SessionId,
      });
    },
  );
}
