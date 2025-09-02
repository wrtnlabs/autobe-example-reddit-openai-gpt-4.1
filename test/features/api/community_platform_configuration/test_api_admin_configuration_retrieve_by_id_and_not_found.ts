import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test retrieval of a specific configuration parameter's details by its
 * unique ID as an admin.
 *
 * This test validates both the successful retrieval of an existing
 * configuration parameter and the error handling when attempting to
 * retrieve a non-existent configuration. The test covers authentication,
 * data creation, positive retrieval, and negative not-found scenario.
 *
 * Steps:
 *
 * 1. Register an admin account to acquire the necessary privileges for
 *    admin-protected endpoints.
 * 2. Create a new configuration parameter and capture its full details from
 *    the response (including ID).
 * 3. Retrieve the configuration parameter by its ID.
 *
 *    - Verify all significant fields (key, value, description, timestamps) are
 *         correctly returned.
 *    - Assert that details match inputs given at creation.
 * 4. Attempt to retrieve a configuration parameter with a non-existent
 *    (random) UUID and assert that an error is thrown (not-found
 *    scenario).
 */
export async function test_api_admin_configuration_retrieve_by_id_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin account for context and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "supersecretpass",
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a configuration parameter
  const createInput = {
    key: RandomGenerator.alphaNumeric(12),
    value: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const config =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      { body: createInput },
    );
  typia.assert(config);

  // 3. Retrieve configuration by ID and check all details
  const fetched =
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationId: config.id,
    });
  typia.assert(fetched);
  TestValidator.equals("configuration.id matches", fetched.id, config.id);
  TestValidator.equals(
    "configuration.key matches",
    fetched.key,
    createInput.key,
  );
  TestValidator.equals(
    "configuration.value matches",
    fetched.value,
    createInput.value,
  );
  TestValidator.equals(
    "configuration.description matches",
    fetched.description,
    createInput.description,
  );

  // Verify essential fields presence and types for auditing and temporal correctness
  TestValidator.predicate(
    "created_at is present",
    typeof fetched.created_at === "string" && !!fetched.created_at,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof fetched.updated_at === "string" && !!fetched.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    fetched.deleted_at,
    null,
  );

  // 4. Attempt retrieval of a non-existent configuration (random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent configuration by id throws error",
    async () => {
      await api.functional.communityPlatform.admin.configurations.at(
        connection,
        {
          configurationId: nonExistentId,
        },
      );
    },
  );
}
