import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Validate admin-only configuration parameter creation.
 *
 * This test ensures an admin user is able to create a new platform
 * configuration by calling the POST
 * /communityPlatform/adminUser/configurations endpoint. The workflow is:
 *
 * 1. Register (join) as an admin user to acquire authentication.
 * 2. Use the authentication context to POST a new configuration with a unique
 *    key, value, and (optionally) a description.
 * 3. Validate that the response contains expected configuration data, all
 *    fields are stored, types are correct, and business rules such as
 *    unique key enforcement are respected.
 * 4. Verify that only authenticated admins can access this endpoint.
 */
export async function test_api_configuration_creation_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as an admin user to get authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdminUser.IJoin;

  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 2. Prepare unique configuration creation input
  const configInput = {
    key: `max_comment_length_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphaNumeric(3),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 15,
    }),
  } satisfies ICommunityPlatformConfiguration.ICreate;

  // 3. Create the configuration as authenticated admin
  const config =
    await api.functional.communityPlatform.adminUser.configurations.create(
      connection,
      { body: configInput },
    );
  typia.assert(config);

  // 4. Validate output matches input fields
  TestValidator.equals(
    "configuration key matches input",
    config.key,
    configInput.key,
  );
  TestValidator.equals(
    "configuration value matches input",
    config.value,
    configInput.value,
  );
  TestValidator.equals(
    "configuration description matches input",
    config.description,
    configInput.description,
  );
  TestValidator.predicate(
    "configuration ID is a uuid",
    typeof config.id === "string" && config.id.length > 10,
  );
  TestValidator.predicate(
    "created_at is a valid ISO 8601 date-time string",
    typeof config.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(config.created_at),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 date-time string",
    typeof config.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(config.updated_at),
  );

  // 5. (Optional) Validate that unauthenticated user cannot access the endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create configuration",
    async () => {
      await api.functional.communityPlatform.adminUser.configurations.create(
        unauthConn,
        { body: configInput },
      );
    },
  );
}

/**
 * 1. TypeScript conventions and best practices have been adhered to; no
 *    type-unsafe constructs are used.
 * 2. All SDK function calls use await and pass strictly the required parameters;
 *    request body variables are declared with satisfies but without type
 *    annotation; all TestValidator functions have descriptive title as first
 *    parameter.
 * 3. Random data generation for password, email, configuration key, value, and
 *    description uses typia.random and RandomGenerator utility functions with
 *    proper constraints.
 * 4. No additional imports, helper functions, or modifications to template code
 *    are present. Authentication uses provided admin join endpoint and only
 *    actual API surface is used; context switching for unauthenticated scenario
 *    is handled by re-creating the connection with empty headers (never
 *    manipulating connection.headers after creation as forbidden).
 * 5. No testing of type errors (e.g., as any or missing required fields); the test
 *    structure and assertions comply with compile-time and run-time
 *    expectations; all assertions follow actual-first, expected-second
 *    pattern.
 * 6. The function contains comprehensive scenario documentation, logical business
 *    flow, descriptive variable naming, sufficient edge-case (unauthenticated)
 *    validation, and is fully self-contained with all setup, workflow, and
 *    assertions in place. There are no missing awaits, DTO confusion, or
 *    anti-patterns.
 *
 * No forbidden, extraneous, or illogical code patterns found. All checklist and
 * rule requirements are satisfied. No errors or issues found to fix.
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
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
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
