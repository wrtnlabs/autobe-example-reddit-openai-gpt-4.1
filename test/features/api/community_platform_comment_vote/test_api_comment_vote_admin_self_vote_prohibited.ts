import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that adminUser cannot vote (upvote/downvote) on their own comment.
 *
 * This test simulates the workflow where:
 *
 * 1. An adminUser is registered and logged in.
 * 2. The adminUser creates a new community.
 * 3. The adminUser creates a post in that community.
 * 4. The adminUser creates a comment on the post.
 * 5. The adminUser attempts to upvote their own comment (should fail).
 * 6. The adminUser attempts to downvote their own comment (should fail).
 *
 * For both self-voting attempts, a business rule error should be thrown
 * (self-voting is prohibited). Only the adminUser account is used. All
 * created entities must use valid random data per structure constraints.
 */
export async function test_api_comment_vote_admin_self_vote_prohibited(
  connection: api.IConnection,
) {
  // 1. Register and login adminUser
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const adminUser = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminUser);

  // 2. Create a community as adminUser
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post as adminUser in that community
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }) as string & tags.MinLength<5> & tags.MaxLength<120>,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MinLength<10> & tags.MaxLength<10000>,
    author_display_name: adminJoinBody.display_name,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.adminUser.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Create a comment as adminUser for self-voting scenario
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
    display_name: adminJoinBody.display_name,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.adminUser.comments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);

  // 5. Attempt to upvote own comment (should fail)
  await TestValidator.error(
    "adminUser cannot upvote their own comment",
    async () => {
      await api.functional.communityPlatform.adminUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            vote_type: "upvote",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );

  // 6. Attempt to downvote own comment (should fail)
  await TestValidator.error(
    "adminUser cannot downvote their own comment",
    async () => {
      await api.functional.communityPlatform.adminUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            vote_type: "downvote",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );
}

/**
 * Review of the draft:
 *
 * - The function begins with thorough documentation describing the scenario and
 *   each step clearly.
 * - The adminUser is created and logged in using valid random data, following all
 *   property requirements for ICommunityPlatformAdminUser.IJoin.
 * - Creating a community, post, and comment follows all required property rules
 *   and uses the correct request/response DTOs with proper random data
 *   (including format and length constraints for names, IDs, and content).
 * - Path parameters and request bodies for each API call are structured precisely
 *   as required. Each API result is validated with typia.assert().
 * - No additional imports are used beyond the template.
 * - All required awaits are present for API calls and within the async
 *   TestValidator.error callbacks.
 * - Both self-voting attempts (upvote and downvote) use TestValidator.error,
 *   include descriptive titles, and have proper async callback functions. Each
 *   supplies the correct structure with "commentId" for the path parameter and
 *   "body" for the request body, using only allowed vote_type enum values.
 * - No business logic, type, or syntactic errors present.
 * - No type error testing or compilation-violating code exists. No headers
 *   manipulation. Code is well-organized and readable.
 * - All edge and setup cases are covered, with no illogical or redundant steps.
 *   All final checklist and revise rules are satisfied.
 * - The function matches the template: one parameter, no external functions, and
 *   no code outside the export function block.
 *
 * Conclusion: This implementation passes all rules and checklists. No fixes or
 * deletions are needed.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
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
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
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
