import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";

/**
 * Validate error response when admin requests a non-existent post snapshot
 * detail.
 *
 * This test ensures that the system returns a 404 (not found) error when an
 * authorized admin tries to retrieve a snapshot for a post/snapshot
 * combination that does not exist.
 *
 * Steps:
 *
 * 1. Register a new admin account (using random but valid credentials).
 * 2. As the registered admin, attempt to GET a snapshot detail using two
 *    random UUIDs as the postId and snapshotId, which are guaranteed not to
 *    correspond to any real snapshot (since no posts or snapshots exist for
 *    these ids).
 * 3. Assert that the API responds with an HTTP 404 error, proving correct
 *    negative case handling.
 */
export async function test_api_post_snapshot_admin_get_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register as admin (establish authentication context for admin-only API)
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);

  // 2. Attempt to access a snapshot detail with random (unassigned) postId and snapshotId
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assert that the API responds with the correct not found error (404)
  await TestValidator.httpError(
    "admin receives 404 when requesting detail of a non-existent post snapshot",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.snapshots.at(
        connection,
        {
          postId: randomPostId,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
}
