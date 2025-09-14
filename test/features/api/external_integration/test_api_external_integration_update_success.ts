import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";

/**
 * Update an existing external integration's metadata, status, or configuration
 * as an admin user. First, create an admin user via join, then create an
 * external integration, and finally perform an update by its returned
 * externalIntegrationId. Validate the updated fields and audit timestamps. Test
 * only mutable fields (provider_url, status, config_json) per schema/business
 * logic.
 */
export async function test_api_external_integration_update_success(
  connection: api.IConnection,
) {
  // 1. Register new admin user (establish authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new external integration
  const createBody = {
    integration_name: RandomGenerator.name(2),
    provider_url: `https://api.${RandomGenerator.alphabets(7)}.com`,
    status: "enabled",
    config_json: JSON.stringify({
      client_id: RandomGenerator.alphaNumeric(10),
      secret: RandomGenerator.alphaNumeric(20),
    }),
    last_successful_sync_at: null,
  } satisfies ICommunityPlatformExternalIntegration.ICreate;
  const created: ICommunityPlatformExternalIntegration =
    await api.functional.communityPlatform.adminUser.externalIntegrations.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Prepare update (only mutable fields)
  const updateInput = {
    provider_url: `https://integration.${RandomGenerator.alphabets(8)}.org`,
    status: "disabled",
    config_json: JSON.stringify({
      client_id: RandomGenerator.alphaNumeric(12),
      new_secret: RandomGenerator.alphaNumeric(24),
    }),
  } satisfies ICommunityPlatformExternalIntegration.IUpdate;
  const updated: ICommunityPlatformExternalIntegration =
    await api.functional.communityPlatform.adminUser.externalIntegrations.update(
      connection,
      {
        externalIntegrationId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // Validate that immutable fields did not change
  TestValidator.equals(
    "id remains unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "integration_name remains unchanged after update",
    updated.integration_name,
    created.integration_name,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    created.created_at,
  );
  // Validate updated mutable fields
  TestValidator.equals(
    "provider_url is updated",
    updated.provider_url,
    updateInput.provider_url,
  );
  TestValidator.equals("status is updated", updated.status, updateInput.status);
  TestValidator.equals(
    "config_json is updated",
    updated.config_json,
    updateInput.config_json,
  );
  // Validate updated_at is refreshed (should be greater or equal)
  TestValidator.predicate(
    "updated_at is refreshed to now or later than prior updated_at",
    new Date(updated.updated_at) >= new Date(created.updated_at),
  );
}

/**
 * Code review completed. All required steps from the plan are clearly
 * implemented. Authentication context for admin user is properly established as
 * precondition. External integration is created, mutable fields are updated,
 * and response fields are validated with detailed TestValidator assertions.
 * Validation confirms that only mutable fields change, immutables remain the
 * same, and updated_at advances. No type errors or API usage errors; proper
 * typia.assert used. All await statements present for API calls, and type
 * safety is strictly enforced. Function is ready for production. No prohibited
 * patterns found; function matches all requirements and checklist items.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O EVERY TestValidator call has proper title as first parameter
 *   - O No missing required fields in requests
 *   - O Only correct DTO variant used per operation
 *   - O No type safety violations (`any`, `@ts-ignore`, etc.)
 *   - O No Markdown syntax in function output
 */
const __revise = {};
__revise;
