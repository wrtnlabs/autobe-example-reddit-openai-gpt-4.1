import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Test successful deletion of an admin action (audit log) by its ID.
 *
 * 1. Register an admin user for authentication (acquire admin token).
 * 2. As the authenticated admin, create a new admin action to serve as the
 *    deletion target.
 * 3. Delete the created admin action by its ID.
 * 4. Confirm that the deletion API acknowledges successful removal (no
 *    error/void response).
 * 5. Attempt to delete the same admin action again, expecting an error, to
 *    verify true deletion and non-existence.
 *
 * This scenario demonstrates that admin action records can be hard-deleted
 * by privileged users, and that records once deleted are no longer
 * addressable in the audit trail by ID or duplicate deletion call.
 */
export async function test_api_admin_action_delete_success(
  connection: api.IConnection,
) {
  // 1. Register an admin account (with unique random email)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test1234!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.admin.id;

  // 2. Create an admin action as this admin (for a random entity, using random values)
  const adminAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: adminId,
          action_type: RandomGenerator.alphabets(8),
          target_entity: RandomGenerator.alphabets(10),
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph(),
          result: "success",
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(adminAction);

  // 3. Delete the admin action by its ID
  const eraseResult =
    await api.functional.communityPlatform.admin.adminActions.erase(
      connection,
      {
        adminActionId: adminAction.id,
      },
    );
  // eraseResult is void – deletion should succeed with no exception

  // 4. Attempt a duplicate deletion to verify the record is truly removed
  await TestValidator.error(
    "deleting already deleted admin action should fail",
    async () => {
      await api.functional.communityPlatform.admin.adminActions.erase(
        connection,
        {
          adminActionId: adminAction.id,
        },
      );
    },
  );
}
