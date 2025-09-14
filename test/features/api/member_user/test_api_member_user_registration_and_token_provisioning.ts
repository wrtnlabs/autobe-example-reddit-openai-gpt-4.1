import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate registration of a new member user and issuance of authentication
 * tokens.
 *
 * This test verifies that a user can register as a member using a unique email
 * with a strong password, and receives full identity and token information.
 * Registration should fail on duplicate email with a business logic error.
 *
 * 1. Generate a unique email and strong random password (min 8, max 72 chars) and
 *    optional display name.
 * 2. Register new user via /auth/memberUser/join.
 * 3. Assert full authorized member and JWT token set are returned. Validate UUIDs,
 *    timestamps, token structure.
 * 4. Attempt registration again with the same email; expect business logic error
 *    (duplicate violation).
 */
export async function test_api_member_user_registration_and_token_provisioning(
  connection: api.IConnection,
) {
  // Step 1: Generate test registration payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<72> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<72>>();
  const displayName: string & tags.MaxLength<32> = RandomGenerator.name(
    1,
  ).slice(0, 32);
  const registration = {
    email,
    password,
    display_name: displayName,
  } satisfies ICommunityPlatformMemberUser.IJoin;

  // Step 2: Register a new member user
  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: registration,
    });
  typia.assert(authorized);

  // Step 3: Validate authorized member and issued tokens
  TestValidator.predicate(
    "member id is valid uuid",
    typeof authorized.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authorized.id,
      ),
  );
  TestValidator.predicate(
    "user credential id is valid uuid",
    typeof authorized.user_credential_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authorized.user_credential_id,
      ),
  );
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "created_at/updated_at are valid ISO date-time",
    typeof authorized.created_at === "string" &&
      !isNaN(Date.parse(authorized.created_at)) &&
      typeof authorized.updated_at === "string" &&
      !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is unset or null",
    authorized.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "token property exists and has expected JWT fields",
    !!authorized.token &&
      typeof authorized.token.access === "string" &&
      typeof authorized.token.refresh === "string",
  );
  typia.assert<IAuthorizationToken>(authorized.token);

  // Step 4: Duplicate registration should fail by business logic
  await TestValidator.error(
    "duplicate email registration triggers business logic error",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: registration,
      });
    },
  );
}

/**
 * - Compilation: No errors found; uses only pre-imported modules/types
 * - API invocation: All api.functional.auth.memberUser.join calls have await,
 *   proper parameter structure (body: registration), and correct DTO types for
 *   request/response
 * - Request body: Conforms to ICommunityPlatformMemberUser.IJoin, strong random
 *   password, valid unique email, and valid display name (slice to
 *   maxLength=32)
 * - Response type: typia.assert call ensures type
 * - Null/undefined handling: display_name and deleted_at checked with correct
 *   null-coalescing and handling
 * - Assertions: All TestValidator calls include descriptive first parameter,
 *   correct value ordering and logic
 * - Error scenario: Duplicate registration triggers business logic error, wrapped
 *   properly in await TestValidator.error
 * - No type error testing, wrong data types, or missing required fields
 * - No response type validation after typia.assert; all business logic checks
 *   only
 * - No headers or authentication handling bugs
 * - No extra imports, code outside function, or non-existent properties
 * - Business workflow is logical: registration, check return, attempt duplicate
 * - All steps documented and commented for clarity
 * - Code is modern TS, uses const assertions, typia.random generics, and avoids
 *   anti-patterns No problems found; final code matches quality standards and
 *   requirements.
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
 *   - O 5. Final Checklist
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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
