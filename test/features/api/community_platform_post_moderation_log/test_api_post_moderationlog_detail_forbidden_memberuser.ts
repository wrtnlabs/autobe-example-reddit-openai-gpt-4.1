import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostModerationLog";

/**
 * Test that a member user cannot access admin post moderation log detail
 * endpoint (forbidden error expected).
 *
 * Steps:
 *
 * 1. Register a new admin user and authenticate (captures token)
 * 2. Admin creates a platform category
 * 3. Admin creates a community using the category
 * 4. Admin creates a post within the community
 * 5. Admin updates the post to trigger a moderation action (generating a
 *    moderation log)
 * 6. Admin queries moderation logs for the post to get a valid moderationLogId
 * 7. Register a new member user
 * 8. Member logs in (context switch)
 * 9. Member tries to call admin moderation log detail for the post/log id
 * 10. Verify that forbidden/unauthorized error is thrown (TestValidator.error)
 */
export async function test_api_post_moderationlog_detail_forbidden_memberuser(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Admin creates category
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 12,
          }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 12,
          }),
        },
      },
    );
  typia.assert(category);

  // 3. Admin creates community
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          logo_uri: undefined,
          banner_uri: undefined,
        },
      },
    );
  typia.assert(community);

  // 4. Admin creates a post
  const post = await api.functional.communityPlatform.adminUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 8,
          wordMax: 16,
        }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
        author_display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(post);

  // 5. Admin updates the post to trigger moderation log
  const updatedPost =
    await api.functional.communityPlatform.adminUser.posts.update(connection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 8,
          wordMax: 16,
        }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
        author_display_name: RandomGenerator.name(),
      },
    });
  typia.assert(updatedPost);

  // 6. Admin gets moderation logs for the post to find a valid moderationLogId
  const moderationLogsPage =
    await api.functional.communityPlatform.adminUser.posts.moderationLogs.index(
      connection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(moderationLogsPage);
  TestValidator.predicate(
    "moderation log exists",
    moderationLogsPage.data.length > 0,
  );
  const moderationLog = moderationLogsPage.data[0];

  // 7. Register a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);

  // 8. Member logs in (context switch)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });

  // 9&10. Member attempts to access moderation log detail and receives forbidden error
  await TestValidator.error(
    "member user forbidden to get admin post moderation log detail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.moderationLogs.at(
        connection,
        {
          postId: post.id,
          moderationLogId: moderationLog.id,
        },
      );
    },
  );
}

/**
 * - All business steps are implemented sequentially, using only allowed SDK
 *   functions and DTOs.
 * - Email, password, and other random data are generated with required formats,
 *   leveraging typia and RandomGenerator for proper constraints.
 * - Authentication context is switched by calling the appropriate member login
 *   endpoint after the admin setup is complete.
 * - After obtaining the postId and moderationLogId, the member user tries to
 *   fetch moderation log detail and TestValidator.error is used to assert
 *   rejected access.
 * - There are no extra imports, and template imports are untouched.
 * - Await is used on every async API function call, including inside error
 *   validation.
 * - All null/undefined patterns are correctly handled by DTO contract.
 * - No type error testing or as any, no status code comparisons, only business
 *   logic error scenario is tested.
 * - All TestValidator functions have title as first argument, and parameter order
 *   is respected throughout.
 * - No extraneous functions or logic present; helper functions are inlined where
 *   needed, and all operations keep to the provided types. No code for response
 *   property validation after typia.assert.
 * - Variable and DTO usage precisely follow SDK/DTO definitions: e.g., IJoin for
 *   user registration, ICreate for object creation, IUpdate for post updating,
 *   IRequest for moderation log browsing, etc.
 * - No fictional DTOs or functions used; all SDK/API/DTO correspond exactly to
 *   provided materials and actual codebase.
 * - The function signature, documentation, and implementation all match e2e code
 *   standards as required.
 * - No business logic or data construction beyond explicit scenario requirements
 *   and DTO contracts.
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
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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
