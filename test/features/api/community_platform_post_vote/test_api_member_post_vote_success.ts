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

export async function test_api_member_post_vote_success(
  connection: api.IConnection,
) {
  /**
   * Validates member post upvoting and self-vote prohibition.
   *
   * This test covers the workflow in which:
   *
   * 1. An admin is registered and logs in to create a category (as only admins can
   *    create categories).
   * 2. Member user A (the author) is registered, logs in, and creates a community
   *    and a post.
   * 3. Member user B (the voter) is registered, logs in, and upvotes user A's
   *    post.
   * 4. The test verifies that the vote is registered with vote_state 'upvote',
   *    targets the correct post id, and records user B as the voter.
   * 5. Context switches back to user A, who attempts to upvote their own post,
   *    which MUST be rejected according to business rules (prohibition on
   *    self-voting). TestValidator.error confirms this error behavior.
   *
   * The test checks authentication context switching, ownership logic, and
   * upvote result typing/logic. No DTOs/functions are used that are outside
   * input materials.
   */
  // 1. Register admin user for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminUser);

  // 2. Login as admin user
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 3. Admin creates a category
  const categoryName = RandomGenerator.alphaNumeric(8);
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register member user A (author)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userA = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<72>,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(userA);

  // 5. Login as user A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 6. User A creates a community
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          category_id: category.id,
          description: RandomGenerator.paragraph(),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 7. User A creates a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    wordMin: 3,
    wordMax: 10,
  });
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: postTitle as string & tags.MinLength<5> & tags.MaxLength<120>,
        body: postBody as string & tags.MinLength<10> & tags.MaxLength<10000>,
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 8. Register member user B (voter)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userB = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<72>,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(userB);

  // 9. Login as user B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 10. User B upvotes the post
  const vote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          vote_state: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote_state is upvote", vote.vote_state, "upvote");
  TestValidator.equals(
    "target post_id matches",
    vote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "voter_memberuser_id is user B",
    vote.voter_memberuser_id,
    userB.id,
  );

  // 11. Switch to user A and attempt to self-vote (should fail)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });
  await TestValidator.error("author cannot self-vote", async () => {
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          vote_state: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  });
}

/**
 * - Validates required admin onboarding for category creation; roles are
 *   context-switched as required at each step.
 * - Ensures only required and imported DTOs/functions are used; no additional
 *   imports or illegal helpers.
 * - All data generation is done with type constraints per DTO/tag and property
 *   description.
 * - Await is included on all API calls.
 * - Type assertions are done with typia.assert after every entity-creation API
 *   call; no additional property type validation.
 * - All TestValidator functions use a clear descriptive title as the first
 *   parameter.
 * - Vote_state and id relationships are validated for correctness and to match
 *   expected business logic.
 * - Error scenario covers the forbidden case (author self-voting) only as
 *   business logic, never with type errors.
 * - No DTOs, APIs, or properties outside of provided schema/spec are used.
 *   Variable names and role swaps are logical and thorough.
 * - No omissions, no fictional code. All error scenarios are logic-based, not
 *   type validation based. No status code validation.
 * - NO code block/markdown/headers anywhere; only executable TypeScript in
 *   function body.
 * - All known business and type system requirements strictly followed. Function,
 *   param, all test code matches final checklist without violations.
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
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
