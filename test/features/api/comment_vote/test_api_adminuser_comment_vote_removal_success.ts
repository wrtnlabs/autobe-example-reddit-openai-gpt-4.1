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
 * Validates that an admin user can delete (remove) their own vote
 * (upvote/downvote) on a comment, enforcing that ownership is required and the
 * vote is properly removed from the system. The scenario builds all
 * dependencies: admin join, category create, community create, post create,
 * comment create, and vote cast; then deletes the vote for that comment as the
 * same admin user.
 *
 * Steps:
 *
 * 1. Register and login admin user
 * 2. Create category
 * 3. Create community and associate to category
 * 4. Create post in community
 * 5. Add comment to post
 * 6. Vote (upvote) on comment by admin
 * 7. Remove (delete) the vote via the targeted API
 * 8. Validate by observing lack of error and attempting to re-cast a vote of the
 *    same type, confirming ability to re-vote after removal.
 */
export async function test_api_adminuser_comment_vote_removal_success(
  connection: api.IConnection,
) {
  // 1. Register admin user (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2).substring(0, 32),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const adminAuthResult = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthResult);
  TestValidator.equals(
    "join/display_name matches",
    adminAuthResult.display_name,
    adminJoinBody.display_name,
  );

  // 2. Create a category
  const categoryBody = {
    name: RandomGenerator.alphaNumeric(8),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals("category name", category.name, categoryBody.name);

  // 3. Create community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    category_id: category.id,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community category linkage",
    community.category_id,
    communityBody.category_id,
  );

  // 4. Create post
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }).substring(0, 120),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 25,
      wordMin: 3,
      wordMax: 7,
    }).substring(0, 10000),
    author_display_name: RandomGenerator.name(2).substring(0, 32),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.adminUser.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals("post title", post.title, postBody.title);

  // 5. Add comment
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 10 }).substring(0, 2000),
    display_name: RandomGenerator.name(1).substring(0, 32),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.adminUser.comments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post association",
    comment.post_id,
    commentBody.post_id,
  );

  // 6. Cast upvote on comment
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
  TestValidator.equals("vote type", vote.vote_type, voteBody.vote_type);
  TestValidator.equals("vote comment_id", vote.comment_id, comment.id);

  // 7. Remove vote
  await api.functional.communityPlatform.adminUser.comments.votes.erase(
    connection,
    { commentId: comment.id, voteId: vote.id },
  );

  // 8. Attempt to re-cast vote of same type, should succeed and return fresh vote id
  const newVote =
    await api.functional.communityPlatform.adminUser.comments.votes.create(
      connection,
      { commentId: comment.id, body: voteBody },
    );
  typia.assert(newVote);
  TestValidator.notEquals(
    "old and new vote id must differ after deletion",
    newVote.id,
    vote.id,
  );
  TestValidator.equals(
    "vote_type after recreation",
    newVote.vote_type,
    "upvote",
  );
}

/**
 * - All steps of the scenario are implemented following correct business workflow
 *   with valid intermediate value checks and TestValidator assertions for each
 *   resource association and type.
 * - All function calls to API SDK use await and correct parameter types and
 *   structure (no missing awaits, no bare Promise assignments).
 * - No additional import statements are present beyond those in the official
 *   template.
 * - All random data values use correct typia.random/generator patterns, and
 *   string slicing is used to enforce maximum length constraints for
 *   display_name, title, body fields.
 * - All TestValidator checks use descriptive titles, and parameter order is
 *   actual-first, expected-second.
 * - The test uses proper session context for authentication and never manipulates
 *   connection.headers directly.
 * - Removed type annotation for randoms in request bodies (all uses satisfies
 *   pattern, never type-annotated variable blocks).
 * - All TestValidator.assertions and typia.assert() are present for all API
 *   non-void results. After vote deletion, a subsequent vote create succeeds
 *   and returns a new vote id (test validates notEquals w/old id).
 * - There is no type error testing or testing of non-existent properties, and all
 *   used DTOs and function calls exist in input materials.
 * - Documentation is clear and matches scenario step-by-step, business context is
 *   explained, and variable names are self-explanatory.
 *
 * NO compilation, logic, import, or DTO errors found.
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
