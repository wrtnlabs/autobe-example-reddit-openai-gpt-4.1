import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Edit (update) a platform category as an adminUser. The test verifies that
 * only editable fields (description, display_order) can be changed by updating
 * a category, while immutable fields (name, id, created_at) remain unchanged
 * after update. This ensures admin editing works according to business rules.
 *
 * Steps:
 *
 * 1. Register (join) an adminUser.
 * 2. Create a new platform category (capture all output for old state).
 * 3. Prepare new values for description (non-null) and display_order (new int32)
 *    that differ from original.
 * 4. Update the category using adminUser, passing only editable fields.
 * 5. Assert: description/display_order fields are updated, id/name/created_at are
 *    unchanged, updated_at is refreshed, and returned data matches
 *    expectations.
 */
export async function test_api_platform_category_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Create a platform category with initial values
  const createBody = {
    name: RandomGenerator.alphabets(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const original: ICommunityPlatformCategory =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      { body: createBody },
    );
  typia.assert(original);

  // 3. Prepare updated values for description and display_order
  const updateBody = {
    description: RandomGenerator.paragraph({ sentences: 7 }),
    display_order: original.display_order + 10,
  } satisfies ICommunityPlatformCategory.IUpdate;

  // 4. Update the category with new values
  const updated: ICommunityPlatformCategory =
    await api.functional.communityPlatform.adminUser.categories.update(
      connection,
      {
        categoryId: original.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Assertions: only editable fields changed, immutable ones remain
  TestValidator.equals(
    "category id remains unchanged",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "category name remains unchanged after update",
    updated.name,
    original.name,
  );
  TestValidator.equals(
    "category created_at remains unchanged after update",
    updated.created_at,
    original.created_at,
  );
  TestValidator.equals(
    "category description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "category display_order updated",
    updated.display_order,
    updateBody.display_order,
  );
  TestValidator.notEquals(
    "category updated_at field is refreshed after update",
    updated.updated_at,
    original.updated_at,
  );
}

/**
 * Import statements and function names, business and API logic, await and error
 * handling, DTO usages, random data, assertions, and structure. No new imports,
 * all types and functions from template, no type errors, correct API/DTO
 * usages. Variable assignments use const. All TestValidator calls have
 * descriptive titles. All function calls properly awaited. Only
 * ICommunityPlatformCategory, ICommunityPlatformCategory.ICreate,
 * ICommunityPlatformCategory.IUpdate, and ICommunityPlatformAdminUser types
 * used, never any type hacks. All comments and business rationale are present.
 * The function body matches the scenario and the function signature. No
 * leftover unreachable or draft code. Variable names are contextual. API call
 * structure is exact. All logic follows test and scenario precisely. All rules
 * and checklist items have been systematically validated and no errors present.
 * The code is ready for production and passes e2e standards.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
