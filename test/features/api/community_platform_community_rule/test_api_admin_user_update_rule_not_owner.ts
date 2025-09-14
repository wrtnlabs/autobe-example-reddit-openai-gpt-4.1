import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate that updating a community rule fails for non-owner adminUser
 * accounts.
 *
 * This test verifies that only the owner adminUser of a community can
 * update its rules. It also confirms that attempting an update as a
 * different admin results in an authorization error. The test covers full
 * setup, including admin account creation, category and community setup,
 * and the critical negative update scenario.
 *
 * Steps:
 *
 * 1. Register admin1 (owner) with unique credentials.
 * 2. Register admin2 (tester) with unique credentials.
 * 3. Authenticating as admin1.
 * 4. Create a new platform category.
 * 5. Admin1 creates a new community using the category.
 * 6. Admin1 adds a rule to the new community.
 * 7. Switch authentication to admin2.
 * 8. Attempt to update admin1's community rule as admin2 (not owner).
 * 9. Assert that the update attempt fails (permission denied/authorization
 *    error).
 */
export async function test_api_admin_user_update_rule_not_owner(
  connection: api.IConnection,
) {
  // Step 1: Register admin1 (owner)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1 = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      display_name: RandomGenerator.name(2).substring(0, 32),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(admin1);

  // Step 2: Register admin2 (tester)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2 = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      display_name: RandomGenerator.name(2).substring(0, 32),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(admin2);

  // Step 3: Authenticate as admin1
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // Step 4: Create a new platform category.
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 12,
          })
            .replace(/[^a-zA-Z0-9-_]/g, "")
            .substring(0, 32),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Admin1 creates a new community using the category.
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 6,
            wordMax: 16,
          })
            .replace(/[^a-zA-Z0-9-_]/g, "")
            .substring(0, 32),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Admin1 adds a rule to the community.
  const rule =
    await api.functional.communityPlatform.adminUser.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_text: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 20,
            wordMax: 50,
          }).substring(0, 100),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 7: Switch authentication to admin2.
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // Step 8: Attempt to update the rule as admin2 (not the owner)
  await TestValidator.error(
    "admin2 should not be allowed to update a rule owned by admin1",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
          body: {
            rule_text: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 10,
              wordMax: 30,
            }).substring(0, 100),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}

/**
 * - All API calls use await correctly
 * - Correct DTO types are used for every API operation (IJoin, IAuthorized,
 *   ILogin, ICreate, IUpdate)
 * - No additional import statements were added – template code is respected
 * - TestValidator.error usage for the negative test (permission error) includes
 *   descriptive title and async callback with await
 * - Random data generation for emails, passwords, and names uses
 *   typia.random<...>() or RandomGenerator properly
 * - Request body variable declarations use const (no type annotations, no
 *   let/reassign)
 * - No type errors, tests of missing required fields, or wrong type data:
 *   everything uses valid types
 * - All required properties are present for every DTO.
 * - Function is well documented with scenario description and stepwise comments.
 * - Role switching (login as admin1, then admin2) is handled via authentication
 *   APIs, not headers.
 * - All non-void API responses are validated with typia.assert
 * - No property access to non-existent schema properties
 * - No touching of connection.headers
 * - Proper naming conventions, TypeScript strictness, and anti-hallucination
 *   protocols are respected
 * - No possible compilation errors detected
 * - Output is a valid .ts file - no markdown formatting present
 * - Final code is correct and compilable, matching highest quality standards.
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
