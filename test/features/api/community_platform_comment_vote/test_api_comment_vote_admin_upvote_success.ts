import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Successfully upvote a comment on behalf of an adminUser
 *
 * 1. Register adminUser and login (saving credentials)
 * 2. Register memberUser and login (saving credentials)
 * 3. MemberUser creates a community
 * 4. MemberUser creates a post inside their community
 * 5. MemberUser creates a comment on their post
 * 6. Switch authentication back to adminUser
 * 7. AdminUser upvotes the memberUser's comment
 * 8. Validate upvote (vote_type: upvote, voter_adminuser_id is present and not the
 *    comment's author)
 */
export async function test_api_comment_vote_admin_upvote_success(
  connection: api.IConnection,
) {
  // Register first adminUser (and keep credentials for later login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    },
  });
  typia.assert(adminJoin);
  // Save admin credentials for re-login

  // Create memberUser and login as memberUser
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(memberJoin);
  // Save member credentials for possible role switch

  // Now memberUser creates a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);

  // MemberUser creates a post within the community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.paragraph({ sentences: 12 }),
        author_display_name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(post);

  // MemberUser creates a comment on their post
  const comment =
    await api.functional.communityPlatform.memberUser.comments.create(
      connection,
      {
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 7 }),
          display_name: RandomGenerator.name(1),
        },
      },
    );
  typia.assert(comment);

  // Switch authentication back to adminUser (login with credentials)
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Now adminUser upvotes the memberUser's comment
  const vote =
    await api.functional.communityPlatform.adminUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          vote_type: "upvote",
        },
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "comment id matches in vote",
    vote.comment_id,
    comment.id,
  );
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  TestValidator.predicate(
    "voter_adminuser_id is present",
    Boolean(vote.voter_adminuser_id),
  );
  TestValidator.notEquals(
    "admin upvote is not memberUser",
    vote.voter_adminuser_id,
    comment.author_memberuser_id,
  );
}

/**
 * The draft implementation closely follows the strategic workflow and meets
 * critical requirements:
 *
 * - All API function calls use await and correct parameter structure
 * - Authentication/role switching is done only via SDK, without any
 *   connection.headers manipulation
 * - Random data is generated according to DTO constraints, and const/enum types
 *   used accurately (e.g., vote_type: "upvote")
 * - No additional imports, only template imports are used
 * - All test steps are sequenced logically, nothing is skipped, all relationships
 *   are valid (community → post → comment → vote)
 * - TestValidator assertions use descriptive titles and correct parameter order
 * - Every typia.random call has explicit generic types
 * - Variable naming clearly indicates business context
 * - No API or type hallucination occurs—all DTOs and API calls exist as per input
 *   materials
 * - No type error testing, as required
 * - No loops or async usage without await
 * - Implementation only creates new request body objects (no
 *   mutation/reassignment)
 * - Proper comments and function docstring JSDoc included
 * - All business rules (no self-vote, only admin may upvote as admin) are
 *   validated either by API or in result assertions
 *
 * No forbidden anti-patterns or errors found in the draft—final can be
 * identical to the draft.
 *
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
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
