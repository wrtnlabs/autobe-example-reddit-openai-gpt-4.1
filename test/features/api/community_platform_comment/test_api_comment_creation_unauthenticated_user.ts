import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Ensure unauthenticated users are forbidden from creating comments (POST
 * /communityPlatform/member/comments).
 *
 * This test simulates a guest (no authentication token present) attempting
 * to submit a valid comment creation request body. The API is expected to
 * enforce member-only access rules and refuse the operation with an
 * appropriate error.
 *
 * Steps:
 *
 * 1. Prepare a connection object that does NOT include any Authorization
 *    header (guest context).
 * 2. Generate structurally valid comment creation data using
 *    typia.random<ICommunityPlatformComment.ICreate>().
 * 3. Attempt to call api.functional.communityPlatform.member.comments.create
 *    and assert that it throws an error due to missing authentication.
 * 4. Validate with TestValidator.error using a strong title and correct
 *    async/await error assertion conventions.
 */
export async function test_api_comment_creation_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (remove Authorization header if present)
  const guestConn: api.IConnection = { ...connection, headers: {} };

  // 2. Build a plausible comment creation body
  const input = typia.random<ICommunityPlatformComment.ICreate>();

  // 3. Assert that API call as a guest fails with an authentication/authorization error.
  await TestValidator.error(
    "unauthenticated users cannot create comments (should throw error)",
    async () => {
      await api.functional.communityPlatform.member.comments.create(guestConn, {
        body: input,
      });
    },
  );
}
