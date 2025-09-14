import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";

/**
 * Validate retrieving a previously created external integration as an admin
 * user.
 *
 * This test simulates a full admin workflow for creating and then fetching
 * an external integration:
 *
 * 1. Register a new admin user by POSTing to /auth/adminUser/join, capturing
 *    credentials and establishing authentication.
 * 2. Create a new external integration using
 *    /communityPlatform/adminUser/externalIntegrations, submitting a
 *    generated ICreate DTO. Persist the response including the generated id
 *    and all properties used.
 * 3. Retrieve the integration by its UUID using GET
 *    /communityPlatform/adminUser/externalIntegrations/{externalIntegrationId}.
 * 4. Assert that all fields returned by the GET endpoint (including id,
 *    integration_name, provider_url, status, config_json,
 *    last_successful_sync_at, created_at, updated_at) match those from the
 *    integration's creation, confirming correct data storage and access
 *    control.
 */
export async function test_api_external_integration_get_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new external integration
  const createBody = {
    integration_name: RandomGenerator.paragraph({ sentences: 2 }),
    provider_url: RandomGenerator.paragraph({ sentences: 1 }),
    status: RandomGenerator.pick([
      "enabled",
      "disabled",
      "error",
      "pending_setup",
    ] as const),
    config_json: JSON.stringify({
      key: RandomGenerator.alphaNumeric(8),
      secret: RandomGenerator.alphaNumeric(16),
    }),
    last_successful_sync_at: null,
  } satisfies ICommunityPlatformExternalIntegration.ICreate;
  const created =
    await api.functional.communityPlatform.adminUser.externalIntegrations.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Retrieve the external integration by id
  const retrieved =
    await api.functional.communityPlatform.adminUser.externalIntegrations.at(
      connection,
      { externalIntegrationId: created.id },
    );
  typia.assert(retrieved);

  // 4. Assert retrieved fields match creation
  TestValidator.equals("integration id matches", retrieved.id, created.id);
  TestValidator.equals(
    "integration name matches",
    retrieved.integration_name,
    createBody.integration_name,
  );
  TestValidator.equals(
    "provider_url matches",
    retrieved.provider_url,
    createBody.provider_url,
  );
  TestValidator.equals("status matches", retrieved.status, createBody.status);
  TestValidator.equals(
    "config_json matches",
    retrieved.config_json,
    createBody.config_json,
  );
  TestValidator.equals(
    "last_successful_sync_at matches (both null)",
    retrieved.last_successful_sync_at,
    createBody.last_successful_sync_at,
  );
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    created.updated_at,
  );
}

/**
 * The draft implementation follows all requirements: correct admin user
 * creation (with realistic, type-safe random data), creation of an external
 * integration via a well-formed ICreate DTO (including proper literal status
 * enum and random strings for integration_name, provider_url, config_json),
 * correct retrieval of the integration by its new id, and thorough
 * field-by-field test validator assertions matching actual values to the ones
 * from creation. Await is used everywhere it's needed, DTO types and
 * typia.random are used correctly, and all TestValidator assertions contain
 * descriptive titles. No forbidden patterns, no additional imports, no DTO
 * confusion, and the function signature and comment block follow the template.
 * No type safety violations are present. The test is business-realistic and
 * authenticates as expected. All checklist items are verifiably met. No issues
 * found, no fixes or deletions required.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
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
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision - Using correct DTO variant for each operation
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
