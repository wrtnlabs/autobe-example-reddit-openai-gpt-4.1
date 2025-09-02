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
 * Validate that a post author can retrieve a specific revision snapshot's
 * detail.
 *
 * This test covers the complete business scenario:
 *
 * 1. Register and authenticate a new member for the 'member' role.
 * 2. Create a new community as the member (prerequisite for posts).
 * 3. Create an initial post in the newly created community.
 * 4. Update the post at least once to generate a revision snapshot.
 * 5. Fetch the list of snapshots for the updated post.
 * 6. Select a valid snapshotId from the list, and retrieve its detail.
 * 7. Validate the retrieved snapshot detail matches expected historic data.
 */
export async function test_api_post_snapshot_member_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a member (authentication)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const member = joinResult.member;

  // 2. Create a new community (must belong to a category)
  // We must generate a random category UUID, as categories are not creatable here.
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          display_title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create the initial post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 18,
          wordMin: 5,
          wordMax: 10,
        }),
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Update the post to generate a snapshot
  const newTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const newBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        title: newTitle,
        body: newBody,
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 5. Retrieve the snapshot list
  const snapshotListPage =
    await api.functional.communityPlatform.member.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          order: "desc",
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotListPage);
  TestValidator.predicate(
    "At least 2 snapshots must exist for a post after update",
    snapshotListPage.data.length >= 2,
  );

  // 6. Select a snapshot ID (e.g., the latest snapshot)
  const latestSnapshot = snapshotListPage.data[0];
  typia.assert(latestSnapshot);

  // 7. Retrieve the specific snapshot detail
  const snapshotDetail =
    await api.functional.communityPlatform.member.posts.snapshots.at(
      connection,
      {
        postId: post.id,
        snapshotId: latestSnapshot.id,
      },
    );
  typia.assert(snapshotDetail);

  // 8. Validate the detail matches the information in the snapshot list
  TestValidator.equals(
    "Snapshot detail matches snapshot list entry",
    snapshotDetail,
    latestSnapshot,
  );
}
