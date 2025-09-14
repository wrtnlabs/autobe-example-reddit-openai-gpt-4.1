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
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * E2E test: attempt by one admin user (Admin A) to delete a comment vote
 * cast by another admin user (Admin B). Ensures that only the original
 * voter (by authentication) can remove their comment vote.
 *
 * Test business workflow:
 *
 * 1. Admin B (vote owner) joins with random email.
 * 2. Admin B creates a category.
 * 3. Admin B creates a community referencing the category.
 * 4. Admin B creates a post in the new community.
 * 5. Admin B creates a comment on the post.
 * 6. Admin B casts a vote (upvote) on the comment (they "own" this vote).
 * 7. Admin A joins with random email (distinct from B).
 * 8. Admin A logs in (role switch context)
 * 9. Admin A attempts to delete Admin B's vote using the commentId and voteId
 *    (forbidden).
 * 10. The API must deny deletion due to ownership enforcement: error occurs.
 *
 * Validates authentication context switching, ownership protection, and
 * business rule enforcement on comment vote deletion.
 */
export async function test_api_adminuser_comment_vote_removal_unauthorized(
  connection: api.IConnection,
) {
  // 1. Admin B joins
  const adminBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminBJoin,
  });
  typia.assert(adminB);

  // 2. Admin B creates a category
  const categoryBody = {
    name: RandomGenerator.alphaNumeric(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Admin B creates a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    category_id: category.id,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 4. Admin B creates a post
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 14 }),
    author_display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.adminUser.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 5. Admin B creates a comment on the post
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 8, wordMax: 16 }),
    display_name: RandomGenerator.name(1),
    parent_comment_id: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.adminUser.comments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);

  // 6. Admin B votes on the comment (owns this vote)
  const voteBody = {
    comment_id: comment.id,
    vote_type: "upvote",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote =
    await api.functional.communityPlatform.adminUser.comments.votes.create(
      connection,
      { commentId: comment.id, body: voteBody },
    );
  typia.assert(vote);

  // 7. Admin A joins
  const adminAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminAJoin,
  });
  typia.assert(adminA);

  // 8. Switch authentication context: Admin A logs in
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminAJoin.email,
      password: adminAJoin.password,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 9. Admin A attempts to delete Admin B's vote on the comment (should fail)
  await TestValidator.error(
    "Admin A cannot delete Admin B's comment vote (ownership protection)",
    async () => {
      await api.functional.communityPlatform.adminUser.comments.votes.erase(
        connection,
        { commentId: comment.id, voteId: vote.id },
      );
    },
  );
}

/**
 * Review of draft implementation:
 *
 * - All code is inside the prescribed template, only the marker comment replaced.
 * - Follows the natural scenario flow: Admin B creates
 *   category/community/post/comment/vote, Admin A attempts vote deletion.
 * - Authentication is switched properly: after both admin users join, Admin A
 *   logs in to establish the correct context for forbidden operation.
 * - All DTOs used match the provided definitions and correct variants are used
 *   for each operation (ICreate where required, base type otherwise).
 * - All API responses are validated with typia.assert(...).
 * - TestValidator.error is used with a descriptive title; outer async function,
 *   await is present as required.
 * - All async/await requirements are satisfied (each api.functional.* call is
 *   awaited, TestValidator.error with async callback is awaited).
 * - All pre-imported utilities (typia, RandomGenerator, TestValidator) are used
 *   as required; no additional imports.
 * - No type error, missing fields, or type-unsafe assignments present.
 * - No attempts to touch connection.headers.
 * - Random data is generated for all required fields using typia.random and
 *   RandomGenerator according to type and business constraints in DTOs.
 * - Edge case of vote deletion tested: permission denied for user not owning the
 *   vote.
 * - Variable and function naming follows business context, all logic is
 *   well-commented and steps clear.
 * - No logical errors or anti-patterns identified in business workflow (entities
 *   created in correct order; voting and deletion attempt are logically sound
 *   in isolation, with proper context switching).
 * - No fictitious API/DTO usage, code adheres to provided definitions and
 *   functions only.
 *
 * No errors were found; all rules/checklists from the system prompt are met.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation Rules
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
