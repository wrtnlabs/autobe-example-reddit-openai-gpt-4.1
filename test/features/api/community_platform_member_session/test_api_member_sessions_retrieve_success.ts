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
 * Test retrieval of a member's own login sessions on the community
 * platform.
 *
 * This test verifies that a newly registered member can retrieve a
 * paginated list of their active and historical sessions through the member
 * session list endpoint. It also checks that:
 *
 * - Only the sessions for the authenticated member are shown
 * - Key session properties conform to the schema (device, timestamps, etc.)
 * - Pagination fields are included
 *
 * Steps:
 *
 * 1. Register a new member account using /auth/member/join, which provides an
 *    authenticated session automatically.
 * 2. Retrieve the member's session list using PATCH
 *    /communityPlatform/member/sessions (with a minimal/default request
 *    object)
 * 3. Assert the returned session list is non-empty, all sessions are for the
 *    authenticated member, and schema fields are present.
 */
export async function test_api_member_sessions_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123!";
  const displayName = RandomGenerator.name();
  const joinResp = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResp);

  // 2. Retrieve member's session list (no filter; just self)
  const sessionPage =
    await api.functional.communityPlatform.member.sessions.index(connection, {
      body: {} satisfies ICommunityPlatformSession.IRequest,
    });
  typia.assert(sessionPage);

  // 3. Validate sessions returned only for the member and schema fields are present
  const memberId = joinResp.member.id;
  // List must be non-empty (at least the joined session)
  TestValidator.predicate(
    "session list must be non-empty",
    sessionPage.data.length > 0,
  );
  for (const session of sessionPage.data) {
    typia.assert<ICommunityPlatformSession>(session);
    TestValidator.equals(
      "session belongs to the authenticated member",
      session.community_platform_member_id,
      memberId,
    );
    // Check creation time field exists
    TestValidator.predicate(
      "session.created_at must be present",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    // Device can be null or string
    TestValidator.predicate(
      "session.device_fingerprint present or null",
      typeof session.device_fingerprint === "string" ||
        session.device_fingerprint === null ||
        session.device_fingerprint === undefined,
    );
    // Expiry timestamp
    TestValidator.predicate(
      "session.expires_at must be string",
      typeof session.expires_at === "string" && session.expires_at.length > 0,
    );
  }

  // 4. Validate pagination metadata present and reasonable
  TestValidator.predicate(
    "pagination info exists",
    typeof sessionPage.pagination === "object" &&
      sessionPage.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page valid",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    sessionPage.pagination.records >= 1,
  );
}
