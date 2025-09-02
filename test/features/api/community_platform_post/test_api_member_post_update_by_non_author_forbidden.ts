import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a member cannot update a post they did not author (ownership
 * enforcement).
 *
 * Scenario steps:
 *
 * 1. Register (join) first member using /auth/member/join. This establishes
 *    authentication context for member 1.
 * 2. Using member 1 session, create a new post with
 *    /communityPlatform/member/posts. Extract the new post's postId.
 * 3. Register (join) a second member using /auth/member/join. This switches
 *    the authentication context to member 2.
 * 4. Using member 2 session, attempt to update the post (by postId) with
 *    /communityPlatform/member/posts/{postId}. Send some update data (e.g.,
 *    new title/body).
 * 5. Expect API to reject the update with a forbidden/unauthorized error,
 *    confirming that post ownership is enforced at API level.
 * 6. (Negative assertion) If update succeeds or no error is thrown, the test
 *    should fail (as this would be a serious security issue).
 *
 * Additional validation:
 *
 * - Ensures both members are functional and receive JWT tokens.
 * - Ensures the authentication context switching works by checking the
 *   Authorization header each time after join.
 * - After failed update, can re-authenticate as member 1 and confirm post is
 *   unchanged (optional, not required for minimal scenario).
 */
export async function test_api_member_post_update_by_non_author_forbidden(
  connection: api.IConnection,
) {
  // 1. Register (join) member 1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "TestP@ssw0rd1!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Create a post with member 1
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        author_display_name:
          member1.member.display_name ?? member1.member.email,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Register (join) member 2 (switch authentication)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "TestP@ssw0rd2!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 4. Attempt to update post with member 2's session
  await TestValidator.error(
    "non-author cannot update someone else's community post",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 14,
          }),
          author_display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
}
