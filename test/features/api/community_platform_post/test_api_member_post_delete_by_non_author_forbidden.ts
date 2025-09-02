import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a member cannot delete a post they did not author (should be
 * forbidden)
 *
 * Business context: In a community platform, only the author of a post (or
 * an admin) is allowed to delete it. This scenario verifies that if a
 * different authenticated member attempts to delete a post they did not
 * author, the system enforces proper authorization by rejecting the
 * request. This ensures security, ownership, and integrity rules for
 * user-generated content.
 *
 * Step-by-step process:
 *
 * 1. Register the first member (who will author the post).
 * 2. Have the first member create a post in a (randomly generated) community.
 *
 *    - Note: No community creation API exists, so a random
 *         community_platform_community_id is used.
 * 3. Register a second member (switch authentication context).
 * 4. Attempt to delete the post as the non-author (should be forbidden).
 * 5. (No API to retrieve post, so explicit undeleted assertion omitted.)
 */
export async function test_api_member_post_delete_by_non_author_forbidden(
  connection: api.IConnection,
) {
  // 1. First member registration
  const emailA = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: emailA,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);

  // 2. First member creates a post (in random community)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        author_display_name: memberA.member.display_name,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Register second member (switch context)
  const emailB = typia.random<string & tags.Format<"email">>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: emailB,
      password: "TestPassword456!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);

  // 4. Second member attempts to delete first member's post (should be forbidden)
  await TestValidator.error(
    "non-author cannot delete someone else's post (should be forbidden)",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: post.id,
      });
    },
  );

  // 5. (Optional) No post retrieval API, cannot re-verify undeleted status.
}
