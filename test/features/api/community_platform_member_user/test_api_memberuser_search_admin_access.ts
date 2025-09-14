import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberUser";

/**
 * Validate admin user search and pagination of member user accounts.
 *
 * This test ensures that an admin user can search and paginate the list of
 * member users using the PATCH /communityPlatform/adminUser/memberUsers
 * endpoint. The scenario includes:
 *
 * 1. Registering a new admin user who will have permission to perform member
 *    user searches.
 * 2. Registering at least one member user. The user will be returned in the
 *    search result.
 * 3. Logging in as the admin user (the join call returns the auth context).
 * 4. Performing a search of member users by display_name using the endpoint,
 *    supplying a filter that should match the previously created member
 *    user.
 * 5. Validating that (a) the page contains at least the registered member
 *    user, (b) the display_name and/or status matches, and (c) pagination
 *    metadata (current page, limit, total records, etc) is present and
 *    coherent.
 * 6. Negatively, check that a search with an unlikely/nonexistent display_name
 *    returns no results.
 */
export async function test_api_memberuser_search_admin_access(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplay = RandomGenerator.name();
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplay,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Register a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(14);
  const memberDisplay = RandomGenerator.name();
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplay,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoin);
  // 3. Admin is already authenticated via join, so can directly search
  // 4. Search by display_name, page 1, limit 5
  const searchBody = {
    page: 1,
    limit: 5,
    display_name: memberDisplay,
  } satisfies ICommunityPlatformMemberUser.IRequest;
  const page =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(page);
  // 5a. Member user should appear in results
  const found = page.data.find((u) => u.id === memberJoin.id);
  TestValidator.predicate("member user appears in search page", !!found);
  if (found) {
    TestValidator.equals(
      "display_name matches",
      found.display_name,
      memberDisplay,
    );
    TestValidator.equals("status matches", found.status, memberJoin.status);
  }
  // 5b. Pagination info is present and coherent
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records at least 1",
    page.pagination.records >= 1,
  );
  TestValidator.predicate("pages at least 1", page.pagination.pages >= 1);
  // 6. Negative: unlikely display_name returns no results
  const emptySearch =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          display_name:
            "NO_USER_SHOULD_MATCH_THIS_DISPLAY_NAME__" +
            RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformMemberUser.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "search for non-existent display_name returns no data",
    emptySearch.data.length,
    0,
  );
}

/**
 * 1. Imports: No additional/forbidden imports. All required imports are present
 *    through the template.
 * 2. API Usage: Only allowed API SDK calls are used and awaited. Await is used
 *    everywhere required (SDK calls, no bare promises).
 * 3. DTOs: Only DTOs from the allowed set are referenced, using correct variants
 *    for join/create/search. No fictional DTO use.
 * 4. Typia.assert is used for all response payloads to confirm runtime type
 *    integrity, but no unnecessary property-level validation after assert.
 * 5. Data handling: Random value generation honors email formats, password min
 *    length, and display_name constraints. All request body objects use
 *    satisfies with no type annotation (no type assertion, no let declaration,
 *    no mutation).
 * 6. Business logic is respected (must create users before search).
 * 7. TestValidator usage: All validators include descriptive titles and correct
 *    (actual, expected) order. Never missing titles. No use of forbidden error
 *    checks or any status code validation.
 * 8. Pagination meta: Checked for reasonableness (page, limit, records >= 1).
 *    Pages are checked to be >= 1 not just for existence.
 * 9. Edge (negative) scenario: Searching for a deliberately-nonexistent
 *    display_name (random value) to confirm empty results works as expected.
 * 10. No missing required fields or wrong type data. No role-mixing or header
 *     manipulation. All logic follows scenario (join admin → join member →
 *     search as admin → assert results).
 * 11. Nulls/undefined: All null/undefined handling adheres to declared DTO types.
 * 12. No code block or markdown contamination, only pure TypeScript usable in a .ts
 *     file. No code outside the function.
 * 13. All checklist items for code, logic, and style are satisfied. No non-existent
 *     properties. No prohibited code remains after review (i.e., no type error
 *     testing, no status code checks, no fictional property access).
 *
 * -> The test is comprehensive and ready for production. No further changes are
 * needed.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
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
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O No additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only the imports provided in template
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
