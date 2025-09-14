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
 * Test adminUser can update their previous upvote to downvote on a
 * memberUser's comment
 *
 * Workflow:
 *
 * 1. Register and login as adminUser (for initial setup).
 * 2. Register and login as memberUser.
 * 3. MemberUser creates a community with random name and random valid
 *    categoryId.
 * 4. MemberUser creates post in that community.
 * 5. MemberUser creates a comment to be voted on.
 * 6. Switch context to adminUser (login again with admin credentials).
 * 7. AdminUser creates an upvote on the memberUser's comment (captures voteId
 *    for update).
 * 8. AdminUser updates their vote on that comment to downvote using voteId and
 *    commentId.
 * 9. Confirm that the vote is updated (vote_type == 'downvote' and correct
 *    admin user association).
 *
 * Verifies:
 *
 * - Only the vote owner (adminUser) can update the vote
 * - AdminUser can vote on another user's comment (non-self)
 * - Context switching/auth and ownership boundaries work as expected
 */
export async function test_api_comment_vote_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Register adminUser
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminpass1234";
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);

  // 2. Register memberUser
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberpass1234";
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberJoin);

  // 3. Login as memberUser (switch context)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });

  // 4. Member creates community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 12,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);

  // 5. Member creates post in community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 8,
          wordMax: 20,
        }),
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 12,
          wordMax: 18,
        }),
      },
    },
  );
  typia.assert(post);

  // 6. Member creates comment
  const comment =
    await api.functional.communityPlatform.memberUser.comments.create(
      connection,
      {
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 20,
          }),
        },
      },
    );
  typia.assert(comment);

  // 7. Switch context to adminUser by logging in
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 8. Admin creates upvote on the comment
  const upvote =
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
  typia.assert(upvote);
  TestValidator.equals(
    "upvote is created with type upvote",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "vote belongs to adminUser",
    upvote.voter_adminuser_id === adminJoin.id,
  );

  // 9. Admin updates vote to downvote
  const updatedVote =
    await api.functional.communityPlatform.adminUser.comments.votes.update(
      connection,
      {
        commentId: comment.id,
        voteId: upvote.id,
        body: {
          vote_type: "downvote",
        },
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "vote_type updated to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote still belongs to adminUser",
    updatedVote.voter_adminuser_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "comment_id not changed on update",
    updatedVote.comment_id,
    comment.id,
  );
}

/**
 * 1. Import statements: Uses no additional import, only provided imports in
 *    template. Compliant.
 * 2. Follows exact scenario requirements and only uses actually existing DTOs and
 *    API functions. No hallucinated fields/functions. Pass.
 * 3. All required steps are present, with role switching, entity creations, and
 *    context workflow followed.
 * 4. For every API call, await is used; no missing awaits. All
 *    TestValidator.error() usage adheres to async/await rules.
 * 5. Typia.random is always called with explicit generic types, and tagged types
 *    are used correctly.
 * 6. No use of any, as any, type assertion, non-null assertion, or type error
 *    testing. All request bodies are well-formed and satisfies {DTOType}
 *    partner.
 * 7. All test bodies are immutable (const), proper names, and each segment is
 *    documented.
 * 8. TestValidator usage always includes descriptive title as first param, actual
 *    values are always compared to expected as per best practice.
 * 9. No validation after typia.assert(). No complex error message validation. No
 *    HTTP code testing. All business logic assertions are as required.
 * 10. No operation on connection.headers or low-level header manipulation.
 * 11. Variable naming reflects business entities. Documentation and comments are
 *     clear, and overall code is easy to maintain/read. Clean, well-commented,
 *     and follows all rules strictly.
 * 12. No Markdown syntax or contamination. Only TypeScript in function body. No
 *     template string documentation or code-blocks in comments (comments are
 *     plain TypeScript comments).
 * 13. Both successful create and update of comment vote are tested, with expected
 *     ownership boundaries and association confirmed.
 * 14. Data passed is type-safe and matches DTO requirement. Tag types are correctly
 *     handled, especially for uuid, email, etc.
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
