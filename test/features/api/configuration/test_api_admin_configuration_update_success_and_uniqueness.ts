import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test configuration update API for success, uniqueness violation, and
 * not-found errors.
 *
 * Validates the configuration admin update endpoint in multiple scenarios:
 *
 * 1. Admin registration and authentication — obtains a token for subsequent
 *    requests.
 * 2. Creation of two configuration objects as setup (A and B, with distinct
 *    keys/values).
 * 3. Update configuration A with new, unique key, value, and description;
 *    validate that the changes persist.
 * 4. Attempt to update configuration A with configuration B's key to trigger a
 *    uniqueness violation; ensure the API fails appropriately.
 * 5. Attempt to update a configuration that does not exist (random UUID or
 *    soft-deleted); expect a not-found or similar error.
 *
 * All operations are performed under admin authentication, and all error
 * scenarios are verified with TestValidator.error/equals for correctness.
 * Type assertions are made on successful API responses to guarantee data
 * conformity.
 */
export async function test_api_admin_configuration_update_success_and_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register an admin for authentication context.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin-Password123!";
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  TestValidator.equals(
    "registered admin email matches input",
    adminJoinResult.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin is active",
    adminJoinResult.admin.is_active === true,
  );

  // 2. Create two distinct configurations (A and B) as setup.
  const cfgAInput = {
    key: "cfg-test-A-" + RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const cfgBInput = {
    key: "cfg-test-B-" + RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformConfiguration.ICreate;

  const cfgA =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      { body: cfgAInput },
    );
  typia.assert(cfgA);
  TestValidator.equals("cfgA.key matches input", cfgA.key, cfgAInput.key);

  const cfgB =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      { body: cfgBInput },
    );
  typia.assert(cfgB);
  TestValidator.equals("cfgB.key matches input", cfgB.key, cfgBInput.key);

  // 3. Update configuration A with a new unique key, value, and description
  const uniqueUpdatePayload: ICommunityPlatformConfiguration.IUpdate = {
    key: cfgA.key + "-unique",
    value: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedCfgA =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationId: cfgA.id,
        body: uniqueUpdatePayload,
      },
    );
  typia.assert(updatedCfgA);
  TestValidator.equals(
    "cfgA.id unchanged after update",
    updatedCfgA.id,
    cfgA.id,
  );
  TestValidator.equals(
    "cfgA.key updated",
    updatedCfgA.key,
    uniqueUpdatePayload.key,
  );
  TestValidator.equals(
    "cfgA.value updated",
    updatedCfgA.value,
    uniqueUpdatePayload.value,
  );
  TestValidator.equals(
    "cfgA.description updated",
    updatedCfgA.description,
    uniqueUpdatePayload.description,
  );

  // 4. Try to update cfgA to have cfgB's key (should fail due to uniqueness constraint).
  await TestValidator.error(
    "updating config to duplicate another's key should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.update(
        connection,
        {
          configurationId: cfgA.id,
          body: {
            key: cfgB.key,
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // 5. Attempt to update a nonexistent configuration (random UUID)
  await TestValidator.error(
    "updating nonexistent configuration should fail with not found error",
    async () => {
      await api.functional.communityPlatform.admin.configurations.update(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            key: "nonexistent-cfg-key",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    },
  );
}
