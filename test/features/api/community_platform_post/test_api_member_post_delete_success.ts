import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful soft deletion of a community post by its author (member).
 *
 * This test validates the complete workflow for a member authoring a
 * community post and then soft deleting it, confirming that the deletion
 * sets the proper deleted_at timestamp and that the post would be
 * effectively hidden from feeds.
 *
 * Steps:
 *
 * 1. Register a new member using unique email and valid password.
 * 2. As the member, create a post with a random valid title/body and a random
 *    community ID for test isolation.
 * 3. Call /communityPlatform/member/posts/{postId} (delete) to soft delete the
 *    post. This should be authored by the logged in member.
 * 4. Since there is no fetch/read endpoint for the deleted post, only check
 *    that the API call for delete completes without error.
 * 5. If in future a list/search/feed endpoint is available, assert the post
 *    does not appear in results after deletion.
 */
export async function test_api_member_post_delete_success(
  connection: api.IConnection,
) {
  // 1. Register test member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "defaultT3stPW9";
  const memberDisplayName = RandomGenerator.name(2);
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "member email matches",
    joinResult.member.email,
    memberEmail,
  );
  TestValidator.predicate(
    "issued access token not empty",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );

  // 2. Member creates a new post in a random test community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: postTitle,
        body: postBody,
        author_display_name: memberDisplayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author matches joined member",
    post.community_platform_member_id,
    joinResult.member.id,
  );
  TestValidator.equals("post not deleted on creation", post.deleted_at, null);

  // 3. As author, soft delete the post
  await api.functional.communityPlatform.member.posts.erase(connection, {
    postId: post.id,
  });
  // No response body for erase; cannot verify deleted_at field after deletion due to missing fetch/read endpoint.
  // If a feed/search endpoint is provided in the future, extend this test to confirm the post is absent after deletion.
}
