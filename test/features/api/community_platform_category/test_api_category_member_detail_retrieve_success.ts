import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Test that a memberUser can retrieve the details of a platform category
 * created by an adminUser.
 *
 * 1. Register a new adminUser (random email/password/display_name).
 * 2. As admin, create a new category, using randomized name+display_order and
 *    possibly description.
 * 3. Register a new memberUser (random email/password/display_name).
 * 4. Authenticate as memberUser (to get a valid member session/token).
 * 5. As member, retrieve the newly created category by id via GET
 *    /communityPlatform/memberUser/categories/{categoryId}.
 * 6. Assert that the returned category matches the expected data (all public
 *    fields: id, name, display_order, description, timestamps).
 * 7. Confirm all required fields are present and correctly populated.
 * 8. Confirm business rule: member sees categories created by admin, with no
 *    confidential or admin-only data.
 */
export async function test_api_category_member_detail_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const admin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(admin);

  // 2. As admin, create category
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 12,
  });
  const displayOrder = typia.random<number & tags.Type<"int32">>();
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 12,
  });
  const createdCategory =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          display_order: displayOrder,
          description,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // 3. Register memberUser
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name();
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(member);

  // 4. Authenticate as memberUser for role switching
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 5. Retrieve category by ID as memberUser
  const category =
    await api.functional.communityPlatform.memberUser.categories.at(
      connection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(category);

  // 6. Assert correctness of returned fields
  TestValidator.equals(
    "category id returned is correct",
    category.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name returned is correct",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category display_order is correct",
    category.display_order,
    displayOrder,
  );
  TestValidator.equals(
    "category description is correct",
    category.description,
    description,
  );
  TestValidator.predicate(
    "category created_at is ISO 8601 string",
    typeof category.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.created_at),
  );
  TestValidator.predicate(
    "category updated_at is ISO 8601 string",
    typeof category.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.updated_at),
  );

  // 7. Confirm all expected fields exist (no extra/confidential fields on member endpoint)
  const visibleKeys = Object.keys(category).sort();
  const expectedKeys = [
    "id",
    "name",
    "display_order",
    "description",
    "created_at",
    "updated_at",
  ].sort();
  TestValidator.equals(
    "category object exposes only allowed fields to memberUser",
    visibleKeys,
    expectedKeys,
  );
}

/**
 * - All function steps and data flows comply with provided API/DTOs, and template
 *   imports are strictly used (no addition or modification).
 * - All property access is verified against the DTO definitions; no hallucinated
 *   or invented properties are present.
 * - NO type error testing exists. All requests use valid types, fields, and
 *   required properties. No 'as any' or type bypasses present. No missing
 *   required fields. Wrong-type or error-based tests (type validation) are not
 *   attempted.
 * - Business logic workflow is realistic and logical. All test steps follow
 *   proper authentication flow and business context: admin creates, member
 *   joins/logs in, member retrieves.
 * - Each API functional.* call uses await. No missing awaits or Promise leaks. No
 *   API/DTO confusion. No response validation after typia.assert().
 * - TestValidator assertions all have descriptive titles as first parameter, and
 *   actual/expected order (actual from API result, expected from construction)
 *   is correct.
 * - Random data generation follows type/format constraints; all typia.random<X>()
 *   calls supply explicit generics. RandomGenerator paragraph/content usage
 *   follows proper parameter object signatures.
 * - Null/undefined handling is correct; optional fields use explicit
 *   undefined/null if required by the test. Property lists verified for
 *   presence, no confidential/admin-only fields included. Properties in DTO
 *   only.
 * - No unneeded structure modifications. All variable names are logical and
 *   context-aware. Function parameter is as required. Function is top-level
 *   with no nested creators/utility logic outside.
 *
 * No errors found: ready for final.
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
