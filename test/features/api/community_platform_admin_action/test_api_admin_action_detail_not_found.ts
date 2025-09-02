import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Test that querying a non-existent admin action as an authenticated admin
 * returns a not found error.
 *
 * This test covers the negative scenario for the admin action detail API,
 * ensuring that when a valid admin is authenticated, but the requested
 * admin action ID does not exist, the API returns a proper error (such as
 * HTTP 404 Not Found) and does not leak or fabricate data. This is
 * important for protecting system security and for a correct RESTful API
 * design.
 *
 * Steps:
 *
 * 1. Register (join) a new admin account to acquire authentication credentials
 *    and authorization.
 * 2. Attempt to GET /communityPlatform/admin/adminActions/{adminActionId} with
 *    a random UUID that does not correspond to any existing action record
 *    as that admin.
 * 3. Validate that the API call fails and returns an error, expected to be 404
 *    or equivalent "not found" condition; confirm that no sensitive
 *    information is present in the error, and the failure reason matches
 *    missing data.
 */
export async function test_api_admin_action_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Try fetching details for a non-existent admin action
  await TestValidator.error(
    "should fail with not found when admin action ID does not exist",
    async () => {
      await api.functional.communityPlatform.admin.adminActions.at(connection, {
        adminActionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
