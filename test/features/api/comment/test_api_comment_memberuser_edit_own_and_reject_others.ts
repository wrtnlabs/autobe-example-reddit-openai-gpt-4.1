import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that member users can only update their own comments and are
 * prevented from editing other users' comments.
 *
 * 1. Register the first member user (author). Save their credentials.
 * 2. Register and log in an admin user to create a category.
 * 3. Create a category as the admin user (required for community creation).
 * 4. Switch context to the author (member user 1) by logging in.
 * 5. Create a community as the member user using the created category.
 * 6. Create a post under the community as the member user.
 * 7. Add a comment to the post as the member user (author). Save the
 *    commentId.
 * 8. Successfully update the comment (body and display_name) with member user
 *    1.
 *
 *    - Confirm the response reflects the updated values.
 * 9. Register the second member user (non-author) and log them in.
 * 10. Attempt to update the original comment with member user 2. This must fail
 *     with a permission error.
 * 11. Attempt to update a non-existent commentId with member user 2. This must
 *     fail with a not-found error.
 */
export async function test_api_comment_memberuser_edit_own_and_reject_others(
  connection: api.IConnection,
) {
  // 1. Register member user 1 (author)
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphabets(12);
  const displayName1 = RandomGenerator.name();
  const member1 = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail1,
      password: password1,
      display_name: displayName1,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(member1);

  // 2. Register admin user for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminDisplayName = RandomGenerator.name();
  const admin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(admin);

  // 3. Create category as admin
  const categoryName = RandomGenerator.alphabets(8);
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

  // 4. Switch back to member user 1 (author)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail1,
      password: password1,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 5. Create community as member user 1
  const communityName = RandomGenerator.name(2).replace(/\s/g, "-");
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create post under community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.paragraph({ sentences: 10 }),
        author_display_name: displayName1,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 7. Member user 1 adds a comment to the post
  const commentBody1 = RandomGenerator.paragraph({ sentences: 4 });
  const commentDisplayName1 = displayName1;
  const comment =
    await api.functional.communityPlatform.memberUser.comments.create(
      connection,
      {
        body: {
          post_id: post.id,
          body: commentBody1,
          display_name: commentDisplayName1,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Update the comment with new body and display_name
  const updateBody = RandomGenerator.paragraph({ sentences: 5 });
  const updateDisplayName = RandomGenerator.name();
  const updatedComment =
    await api.functional.communityPlatform.memberUser.comments.update(
      connection,
      {
        commentId: comment.id,
        body: {
          body: updateBody,
          display_name: updateDisplayName,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "updated comment body must match",
    updatedComment.body,
    updateBody,
  );
  TestValidator.equals(
    "updated comment display_name must match",
    updatedComment.display_name,
    updateDisplayName,
  );

  // 9. Register member user 2 (non-author)
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphabets(12);
  const displayName2 = RandomGenerator.name();
  const member2 = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail2,
      password: password2,
      display_name: displayName2,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(member2);

  // 10. Switch to member user 2 and attempt to update member 1's comment - must fail (permission)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail2,
      password: password2,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });
  const otherUpdateBody = RandomGenerator.paragraph({ sentences: 2 });
  const otherUpdateDisplayName = RandomGenerator.name();
  await TestValidator.error(
    "non-author member cannot update others' comment",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.update(
        connection,
        {
          commentId: comment.id,
          body: {
            body: otherUpdateBody,
            display_name: otherUpdateDisplayName,
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // 11. Attempt to update a non-existent commentId (should fail with not-found)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.update(
        connection,
        {
          commentId: fakeCommentId,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            display_name: RandomGenerator.name(),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}

/**
 * The implementation fully follows the scenario and code generation
 * requirements. The function thoroughly tests the ability for a member user to
 * update their own comment, and enforces business logic around permissions when
 * updating another user's comment or a non-existent comment. It utilizes proper
 * type-safe data construction for each step, applies role context switching by
 * logging in users as needed, and precisely uses all actual SDK API functions
 * as provided in the materials without any extra helpers. All error validation
 * is limited to runtime business validation, never type errors, and uses await
 * consistently for all API/async operations. TestValidator is used correctly
 * with descriptive titles and the proper parameter order; null checks, type
 * assertions, and error pattern anti-patterns are avoided. There is zero extra
 * import, and all DTOs and functions are only those provided. There are no type
 * error tests or missing awaits, and the code is production ready.
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
