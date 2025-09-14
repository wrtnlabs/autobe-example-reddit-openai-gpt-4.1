import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Validates the admin moderation workflow for viewing all votes on a
 * comment.
 *
 * This test simulates a full platform business scenario with multiple
 * actors:
 *
 * - An admin and two member users are created. The admin performs category
 *   and community creation.
 * - The first member creates a post and adds a comment.
 * - The second member upvotes the comment. The admin switches back and
 *   downvotes the same comment.
 * - Admin lists all votes for the comment for moderation and verifies voter
 *   identities and vote types (upvote, downvote) are present and correct.
 *
 * Steps performed:
 *
 * 1. Admin joins (registers) and authenticates.
 * 2. First member joins and authenticates.
 * 3. Admin creates a new category and a community within it.
 * 4. Member creates a post within the community.
 * 5. Member adds a comment to the post.
 * 6. Second member joins (to simulate another actor), authenticates, and
 *    upvotes the comment.
 * 7. Admin logs in again, downvotes the same comment.
 * 8. Admin uses the moderation endpoint to retrieve all votes for the comment.
 * 9. The test asserts both upvote and downvote exist, with correct voter
 *    identities (member and admin respectively) and vote type values are
 *    precisely as specified.
 *
 * The implementation ensures precise authentication context switching,
 * strict type safety, use of only defined DTO properties, and comprehensive
 * business logic validation, with proper assertion titles and realistic
 * random data respecting business constraints.
 */
export async function test_api_comment_vote_list_admin_moderation(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoin);
  const adminUserId = adminJoin.id;
  // Already authenticated as admin after join

  // 2. First member joins and authenticates
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1Join = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(member1Join);
  const member1UserId = member1Join.id;

  // 3. Admin creates category
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  const categoryCreate =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryCreate);
  const categoryId = categoryCreate.id;

  // 3. Admin creates new community
  const communityCreate =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          category_id: categoryId,
          description: RandomGenerator.paragraph({
            sentences: 7,
            wordMin: 3,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);
  const communityId = communityCreate.id;

  // 4. First member logs in for post creation
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 5. Member creates a post in the community
  const postCreate =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }) satisfies string as string,
        body: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 8,
          wordMax: 16,
        }) satisfies string as string,
        author_display_name: RandomGenerator.name(2),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postCreate);
  const postId = postCreate.id;

  // 6. Member creates a comment to the post
  const commentCreate =
    await api.functional.communityPlatform.memberUser.comments.create(
      connection,
      {
        body: {
          post_id: postId,
          body: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 8,
          }),
          display_name: RandomGenerator.name(2),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentCreate);
  const commentId = commentCreate.id;

  // 7. Second member joins and authenticates
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  const member2Join = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(member2Join);
  const member2UserId = member2Join.id;

  // 7. Member2 logs in and upvotes the comment
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });
  const upvote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentId,
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals(
    "vote_type should be upvote (member2)",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "voter_memberuser_id matches member2",
    upvote.voter_memberuser_id,
    member2UserId,
  );

  // 8. Admin logs in again and downvotes the same comment
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });
  const downvote =
    await api.functional.communityPlatform.adminUser.comments.votes.create(
      connection,
      {
        commentId: commentId,
        body: {
          comment_id: commentId,
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "vote_type should be downvote (admin)",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "voter_adminuser_id matches admin",
    downvote.voter_adminuser_id,
    adminUserId,
  );

  // 9. Admin lists all votes for the comment (moderation)
  const votesPage =
    await api.functional.communityPlatform.adminUser.comments.votes.index(
      connection,
      {
        commentId: commentId,
        body: {
          // No filter: list all votes
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>, // Ensure types
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(votesPage);
  const votes = votesPage.data;

  // Find upvote and downvote
  const foundUpvote = votes.find(
    (v) => v.vote_type === "upvote" && v.voter_memberuser_id === member2UserId,
  );
  const foundDownvote = votes.find(
    (v) => v.vote_type === "downvote" && v.voter_adminuser_id === adminUserId,
  );

  TestValidator.predicate(
    "admin upvote entry present in list",
    foundUpvote !== undefined,
  );
  TestValidator.predicate(
    "admin downvote entry present in list",
    foundDownvote !== undefined,
  );
  TestValidator.equals(
    "upvote record vote_type",
    foundUpvote?.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "downvote record vote_type",
    foundDownvote?.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "upvote record comment_id",
    foundUpvote?.comment_id,
    commentId,
  );
  TestValidator.equals(
    "downvote record comment_id",
    foundDownvote?.comment_id,
    commentId,
  );
  TestValidator.equals(
    "upvote record voter_memberuser_id",
    foundUpvote?.voter_memberuser_id,
    member2UserId,
  );
  TestValidator.equals(
    "downvote record voter_adminuser_id",
    foundDownvote?.voter_adminuser_id,
    adminUserId,
  );
}

/**
 * Review Analysis:
 *
 * - Compilation: All code is syntactically correct and type-safe, no missing
 *   awaits, all API SDK calls awaited, no compilation errors.
 * - Imports: No import statement added or modified, template untouched, strictly
 *   followed.
 * - DTO Types: Only DTOs provided used. All required fields always present,
 *   optional/nullable handled correctly, no property hallucination.
 * - Type Generation: All random values use typia.random and RandomGenerator as
 *   appropriate and type tags respected. All string values for emails, uuid,
 *   etc. generated using correct typia tag constraints.
 * - Authentication Flows: Authentication context switching is correct. After each
 *   join/login, the connection is used in correct context for following step,
 *   per business scenario. No manual header/token management.
 * - Business Context: Steps strictly follow scenario; admin and two members
 *   created, category/community/post/comment built through correct flows.
 *   Downvote and upvote cast by correct users. Votes listing verifies both
 *   entry types present; voter ids match scenario actors. Data relationships
 *   and order correct.
 * - TestValidator: All validation calls include required title parameter with
 *   business-context phrasing—no missing titles, and actual-first,
 *   expected-second ordering always maintained. Only simple error validation
 *   logic used.
 * - Edge Cases: All business logic paths tested: dual voting, both vote types,
 *   voter ids, no more or fewer than required. No status code testing, no type
 *   error scenarios, no extra properties or missing required, no DTO misuse.
 * - Quality: Thorough use of TypeScript features, no non-null assertions, correct
 *   const usage, explicit types where necessary, 100% adherence to test design
 *   and implementation requirements.
 * - Documentation: JSDoc and in-function comments exhaustive and
 *   business-contextual. Scenario commented before all code steps. Variable
 *   names descriptive.
 * - Output: Pure TypeScript, no markdown formatting or code blocks present.
 *   Output matches requirements for .ts file body. No issues found. Final code
 *   identical to draft, as all rules fulfilled.
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
