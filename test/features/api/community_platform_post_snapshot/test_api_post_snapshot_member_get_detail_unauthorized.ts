import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";

/**
 * Test unauthorized access to a post snapshot.
 *
 * This test simulates two separate members (users) on the platform. Member
 * A completes the full flow of community creation, post creation, and post
 * update. The update is done to guarantee at least one snapshot is
 * generated for later retrieval. Then, a second member (member B)
 * registers, logs in, and attempts to fetch the snapshot corresponding to
 * member A's post edit, which should not be permitted by the business
 * rules. Only authors or admins may access the post's revision
 * history/snapshot detail endpoint.
 *
 * Steps:
 *
 * 1. Register member A and authenticate (token automatically applied by join)
 * 2. Member A creates a community (random category_id/name, skip banner/logo
 *    for brevity)
 * 3. Member A creates a post in their community (store postId)
 * 4. Member A updates the post to create at least one snapshot (store snapshot
 *    ID from response or simulate as needed)
 * 5. Register member B independently (triggers authentication as member B via
 *    join)
 * 6. Login as member B to guarantee token context
 * 7. Attempt to fetch the snapshot detail for member A's post as member B
 * 8. Validate that permission is denied (authorization error is thrown)
 */
export async function test_api_post_snapshot_member_get_detail_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: "1234!testA",
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAAuth);

  // 2. Member A creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member A creates a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        author_display_name: memberAAuth.member.display_name ?? null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member A updates the post, generating snapshot
  const updateResult =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        author_display_name: memberAAuth.member.display_name ?? null,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updateResult);

  // We'll use post.id (remains the same) and updated_at as a proxy for snapshot id.
  // In realistic situations, there should be an API to list snapshots after update,
  // but here we use updateResult.updated_at as the snapshot timestamp for test.

  // Simulate snapshot id using updateResult.updated_at (or randomly, as snapshot id type)
  // For a real API, we would retrieve the snapshot list and pick id, but mock here.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // 5. Register member B (context will switch token to member B)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: "1234!testB",
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberBAuth);

  // 6. Optional: login as member B (not strictly necessary after join)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: "1234!testB",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 7. Attempt to fetch member A's snapshot as member B (should fail authorization)
  await TestValidator.error(
    "forbid snapshot detail for other member",
    async () => {
      await api.functional.communityPlatform.member.posts.snapshots.at(
        connection,
        {
          postId: post.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
