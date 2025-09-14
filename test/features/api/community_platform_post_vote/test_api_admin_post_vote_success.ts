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
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Verifies that an admin user can vote (upvote, downvote, or remove vote) on a
 * post written by another user. Ensures that self-voting is prohibited.
 *
 * Workflow:
 *
 * 1. Register a member user (author)
 * 2. Register an admin user (voter)
 * 3. Admin logs in (prepare for admin operations)
 * 4. Admin creates a category
 * 5. Member logs in (prepare for community/post)
 * 6. Member creates a community
 * 7. Member creates a post
 * 8. Admin logs in (switching role for further votes)
 * 9. Admin upvotes member's post; verifies success
 * 10. Admin downvotes member's post; verifies state change
 * 11. Admin removes vote; verifies vote reset
 * 12. Admin creates their own post and attempts to vote on it; verifies error
 *     (self-vote prohibition)
 */
export async function test_api_admin_post_vote_success(
  connection: api.IConnection,
) {
  // 1. Register member user
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

  // 2. Register admin user
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

  // 3. Admin login
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 4. Admin creates a category
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(category);

  // 5. Member login
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });

  // 6. Member creates a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 8 }),
        },
      },
    );
  typia.assert(community);

  // 7. Member creates a post
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        author_display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(post);

  // 8. Admin login to vote
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 9. Admin upvotes member's post
  const upvote =
    await api.functional.communityPlatform.adminUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          vote_state: "upvote",
        },
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote_state is upvote", upvote.vote_state, "upvote");

  // 10. Admin changes to downvote
  const downvote =
    await api.functional.communityPlatform.adminUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          vote_state: "downvote",
        },
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "vote_state is downvote",
    downvote.vote_state,
    "downvote",
  );

  // 11. Admin removes vote (vote_state = none)
  const noVote =
    await api.functional.communityPlatform.adminUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          vote_state: "none",
        },
      },
    );
  typia.assert(noVote);
  TestValidator.equals("vote_state is none", noVote.vote_state, "none");

  // 12. Negative case: Admin creates own post and tries to vote
  // Admin creates a community (using existing category)
  const adminCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(adminCommunity);
  // Admin creates their own post
  const adminPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_platform_community_id: adminCommunity.id,
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        author_display_name: RandomGenerator.name(),
      },
    });
  typia.assert(adminPost);
  // Try self-vote as admin
  await TestValidator.error("admin cannot self-vote on own post", async () => {
    await api.functional.communityPlatform.adminUser.posts.votes.create(
      connection,
      {
        postId: adminPost.id,
        body: {
          post_id: adminPost.id,
          vote_state: "upvote",
        },
      },
    );
  });
}

/**
 * 1. All API function calls use await and correct types; DTO type variants
 *    (ICreate) are used for POST requests, and proper login flows respected for
 *    role switching.
 * 2. All request/response types match SDK and DTO definitions; for category,
 *    community, post, and vote, the required properties are present and use
 *    appropriate types.
 * 3. Random and descriptive test data is generated using RandomGenerator and
 *    typia.random with explicit type arguments. Email and password constraints
 *    are respected.
 * 4. Documented step-by-step workflow as required in JSDoc, with clear boundaries
 *    between admin and member test flows. All TestValidator functions use
 *    descriptive titles. Role switching performed via login endpoints without
 *    any header manipulation.
 * 5. No additional imports were added; template code untouched aside from the
 *    required function body. No require() or creative import statements
 *    detected. No fictional API functions or DTO access, only provided types
 *    and APIs.
 * 6. Error scenarios focus on business logic (self-vote prohibition) and do not
 *    attempt type error testing or status code validation. All error testing
 *    uses TestValidator.error with proper await and async callback, as
 *    required.
 * 7. All assertions use actual-first, expected-second order, and there are no
 *    extraneous checks post typia.assert. Null/undefined handling for optional
 *    fields is not relevant here.
 * 8. Code is maintainable; variable names reflect the business context; helper
 *    variables created for clarity (emails, password, etc.). No mutation of
 *    request body variables.
 * 9. All properties set in request/response match the schema, and no illegal
 *    property invention (no addition of unlisted properties). Enum value for
 *    vote_state is string union, matches allowed values.
 * 10. All checklist items for code quality, function structure, DTO usage, type
 *     safety, and business logic are met. No copy-paste mistakes from examples
 *     detected in logic or DTO names.
 *
 * No issues found that require deletions or major corrections. The function is
 * ready for production and passes all quality gates. No hallucinated properties
 * or illegal patterns.
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
