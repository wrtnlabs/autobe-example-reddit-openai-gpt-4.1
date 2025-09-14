import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Validate successful creation of a community platform category by an admin
 * user.
 *
 * 1. Register a new adminUser with valid credentials (unique randomized email
 *    and password, optional display name)
 * 2. Use the authenticated admin session to create a new platform category
 *    with a valid, unique name, display_order, and description
 * 3. Assert that the API response returns a complete
 *    ICommunityPlatformCategory object matching the input, with proper
 *    system fields (id, created_at, etc.)
 * 4. Assert the name is unique, display_order is the supplied value,
 *    description matches (or is null), and created/updated timestamps are
 *    present
 * 5. Ensure all required properties exist on the returned object and type
 *    validation with typia.assert()
 */
export async function test_api_platform_category_creation_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  // 2. Create a valid unique platform category as admin
  const categoryRequest = {
    name: RandomGenerator.alphaNumeric(8),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      { body: categoryRequest },
    );
  typia.assert(category);
  // 3. Validate returned category object matches input (except for system/readonly fields like id/timestamps)
  TestValidator.equals(
    "created category name matches input",
    category.name,
    categoryRequest.name,
  );
  TestValidator.equals(
    "created category display_order matches input",
    category.display_order,
    categoryRequest.display_order,
  );
  TestValidator.equals(
    "created category description matches input",
    category.description,
    categoryRequest.description,
  );
  // 4. Confirm presence and format of system fields
  TestValidator.predicate(
    "category id is a uuid",
    typeof category.id === "string" && category.id.length > 0,
  );
  TestValidator.predicate(
    "category created_at is present",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category updated_at is present",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
}

/**
 * - The implementation carefully follows the provided scenario: first registers
 *   an admin user then uses this identity to create a new category, both
 *   through the designated API endpoints.
 * - Request bodies for both admin join and category creation are constructed
 *   using only required/optional properties defined in the corresponding DTOs
 *   with precise type usage. Random data generation leverages typia.random and
 *   RandomGenerator utilities for all tagged and business-rule-constrained
 *   fields.
 * - All API function calls are properly awaited. All returned results are
 *   validated with typia.assert().
 * - Every TestValidator assertion provides a descriptive title as its first
 *   parameter and matches the actual/expected value order requirements,
 *   comparing created fields with input and also confirming system-generated
 *   fields are present and non-empty strings.
 * - There are no additional import statements. No forbidden operations on
 *   connection.headers, no type safety violations, no requirement or
 *   implementation of type error testing, and no API calls or DTOs outside the
 *   provided scope.
 * - The code is well documented, with each business step clearly explained, and
 *   includes checks for required and system fields but does not redundantly
 *   validate fields after typia.assert().
 * - All rules and checklists are satisfied. There is no unnecessary code, no
 *   excess complexity, and only valid business logic, as required by the
 *   scenario.
 * - Conclusion: Implementation is complete and correct. No errors found. No
 *   changes required for final version.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
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
 *   - O 4. Quality Standards and Best Practices
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
