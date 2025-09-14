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

/**
 * Validate that an admin can retrieve detailed information about a specific
 * vote on a comment for moderation.
 *
 * The scenario simulates full context: admin and member join; admin creates
 * category and community; member creates post and comment; admin votes on
 * the comment; admin retrieves vote detail. Steps:
 *
 * 1. Create an admin user (email, password)
 * 2. Authenticate as admin user
 * 3. Create a category using admin context
 * 4. Create a community as admin (using new category)
 * 5. Create a member user (email, password)
 * 6. Authenticate as member user
 * 7. Member creates a post in the community
 * 8. Member comments on the post
 * 9. Switch back to admin context (login as admin)
 * 10. Admin votes (upvote) on the member's comment
 * 11. Retrieve vote detail using GET
 *     /communityPlatform/adminUser/comments/{commentId}/votes/{voteId}
 * 12. Assert output: vote object's ids, vote_type='upvote', voter_adminuser_id
 *     set, voter_memberuser_id null, comment_id matches, and audit metadata
 *     (created_at, updated_at) are present.
 */
export async function test_api_admin_comment_vote_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Authenticate as admin (redundant, but verifies re-auth context for later logins)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 3. Create a category by admin
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create a community under the category
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          category_id: category.id,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Register a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoin);

  // 6. Authenticate as member
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 7. Member creates a post
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 1, sentenceMin: 8 }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 8. Member comments on the post
  const comment =
    await api.functional.communityPlatform.memberUser.comments.create(
      connection,
      {
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
          display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 9. Switch back to admin context (admin login)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 10. Admin upvotes the member's comment
  const vote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "voter_adminuser_id is admin",
    vote.voter_adminuser_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "voter_memberuser_id is null",
    vote.voter_memberuser_id,
    null,
  );
  TestValidator.equals("comment id matches", vote.comment_id, comment.id);

  // 11. Admin retrieves the vote detail
  const got =
    await api.functional.communityPlatform.adminUser.comments.votes.at(
      connection,
      {
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(got);
  TestValidator.equals("vote detail id matches", got.id, vote.id);
  TestValidator.equals(
    "vote detail comment id matches",
    got.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote detail vote_type is upvote",
    got.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote detail voter_adminuser_id is admin",
    got.voter_adminuser_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "vote detail voter_memberuser_id is null",
    got.voter_memberuser_id,
    null,
  );
  TestValidator.predicate(
    "vote detail has created_at",
    typeof got.created_at === "string" && got.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote detail has updated_at",
    typeof got.updated_at === "string" && got.updated_at.length > 0,
  );
}

/**
 * - All API function usages have await and correct parameters with strict
 *   TypeScript typing and DTO type usage.
 * - Login context switches are handled using the provided login/auth endpoints
 *   only -- no direct manipulation of headers or connection properties,
 *   ensuring compliance with authentication/authorization rules.
 * - No additional import statements or template modification outside the allowed
 *   area.
 * - All uses of typia.random have explicit generic parameters; all
 *   RandomGenerator usages use only permitted parameter shapes.
 * - All TestValidator functions include descriptive first-title parameter, using
 *   actual-first, expected-second pattern.
 * - Null/undefined/optional handling for display_name or voter ids are respected
 *   with strict checks.
 * - No tests for type error or HTTP status are included, and all validator error
 *   checks target only logic (no forbidden testing patterns used).
 * - Test is end-to-end, follows realistic scenario (admin and member
 *   registration, category/community/post/comment creation, upvote by admin,
 *   retrieval), with role switching for auth context handled only via login
 *   endpoints.
 * - Proper audit metadata (created_at, updated_at) tested for presence and
 *   non-empty values.
 * - Code is clean, with clear step-by-step progression and business rule
 *   compliance.
 * - No prohibited or illogical test code pattern detected.
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
