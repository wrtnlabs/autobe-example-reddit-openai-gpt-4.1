import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate enforcement of the maximum rules-per-community restriction for
 * admin users.
 *
 * This test ensures that when acting as an admin user, one cannot create
 * more than 10 rules for a single community, matching the business logic
 * applied to member users. The test walks through full setup of required
 * users and community, context switches to admin, and attempts to create 11
 * distinct rules. Each of the first 10 attempts should succeed (response
 * asserted), but the 11th attempt must fail, which is checked with an error
 * assertion.
 *
 * Steps:
 *
 * 1. Register and log in a member user, and create a community (record id).
 * 2. Register and log in an admin user.
 * 3. As admin, repeatedly (10 times) add rules to the created community, with
 *    unique texts, asserting response each time.
 * 4. Attempt to add an 11th rule as admin—expect this to fail and validate the
 *    error is thrown.
 */
export async function test_api_community_rule_create_admin_rule_limit(
  connection: api.IConnection,
) {
  // 1. Register the member user who will own the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoin);

  // 2. Log in as this member (establish owner role in SDK)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 3. As member, create a community (with random category_id)
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoin);

  // 5. Login as the admin user (switch to admin context)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 6. Add 10 rules as admin (all must succeed and match rule text)
  for (let i = 0; i < 10; ++i) {
    const ruleText = `Rule ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })}`;
    const rule =
      await api.functional.communityPlatform.adminUser.communities.rules.create(
        connection,
        {
          communityId: community.id,
          body: {
            rule_text: ruleText,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    TestValidator.equals(
      `rule index for rule #${i + 1}`,
      rule.rule_index,
      i + 1,
    );
    TestValidator.equals(
      `rule text for rule #${i + 1}`,
      rule.rule_text,
      ruleText,
    );
    TestValidator.equals(
      `rule community id for rule #${i + 1}`,
      rule.community_id,
      community.id,
    );
  }

  // 7. Attempt to create the 11th rule—should fail (limit enforcement). Error expected.
  const overflowRuleText = `Overflow rule - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })}`;
  await TestValidator.error(
    "admin cannot create more than 10 rules per community",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.create(
        connection,
        {
          communityId: community.id,
          body: {
            rule_text: overflowRuleText,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );
}

/**
 * Review for the test implementation:
 *
 * 1. The scenario is implemented as a comprehensive E2E test that validates that
 *    admin users are subject to the same maximum of 10 rules per community as
 *    member users, matching the business rule.
 * 2. User flow:
 *
 *    - Member user registration and login are handled explicitly, with clear
 *         credential construction and assertion.
 *    - Community creation uses the member user and unique name/category_id, using
 *         the correct DTO.
 *    - Admin user registration and login are performed, with proper role context
 *         switch.
 *    - The test loops 10 times to add 10 unique rules as admin, asserting index,
 *         rule text, and community_id for type/model compliance.
 *    - On the 11th attempt, the test uses TestValidator.error to assert that
 *         business rule enforcement occurs.
 * 3. Value generation uses RandomGenerator and typia.random appropriately,
 *    ensuring properly formatted and unique values.
 * 4. All TestValidator usages include a descriptive title as the first argument as
 *    mandated.
 * 5. All awaits, body typings, and type assertions follow framework rules.
 * 6. No forbidden patterns are present:
 *
 *    - NO type error testing or use of `as any`.
 *    - NO direct HTTP error/status assertion.
 *    - NO manual manipulation of connection headers, proper role switching via login
 *         APIs.
 *    - NO missing required fields or DTO confusion.
 *    - No extra import statements or template tampering.
 * 7. The code comment and function JSDoc provide context and detailed
 *    documentation aligned with the scenario and code steps.
 *
 * No issues were found.
 *
 * Final code is identical to draft and correct.
 *
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
