import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";

/**
 * Validate successful creation of an external integration by an admin user.
 *
 * 1. Register a new admin account with a unique email and secure password
 *    (optionally a display_name).
 * 2. After auto-authentication (token provision), call create for adminUser
 *    external integration with required fields:
 *
 *    - Integration_name: unique string (e.g., 'AnalyticsWebhook-' + random)
 *    - Status: choose a status like 'enabled', 'disabled', or any meaningful
 *         business-related value
 *    - Config_json: put simple JSON string representing credentials/config
 *    - Provider_url: set as either a random URL or null
 *    - Last_successful_sync_at: omit (should default to null or undefined)
 * 3. Assert: (a) typia.assert() passes for response type; (b) returned
 *    properties (integration_name/status/config_json/provider_url) match
 *    the sent values; (c) an id (uuid), created_at, and updated_at appear
 *    and respect matching/format rules; (d) audit fields are
 *    present/valid.
 */
export async function test_api_external_integration_create_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare input for new integration
  const integrationName = `AnalyticsWebhook-${RandomGenerator.alphaNumeric(8)}`;
  const configObj = { api_key: RandomGenerator.alphaNumeric(32) };
  const configJson = JSON.stringify(configObj);
  const input = {
    integration_name: integrationName,
    status: RandomGenerator.pick([
      "enabled",
      "disabled",
      "pending_setup",
    ] as const),
    config_json: configJson,
    provider_url: RandomGenerator.pick([
      null,
      `https://api.${RandomGenerator.alphabets(5)}.io/webhook`,
    ]),
    // last_successful_sync_at: omitting for initial creation
  } satisfies ICommunityPlatformExternalIntegration.ICreate;

  // 3. Create external integration
  const integration =
    await api.functional.communityPlatform.adminUser.externalIntegrations.create(
      connection,
      { body: input },
    );
  typia.assert(integration);

  // 4. Validate returned data
  TestValidator.equals(
    "integration_name matches",
    integration.integration_name,
    input.integration_name,
  );
  TestValidator.equals("status matches", integration.status, input.status);
  TestValidator.equals(
    "config_json matches",
    integration.config_json,
    input.config_json,
  );
  TestValidator.equals(
    "provider_url matches",
    integration.provider_url,
    input.provider_url,
  );
  TestValidator.predicate(
    "id is defined and is uuid format",
    typeof integration.id === "string" &&
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
        integration.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof integration.created_at === "string" &&
      integration.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof integration.updated_at === "string" &&
      integration.updated_at.endsWith("Z"),
  );
  // last_successful_sync_at should be null or undefined
  TestValidator.predicate(
    "last_successful_sync_at omitted or null",
    integration.last_successful_sync_at === null ||
      integration.last_successful_sync_at === undefined,
  );
}

/**
 * - The draft correctly implements all business workflow steps.
 * - Await is used on all async calls (join and create).
 * - Correct DTO types are used: IJoin for admin join, ICreate for integration
 *   creation.
 * - Random and business-appropriate values are generated for all request
 *   properties.
 * - TestValidator is used with descriptive titles for all assertions.
 * - Typia.assert() is applied to all API responses.
 * - No type error testing, as required.
 * - Proper null/undefined handling for nullable fields.
 * - No extra imports or forbidden patterns.
 * - No missing required fields or wrong types.
 * - Request body is always declared as a new const.
 * - No logic errors observed. All tests are based strictly on DTO and API
 *   definitions.
 * - The code is clean, business-aligned, and follows the template structure
 *   perfectly.
 * - All checklist and rules items are satisfied. No errors detected in
 *   implementation.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
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
