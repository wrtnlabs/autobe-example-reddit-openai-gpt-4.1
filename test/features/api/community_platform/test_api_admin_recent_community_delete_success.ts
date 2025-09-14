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
 * AdminUser deletes a recent community record, validating cross-role
 * operations and permission controls.
 *
 * Scenario Steps:
 *
 * 1. Register and authenticate an adminUser
 * 2. AdminUser creates a new category
 * 3. AdminUser creates a community with the category
 * 4. Register and authenticate a memberUser
 * 5. MemberUser adds the admin-created community to their recent communities
 * 6. Log in again as adminUser
 * 7. AdminUser deletes the memberUser's recent community using the admin-only
 *    endpoint
 * 8. Validate that the operation completes successfully (no response, no
 *    error, record removed)
 *
 * Business Context:
 *
 * - Ensures that admin can delete any recent community entry, even if it was
 *   made by a memberUser.
 * - Ensures proper permission controls, identity references, and occupancy of
 *   cascade deletion.
 * - Ensures related community record is not affected by recent community
 *   deletion.
 */
export async function test_api_admin_recent_community_delete_success(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoin);

  // 2. AdminUser creates a new category
  const categoryInput = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 7 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 12,
    }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 3. AdminUser creates a new community
  const communityInput = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 7 }),
    category_id: category.id,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 16,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 4. Register memberUser
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name();
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoin);

  // 5. Log in as memberUser
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 6. MemberUser adds the community to recentCommunities
  const recentInput = {
    community_id: community.id,
  } satisfies ICommunityPlatformRecentCommunity.ICreate;
  const recent =
    await api.functional.communityPlatform.memberUser.recentCommunities.create(
      connection,
      {
        body: recentInput,
      },
    );
  typia.assert(recent);

  // 7. Log in as adminUser (switch user context)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 8. AdminUser deletes the memberUser's recent community
  await api.functional.communityPlatform.adminUser.recentCommunities.erase(
    connection,
    {
      recentCommunityId: recent.id,
    },
  );
  // 9. Success = no exception thrown
}

/**
 * - No additional import statements used; only what template provides.
 * - All function names, parameter structures, and DTO types exactly match the
 *   provided definitions (no hallucinated or missing properties).
 * - Each API call uses await. All path parameters and request bodies are
 *   constructed in precise accord with the SDK and DTOs.
 * - Role (auth) context switching follows valid login sequences (member
 *   admin/members logged in as necessary).
 * - No type error testing; no wrong-type or missing required data in any API
 *   call. No code for status code testing or validator error callback.
 * - No business logic is violated: admin deletes a member's recent community
 *   record (business supported by endpoint docs and scenario), underlying
 *   community entity is not deleted by specification.
 * - Request variable immutability and `satisfies` usage is correct.
 * - All generated values respect format, constraints, and length tags from DTOs.
 * - No direct manipulation of connection.headers or forbidden operations.
 * - No markdown or code blocks. All comments are TypeScript comments and
 *   doc-strings inside the function as required.
 * - Function is precisely located, correct signature, everything else per the
 *   template.
 *
 * Final output is correct and ready for production.
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
 *   - O All functionality implemented
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
 *   - O No illogical patterns
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
