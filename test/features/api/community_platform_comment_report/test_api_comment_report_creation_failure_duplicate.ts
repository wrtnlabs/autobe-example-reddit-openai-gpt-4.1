import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Test that a member cannot file multiple reports for the same comment
 * (duplicate report prevention).
 *
 * This test ensures that the API enforces the business rule: a member can
 * file only one report per comment.
 *
 * Test workflow:
 *
 * 1. Register Member 1 and create authentication.
 * 2. Member 1 creates a community for comment context.
 * 3. Member 1 creates a post inside the community.
 * 4. Member 1 creates a comment under the post (target for report).
 * 5. Register Member 2 (the reporter) and switch authentication context to
 *    Member 2.
 * 6. Member 2 successfully reports the comment (this should succeed).
 * 7. Member 2 attempts to report the same comment again (this should fail with
 *    a business error: duplicate not allowed).
 *
 * Throughout the test, all returned values are type-asserted, and error
 * scenarios are validated using TestValidator.error.
 */
export async function test_api_comment_report_creation_failure_duplicate(
  connection: api.IConnection,
) {
  // 1. Register Member 1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Member 1 creates a community (logo_uri, banner_uri omitted because type is string | undefined, not nullable)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member 1 creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member 1 creates a comment under the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 9,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Register Member 2, switch to Member 2's authentication context
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 6. Member 2 reports the comment (first attempt - positive case)
  const reportInput = {
    report_reason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 16,
    }),
    status: "pending",
  } satisfies ICommunityPlatformCommentReport.ICreate;
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportInput,
      },
    );
  typia.assert(report);

  // 7. Member 2 attempts duplicate report on the same comment (negative case)
  await TestValidator.error(
    "duplicate comment report by same member should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: reportInput,
        },
      );
    },
  );
}
