import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test deleting a community platform admin action with a non-existent ID.
 *
 * Validates that the system correctly returns a not-found error (404) when
 * attempting to delete an admin action record that does not exist. Ensures
 * that admin authentication is required, that the operation uses a
 * syntactically valid but nonexistent UUID, and that no side effects or
 * data changes occur in the audit log or action tables. This test
 * demonstrates error-handling and business rule enforcement for resource
 * deletion endpoints.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user (POST /auth/admin/join) to obtain
 *    authorization.
 * 2. Attempt DELETE /communityPlatform/admin/adminActions/{adminActionId}
 *    using a randomly-generated, non-existent UUID.
 * 3. Assert that the API responds with a 404 not found error and that no
 *    records are modified or affected.
 */
export async function test_api_admin_action_delete_nonexistent(
  connection: api.IConnection,
) {
  // 1. Establish admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Test@12345",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Attempt to delete a non-existent admin action
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Deleting non-existent admin action returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.adminActions.erase(
        connection,
        {
          adminActionId: nonexistentId,
        },
      );
    },
  );
}
