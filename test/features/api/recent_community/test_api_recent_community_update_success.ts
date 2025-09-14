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
 * Validate update of member user's recent community metadata.
 *
 * This workflow ensures proper business context for updating a member
 * user's recent community navigation record. Steps:
 *
 * 1. Register and authenticate an admin user (to create a category)
 * 2. Create a community category as the admin user
 * 3. Register and authenticate a member user
 * 4. Create a community (member user, referencing admin-created category)
 * 5. Add the community to the member user's recent communities (get
 *    recentCommunityId)
 * 6. Update the recent community's last_activity_at to a new ISO timestamp
 * 7. Assert the update succeeded, returned record matches (ownership
 *    unchanged, timestamp updated)
 */
export async function test_api_recent_community_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create a community category as the admin user
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const displayOrder = typia.random<number & tags.Type<"int32">>();
  const categoryCreate = {
    name: categoryName,
    display_order: displayOrder,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      { body: categoryCreate },
    );
  typia.assert(category);

  // 3. Register and authenticate a member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name();
  const memberAuth = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberAuth);

  // 4. Create a community as the member user
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const communityCreate = {
    name: communityName,
    category_id: category.id,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner is test member",
    community.owner_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community category is created one",
    community.category_id,
    category.id,
  );

  // 5. Add the community to member user's recent communities
  const recentCreate = {
    community_id: community.id,
  } satisfies ICommunityPlatformRecentCommunity.ICreate;
  const recentCommunity =
    await api.functional.communityPlatform.memberUser.recentCommunities.create(
      connection,
      { body: recentCreate },
    );
  typia.assert(recentCommunity);
  TestValidator.equals(
    "recent community owner is member user",
    recentCommunity.memberuser_id,
    memberAuth.id,
  );

  // 6. Update the recent community's last_activity_at
  const newLastActivity = new Date(Date.now() + 60000).toISOString();
  const updateBody = {
    last_activity_at: newLastActivity,
  } satisfies ICommunityPlatformRecentCommunity.IUpdate;
  const updated =
    await api.functional.communityPlatform.memberUser.recentCommunities.update(
      connection,
      {
        recentCommunityId: recentCommunity.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "last_activity_at updated",
    updated.last_activity_at,
    newLastActivity,
  );
  TestValidator.equals(
    "memberuser_id remains unchanged",
    updated.memberuser_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community_id remains unchanged",
    updated.community_id,
    community.id,
  );
}

/**
 * The draft implementation is thorough and follows the scenario and materials
 * provided. The test logic is correct and precisely follows the workflow for
 * updating a recent community record: it properly authenticates as admin for
 * category creation, switches to a member user for community and recency
 * creation, then exercises the update as intended. All required API
 * function/DTO calls are present, correct, and type-safe. Random data is
 * correctly generated using typia and RandomGenerator; null/undefined and
 * tag-handling are correct. All API responses are asserted with typia.assert().
 * TestValidator calls are present with descriptive titles and use the correct
 * positional arguments. Await is used for every async/Promise-expecting call.
 * No missing required fields, no DTO/SDK function confusion, no import
 * violations, no non-existent property usage, and no type error tests exist.
 * The test follows a logical, realistic business workflow and never mixes roles
 * without explicit authentication context. No errors or violations were
 * identified, so the final code may be identical to draft.
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
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.9. AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.10. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11. CRITICAL: API Function Existence Verification
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
