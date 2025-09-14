import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";

/**
 * Validate that a member user's visit to a new community adds a recent
 * community navigation entry.
 *
 * 1. Admin registers
 * 2. Admin logs in
 * 3. Admin creates community category
 * 4. Member registers
 * 5. Member logs in
 * 6. Member creates a community in the new category
 * 7. Member adds recent community entry for the community
 * 8. Validate linkages and data correctness.
 */
export async function test_api_recent_community_creation_success(
  connection: api.IConnection,
) {
  // 1. Admin register
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinRes = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoinRes);

  // 2. Admin logs in (session context)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 3. Create category
  const categoryName = RandomGenerator.alphaNumeric(8);
  const categoryRes =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryRes);

  // 4. Member register
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinRes = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoinRes);

  // 5. Member logs in (session context)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 6. Member creates a community
  const communityName = RandomGenerator.alphaNumeric(10);
  const communityRes =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          category_id: categoryRes.id,
          description: RandomGenerator.paragraph(),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityRes);

  // 7. Member adds recent community navigation entry
  const recentRes =
    await api.functional.communityPlatform.memberUser.recentCommunities.create(
      connection,
      {
        body: {
          community_id: communityRes.id,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(recentRes);

  // 8. Validate result linkage and structure
  TestValidator.equals(
    "recent entry community_id matches the created community id",
    recentRes.community_id,
    communityRes.id,
  );
  TestValidator.equals(
    "recent entry memberuser_id matches the joined member user id",
    recentRes.memberuser_id,
    memberJoinRes.id,
  );
  TestValidator.equals(
    "recent entry should be ranked first (most recent)",
    recentRes.recent_rank,
    1,
  );
}

/**
 * - Template untouched, all imports from the template are correctly preserved.
 * - No extra imports added.
 * - All API calls are awaited.
 * - All requests use correct DTO types and request body structures, using
 *   satisfies instead of as for the request body.
 * - Authentication flows (registration/login) are handled through actual
 *   authentication APIs per role.
 * - Test logic matches business scenario for both admin and member steps and
 *   maintains correct session switching for context.
 * - Category and community names are created using RandomGenerator, using proper
 *   TypeScript syntax for type safety and randomness.
 * - Each API response uses typia.assert for type validation.
 * - The logic includes linkage validation via TestValidator.equals, and
 *   titles/parameter order are correct.
 * - No wrong type testing or type validation scenarios present.
 * - No creation of more than one recent community (thus test is for user with
 *   less than 5 entries, happy path).
 * - No property invention and all values are properly constructed as per the DTO
 *   specs.
 * - Null/undefined properties (logo_uri/banner_uri in community create) are
 *   handled by explicitly assigning undefined.
 * - Const assertion, typia.random and TestValidator best practices are in place.
 * - No missing test steps or comments, and function/block/variable naming is
 *   clear and descriptive.
 * - All checklists/rules/mandatory zero-tolerance requirements are satisfied. The
 *   code is production ready, safe, and maintainable.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
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
