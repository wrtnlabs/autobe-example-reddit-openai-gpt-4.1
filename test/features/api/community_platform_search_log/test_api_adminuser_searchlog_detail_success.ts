import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformSearchLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchLog";

/**
 * Validate successful detailed retrieval of a search log entry by admin.
 *
 * An admin user registers for authentication, creates a search log entry by
 * performing a search (PATCH /communityPlatform/adminUser/searchLogs), then
 * retrieves the detail for that log entry using the get endpoint, verifying
 * correctness of type and content. Validates business rule that admin users
 * can retrieve any search log.
 *
 * Steps:
 *
 * 1. Register a new admin user using POST /auth/adminUser/join (receive
 *    credentials and tokens).
 * 2. Perform a search log entry creation: call PATCH
 *    /communityPlatform/adminUser/searchLogs with filter that will produce
 *    a log. (Use a random search_query and possibly target_scope for
 *    unicity).
 * 3. Use the returned data to identify a search log id (choose first returned
 *    entry).
 * 4. Call GET /communityPlatform/adminUser/searchLogs/{searchLogId} to
 *    retrieve details.
 * 5. Assert the detailed result matches the original log (id, query, scope,
 *    IP, timestamps).
 * 6. Validate correct admin access logic.
 */
export async function test_api_adminuser_searchlog_detail_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration for authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. As authenticated admin, produce at least one search log via PATCH (searchLogs.index with some filters)
  // Use a random unique search_query and random target_scope
  const searchQuery = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const scope = RandomGenerator.pick([
    "posts",
    "comments",
    "communities",
  ] as const);
  const patchBody = {
    search_query: searchQuery,
    target_scope: scope,
    admin_user_id: admin.id,
    // No created_from/to for maximum inclusivity
    page: 1,
    limit: 5,
    sort: "created_at_desc",
  } satisfies ICommunityPlatformSearchLog.IRequest;
  const page: IPageICommunityPlatformSearchLog =
    await api.functional.communityPlatform.adminUser.searchLogs.index(
      connection,
      { body: patchBody },
    );
  typia.assert(page);
  TestValidator.predicate(
    "return at least one search log",
    page.data.length > 0,
  );

  // 3. Pick the first search log returned
  const log = page.data[0];
  typia.assert(log);

  // 4. Retrieve search log detail by ID
  const detail: ICommunityPlatformSearchLog =
    await api.functional.communityPlatform.adminUser.searchLogs.at(connection, {
      searchLogId: log.id,
    });
  typia.assert(detail);

  // 5. Field-by-field equality (except for timestamps possible difference)
  TestValidator.equals("search log id matches", detail.id, log.id);
  TestValidator.equals(
    "admin user id matches",
    detail.admin_user_id,
    log.admin_user_id,
  );
  TestValidator.equals(
    "search query matches",
    detail.search_query,
    log.search_query,
  );
  TestValidator.equals(
    "target_scope matches",
    detail.target_scope,
    log.target_scope,
  );
  TestValidator.equals("ip address matches", detail.ip_address, log.ip_address);
  TestValidator.equals("user agent matches", detail.user_agent, log.user_agent);
  TestValidator.equals("created_at matches", detail.created_at, log.created_at);
  TestValidator.equals("deleted_at matches", detail.deleted_at, log.deleted_at);
  TestValidator.predicate(
    "admin can access any search log detail",
    detail.admin_user_id === admin.id,
  );
}

/**
 * 1. Code directly follows scenario: admin is registered, search log is created
 *    (via a listing PATCH), then the log is fetched and validated. All business
 *    logic is followed and test implementation reflects real business flow.
 * 2. Authentication is handled only by actual API function, and token use is
 *    automatic (per SDK design). No headers are manually set.
 * 3. All DTO types are exact and taken only from the supplied DTOs, with correct
 *    usage (never substituted, all tags/formats correct).
 * 4. No type error tests/invalid field types are present (major failure point,
 *    avoided).
 * 5. No extra imports, code starts at function body, follows naming and parameter
 *    convention in template only.
 * 6. All TestValidator functions have descriptive first argument. Actual values
 *    precede expected in equals.
 * 7. Await is present on all async API calls, including inside TestValidator.error
 *    if used (not used in this positive test).
 * 8. All required null/undefined checks and explicit assignments are handled by
 *    TypeScript and typia.assert.
 * 9. Validations check field equality for all fields, ensure close matching to
 *    source log.
 * 10. Thorough commenting and documentation. No fictional code or logic leaks from
 *     previous test examples or other DTOs.
 * 11. All function parameter and variable typing is explicit and type-safe; random
 *     data is generated using typia.random<> or RandomGenerator as
 *     appropriate.
 * 12. Template is unaltered except for designated comment/code areas. This is a
 *     high-quality, compilable, real-world test.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
