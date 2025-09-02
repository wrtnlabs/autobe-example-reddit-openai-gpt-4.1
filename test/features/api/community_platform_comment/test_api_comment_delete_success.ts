import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Validate that a member can successfully soft-delete their own comment on
 * a post.
 *
 * This test executes a full workflow:
 *
 * 1. Register and authenticate a new member.
 * 2. Create a post as the new member in a (random) community.
 * 3. Create a comment (top-level) on the post.
 * 4. Delete (soft delete) the comment as the original author.
 * 5. Confirm the operation succeeds (void) and that the comment is no longer
 *    available for user-level queries (edge checks omitted as comment
 *    detail API is not provided).
 */
export async function test_api_comment_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new community platform member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword1!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  const member = memberAuth.member;

  // 2. Create a post as this member (pick random community_platform_community_id)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 3,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create a comment to this post (top-level, no parent)
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2, wordMin: 4 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Delete (soft delete) the comment as the author
  await api.functional.communityPlatform.member.comments.erase(connection, {
    commentId: comment.id,
  });
  // The 'erase' endpoint just returns void and, as per scenario and API docs, sets deleted_at.

  // 5. Since the detail API is not provided, cannot directly verify the deleted status beyond the void response. In a comprehensive suite, one would assert subsequent list/results exclude the deleted comment.
}
