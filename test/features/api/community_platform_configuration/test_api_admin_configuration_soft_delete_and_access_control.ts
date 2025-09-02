import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test admin soft-deletion of configuration parameters and validation of
 * access control
 *
 * 1. Register an admin user and authenticate
 * 2. Create a configuration parameter (to serve as the soft-deletion target)
 * 3. Soft-delete the configuration as admin (should succeed and set
 *    deleted_at)
 * 4. Attempt to soft-delete the configuration a second time (should yield
 *    not-found error)
 * 5. Attempt to delete a random/nonexistent configuration (should yield
 *    not-found error)
 * 6. Attempt to delete as unauthenticated/non-admin (should get
 *    unauthorized/forbidden)
 *
 *    - Remove Authorization header and reattempt deletion
 *
 * Validation covers both soft-deletion business rules and API-level access
 * control.
 */
export async function test_api_admin_configuration_soft_delete_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create configuration parameter
  const config =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphaNumeric(8),
          value: RandomGenerator.alphaNumeric(16),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(config);

  // 3. Soft-delete as admin
  await api.functional.communityPlatform.admin.configurations.erase(
    connection,
    {
      configurationId: config.id,
    },
  );
  // (Assume API sets deleted_at; actual fetch/confirmation would require a GET endpoint we do not have.)

  // 4. Try to delete again — should fail with Not-Found (404)
  await TestValidator.httpError(
    "deleting an already-deleted configuration yields not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        connection,
        {
          configurationId: config.id,
        },
      );
    },
  );

  // 5. Try to delete a random (nonexistent) configuration
  await TestValidator.httpError(
    "deleting a random configuration (nonexistent uuid) yields not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt as unauthenticated (non-admin) user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "non-admin (unauthenticated) cannot delete configuration",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        unauthConn,
        {
          configurationId: config.id,
        },
      );
    },
  );
}
