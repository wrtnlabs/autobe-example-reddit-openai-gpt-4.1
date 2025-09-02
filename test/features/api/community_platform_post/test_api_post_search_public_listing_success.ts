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
 * E2E test for public post search/listing endpoint.
 *
 * Scenario:
 *
 * 1. Register a member for setup operations
 * 2. As member, create 2 communities
 * 3. As member, create 2 posts in each community (total 4 posts)
 * 4. List all posts (unauthenticated, default paging)
 * 5. Filter by community (public search for posts in one community)
 * 6. Search by keyword from post's title
 * 7. Validate paging with limit=1 and check pagination meta
 * 8. Assert sorting by created_at (asc/desc) and sort_by=top (function call
 *    valid)
 *
 * Validates:
 *
 * - Unauthenticated access lists/searches posts
 * - All setup content is discoverable via API
 * - Filters/search/pagination/sorting all operate as per business rules
 * - All results match expectations, using typia and TestValidator strictly
 */
export async function test_api_post_search_public_listing_success(
  connection: api.IConnection,
) {
  // 1. Register a new member (for content creation)
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  };
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);

  // 2. Create two communities
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const communities = await ArrayUtil.asyncRepeat(2, async (ci) => {
    const communityInput: ICommunityPlatformCommunity.ICreate = {
      category_id: categoryId,
      name: `${RandomGenerator.alphabets(8)}_${ci}`,
      display_title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    };
    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        { body: communityInput },
      );
    typia.assert(community);
    return community;
  });

  // 3. Create two posts per community
  const posts: ICommunityPlatformPost[] = [];
  for (const community of communities) {
    for (let pi = 0; pi < 2; ++pi) {
      const title = RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 10,
      });
      const body = RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 16,
        wordMin: 3,
        wordMax: 8,
      });
      const postInput: ICommunityPlatformPost.ICreate = {
        community_platform_community_id: community.id,
        title,
        body,
        author_display_name: RandomGenerator.name(),
      };
      const post = await api.functional.communityPlatform.member.posts.create(
        connection,
        { body: postInput },
      );
      typia.assert(post);
      posts.push(post);
    }
  }

  // Prepare public connection (no authentication for search)
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 4. List all posts (public, default paging)
  const allList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    { body: {} satisfies ICommunityPlatformPost.IRequest },
  );
  typia.assert(allList);
  // Validate created post IDs are in result
  for (const post of posts) {
    TestValidator.predicate(
      `Post ${post.id} present in all-posts public search`,
      allList.data.some((got) => got.id === post.id),
    );
  }
  TestValidator.predicate(
    "Returned count (all) >= total created posts",
    allList.data.length >= posts.length,
  );

  // 5. Filter posts by first community
  const filterCommunity = communities[0];
  const filterList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    {
      body: {
        community_platform_community_id: filterCommunity.id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(filterList);
  const expectPosts = posts.filter(
    (p) => p.community_platform_community_id === filterCommunity.id,
  );
  for (const post of expectPosts) {
    TestValidator.predicate(
      `Community filter - post ${post.id} in result`,
      filterList.data.some((got) => got.id === post.id),
    );
  }
  for (const got of filterList.data) {
    TestValidator.equals(
      `Community filter - post's community matches`,
      got.community_platform_community_id,
      filterCommunity.id,
    );
  }

  // 6. Keyword search (substring from one post's title)
  const keywordPost = posts[0];
  const keyword = RandomGenerator.substring(keywordPost.title);
  const searchList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    { body: { query: keyword } satisfies ICommunityPlatformPost.IRequest },
  );
  typia.assert(searchList);
  TestValidator.predicate(
    `Search with keyword='${keyword}' returns seed post`,
    searchList.data.some((got) => got.id === keywordPost.id),
  );
  for (const got of searchList.data) {
    TestValidator.predicate(
      `Keyword search - returned title contains keyword`,
      got.title.includes(keyword),
    );
  }

  // 7. Validate paging (limit=1)
  const pageList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    { body: { limit: 1 } satisfies ICommunityPlatformPost.IRequest },
  );
  typia.assert(pageList);
  TestValidator.equals(
    "Pagination: page size (data.length) matches limit",
    pageList.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination: meta object 'limit' matches requested limit",
    pageList.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "Pagination: total records >= posts created",
    pageList.pagination.records >= posts.length,
  );

  // 8. Validate sorting by created_at and top (asc/desc)
  // asc
  const ascList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(ascList);
  for (let i = 1; i < ascList.data.length; ++i) {
    TestValidator.predicate(
      "created_at ascending sort order",
      ascList.data[i - 1].created_at <= ascList.data[i].created_at,
    );
  }
  // desc
  const descList = await api.functional.communityPlatform.posts.index(
    publicConnection,
    {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(descList);
  for (let i = 1; i < descList.data.length; ++i) {
    TestValidator.predicate(
      "created_at descending sort order",
      descList.data[i - 1].created_at >= descList.data[i].created_at,
    );
  }
  // sort_by=top must be accepted by API
  const topDesc = await api.functional.communityPlatform.posts.index(
    publicConnection,
    {
      body: {
        sort_by: "top",
        order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(topDesc);
  TestValidator.predicate(
    "sort_by='top' does not throw error",
    topDesc.data.length >= 0,
  );
}
