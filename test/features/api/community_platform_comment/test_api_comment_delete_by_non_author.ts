import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test comment deletion attempt by a non-author fails.
 *
 * Scenario: Register two members; member1 creates a comment; member2 joins
 * (switch context) and attempts to delete member1's comment, expecting a
 * permission error.
 *
 * Steps:
 *
 * 1. Register member1 (author)
 * 2. Create a post as member1
 * 3. Create a comment as member1
 * 4. Register member2 (switch context)
 * 5. As member2, attempt to delete member1's comment; expect a permission
 *    error (must not allow deletion)
 */
export async function test_api_comment_delete_by_non_author(
  connection: api.IConnection,
) {
  // 1. Register member1 (author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "member1-StrongPass123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(member1Auth);

  // 2. Create a post as member1
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 20,
        }),
        author_display_name: member1Auth.member.display_name,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create a comment as member1
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Register member2 (switch context)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "member2-StrongPass321!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(member2Auth);

  // 5. As member2, attempt to delete member1's comment; expect a permission error
  await TestValidator.error(
    "Non-author deletion attempt is forbidden",
    async () => {
      await api.functional.communityPlatform.member.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );
}
