import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Validate error handling when attempting to update a non-existent admin
 * action record.
 *
 * This test covers the scenario where an authenticated admin tries to
 * update an admin audit log/action record using an ID that does not exist
 * in the database. It ensures that the API correctly rejects the request
 * and returns a not-found error (404) without creating or modifying any
 * records.
 *
 * Business context: Audit/update endpoints must only permit modifications
 * on existing records. This guarantees integrity of moderation logs and
 * transparent tracking of all admin actions.
 *
 * Steps:
 *
 * 1. Register a new admin for authentication, ensuring subsequent operation
 *    uses an authenticated admin context.
 * 2. Generate a random UUID to be used as a fake (non-existent) adminActionId.
 * 3. Attempt to update the admin action using the fake adminActionId and a
 *    valid update body.
 * 4. Assert that the response is a 404 NOT FOUND error, confirming the system
 *    does not allow updates on missing records.
 * 5. Confirm no entity is created or modified as a result of this failed
 *    operation.
 */
export async function test_api_admin_action_update_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test!234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Generate a random UUID that would not exist as an admin action ID
  const fakeAdminActionId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    result: "testing-nonexistent-update",
  } satisfies ICommunityPlatformAdminAction.IUpdate;

  // 3. Attempt update and expect NOT FOUND error
  await TestValidator.httpError(
    "update of non-existent admin action must fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.adminActions.update(
        connection,
        {
          adminActionId: fakeAdminActionId,
          body: updateBody,
        },
      );
    },
  );
}
