import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that soft-deleted posts are not listed in public search/feed
 * results.
 *
 * Business context: Soft-deletes (setting deleted_at on a post) are used to
 * allow audit/compliance, but such posts should never be returned in any
 * public listing or search result from /communityPlatform/posts (PATCH).
 *
 * Step-by-step process:
 *
 * 1. Register a new member account (get login for subsequent APIs).
 * 2. Create a community as this member (where the test post will reside).
 * 3. Create a new post in the community as this member.
 * 4. Soft-delete the post via member's delete endpoint (sets deleted_at, not
 *    physical removal).
 * 5. Search for/list posts using the PATCH /communityPlatform/posts endpoint,
 *    filtered to the community or by author as needed.
 * 6. Validate that the soft-deleted post is NOT present in any result (data[]
 *    does not include the post.id).
 */
export async function test_api_post_search_deleted_post_not_listed(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPw1234";
  const memberReg = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberReg);
  const member = memberReg.member;

  // 2. Create community (needs valid category id, so random uuid for this test)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10) + RandomGenerator.alphabets(5),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post as member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        author_display_name: RandomGenerator.name(1),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Soft-delete post (sets deleted_at)
  await api.functional.communityPlatform.member.posts.erase(connection, {
    postId: post.id,
  });

  // 5. List/search posts in community
  const listResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(listResult);

  // 6. Validate that deleted post is NOT present
  TestValidator.predicate(
    "soft-deleted post is not returned in search/feed results",
    listResult.data.every((summary) => summary.id !== post.id),
  );
}
