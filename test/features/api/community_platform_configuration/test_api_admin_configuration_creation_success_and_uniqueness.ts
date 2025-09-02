import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * E2E test for the admin configuration creation endpoint (unique key
 * constraint enforcement).
 *
 * This test verifies that admin users can create configuration entries with
 * unique keys, and that the platform correctly enforces uniqueness on
 * config keys. The test ensures:
 *
 * 1. A new admin can be registered and authenticated
 * 2. Admins can create new configuration records successfully with a unique
 *    key
 * 3. Attempts to create a config with an existing key result in an error
 *    (uniqueness violation)
 * 4. All expected fields (created_at, updated_at) are set and type constraints
 *    are validated
 *
 * Steps:
 *
 * 1. Register and authenticate an admin
 * 2. Successfully create a configuration record with a random unique key
 * 3. Attempt to create a second configuration with the same key; expect error
 *
 * This test validates both successful creation and business rule
 * enforcement against duplicates.
 */
export async function test_api_admin_configuration_creation_success_and_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register a new admin (obtain authentication context)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "registered admin email matches input",
    adminJoin.admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "registered admin account should be active",
    adminJoin.admin.is_active,
    true,
  );

  // 2. Create a configuration record with a unique key
  const configKey = RandomGenerator.alphaNumeric(16);
  const configValue = RandomGenerator.alphaNumeric(24);
  const configDesc = RandomGenerator.paragraph({ sentences: 3 });
  const createdConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDesc,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches input",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "created config value matches input",
    createdConfig.value,
    configValue,
  );
  TestValidator.equals(
    "created config description matches input",
    createdConfig.description,
    configDesc,
  );
  TestValidator.predicate(
    "created_at should be ISO 8601 date",
    typeof createdConfig.created_at === "string" &&
      /T.*Z$/.test(createdConfig.created_at),
  );
  TestValidator.predicate(
    "updated_at should be ISO 8601 date",
    typeof createdConfig.updated_at === "string" &&
      /T.*Z$/.test(createdConfig.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null after creation",
    createdConfig.deleted_at,
    null,
  );

  // 3. Attempt duplicate creation with same key; expect uniqueness error
  await TestValidator.error("duplicate key creation should fail", async () => {
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: RandomGenerator.alphaNumeric(20),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  });
}
