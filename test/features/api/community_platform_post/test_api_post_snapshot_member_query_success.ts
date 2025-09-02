import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that a post author (member) can successfully query the version
 * history (snapshots) of their own post.
 *
 * This test will:
 *
 * 1. Register a member account and obtain an authenticated session.
 * 2. Create a community as the newly registered member (required for post
 *    context).
 * 3. Create a post in the created community.
 * 4. Update the post multiple times to generate several snapshots (versions).
 * 5. Call the snapshots (history) endpoint as the same member to retrieve post
 *    version history.
 * 6. Assert that:
 *
 *    - All versions are returned in the snapshot list
 *    - Snapshots contain correct version data (title/body changes in each
 *         revision)
 *    - Pagination works as intended (if more edits than page limit, can
 *         paginate)
 *
 * Step-by-step comments and data assertions will reflect business logic and
 * success criteria.
 */
export async function test_api_post_snapshot_member_query_success(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  };
  const joinResult = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(joinResult);
  const member = joinResult.member;

  // 2. Create a community as the member
  const communityInput: ICommunityPlatformCommunity.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    // logo_uri and banner_uri are omitted if not provided, as their types are string | undefined.
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Create an initial post
  const initialPostInput: ICommunityPlatformPost.ICreate = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
    author_display_name: RandomGenerator.name(),
  };
  const initialPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: initialPostInput,
    });
  typia.assert(initialPost);

  // 4. Update the post several times to produce multiple snapshots
  const versionCount = 4;
  const updateVersions: {
    title?: string;
    body?: string;
    author_display_name?: string | null;
  }[] = ArrayUtil.repeat(versionCount, (idx) => {
    return {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 15,
      }),
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 8,
        sentenceMax: 20,
      }),
      author_display_name: RandomGenerator.name(),
    };
  });
  // Keep track of all versions (starting with initial as version 1)
  const expectedSnapshots: {
    title: string;
    body: string;
    author_display_name: string | null;
  }[] = [
    {
      title: initialPostInput.title,
      body: initialPostInput.body,
      author_display_name: initialPostInput.author_display_name ?? null,
    },
  ];

  for (const updateInput of updateVersions) {
    const updated = await api.functional.communityPlatform.member.posts.update(
      connection,
      {
        postId: initialPost.id,
        body: updateInput satisfies ICommunityPlatformPost.IUpdate,
      },
    );
    typia.assert(updated);
    expectedSnapshots.push({
      title:
        updateInput.title ??
        expectedSnapshots[expectedSnapshots.length - 1].title,
      body:
        updateInput.body ??
        expectedSnapshots[expectedSnapshots.length - 1].body,
      author_display_name:
        updateInput.author_display_name ??
        expectedSnapshots[expectedSnapshots.length - 1].author_display_name,
    });
  }

  // 5. Query post snapshots as this member (author)
  // Use a small limit to test pagination as well
  const pageLimit = 2;
  const totalVersions = versionCount + 1; // initial + updates
  let collectedSnapshots: ICommunityPlatformPostSnapshot[] = [];
  let page = 1;

  while (collectedSnapshots.length < totalVersions) {
    const snapshotsResponse =
      await api.functional.communityPlatform.member.posts.snapshots.index(
        connection,
        {
          postId: initialPost.id,
          body: {
            page,
            limit: pageLimit,
            order: "asc",
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsResponse);
    TestValidator.equals(
      `pagination current page matches requested (page ${page})`,
      snapshotsResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination page limit matches requested`,
      snapshotsResponse.pagination.limit,
      pageLimit,
    );
    collectedSnapshots = collectedSnapshots.concat(snapshotsResponse.data);
    if (
      snapshotsResponse.pagination.current >= snapshotsResponse.pagination.pages
    )
      break;
    page++;
  }

  // 6. Assert that we got all expected snapshots in historical order
  TestValidator.equals(
    "total snapshot count matches version count",
    collectedSnapshots.length,
    totalVersions,
  );
  for (let i = 0; i < totalVersions; ++i) {
    const got = collectedSnapshots[i];
    const expected = expectedSnapshots[i];
    TestValidator.equals(`snapshot #${i + 1} title`, got.title, expected.title);
    TestValidator.equals(`snapshot #${i + 1} body`, got.body, expected.body);
    TestValidator.equals(
      `snapshot #${i + 1} display_name`,
      got.author_display_name ?? null,
      expected.author_display_name ?? null,
    );
    TestValidator.equals(
      `snapshot #${i + 1} member (author)`,
      got.community_platform_member_id,
      member.id,
    );
    TestValidator.equals(
      `snapshot #${i + 1} post ID`,
      got.community_platform_post_id,
      initialPost.id,
    );
  }
}
