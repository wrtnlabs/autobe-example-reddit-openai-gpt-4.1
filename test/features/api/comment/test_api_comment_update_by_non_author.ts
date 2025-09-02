import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test the authorization logic preventing non-authors from updating
 * comments.
 *
 * Scenario:
 *
 * 1. Register member1 as the initial authenticated context.
 * 2. Member1 creates a post in a random community.
 * 3. Member1 comments on their own post.
 * 4. Register member2 (switches authentication context to member2)
 * 5. Member2 attempts to update member1's comment - this should be denied.
 */
export async function test_api_comment_update_by_non_author(
  connection: api.IConnection,
) {
  // 1. Register member1 (author)
  const member1_email = typia.random<string & tags.Format<"email">>();
  const member1_password = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1_email,
      password: member1_password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Member1 creates a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 7,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Member1 creates a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 3,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Register member2, causing authentication context switch to member2
  const member2_email = typia.random<string & tags.Format<"email">>();
  const member2_password = RandomGenerator.alphaNumeric(12);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2_email,
      password: member2_password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 5. Member2 attempts to update member1's comment (should fail)
  await TestValidator.error(
    "Non-author should be denied updating a comment",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 6,
              wordMin: 3,
              wordMax: 12,
            }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}
