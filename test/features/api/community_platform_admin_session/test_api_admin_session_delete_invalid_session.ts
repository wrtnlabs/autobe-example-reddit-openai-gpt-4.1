import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate API error handling when attempting to delete a session with a
 * non-existent or already-deleted sessionId by an authenticated admin.
 *
 * This test first registers an admin using the join endpoint to obtain
 * authentication credentials. It then attempts to perform session deletion
 * using a fabricated session UUID (never used to create a real session),
 * expecting the deletion API to return an error (such as not found or
 * invalid session).
 *
 * Steps:
 *
 * 1. Register a new admin using valid credentials.
 * 2. Attempt to delete a session using a random UUID as sessionId that does
 *    not correspond to any actual session.
 * 3. Confirm the API returns an error (e.g. 404 not found or invalid session)
 *    rather than succeeding, indicating proper error handling.
 */
export async function test_api_admin_session_delete_invalid_session(
  connection: api.IConnection,
) {
  // 1. Register admin and set authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Attempt to delete a non-existent session with a random UUID
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent admin session returns error",
    async () => {
      await api.functional.communityPlatform.admin.sessions.erase(connection, {
        sessionId: fakeSessionId,
      });
    },
  );
}
