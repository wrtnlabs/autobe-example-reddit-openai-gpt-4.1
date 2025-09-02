import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an admin user can successfully retrieve the detailed
 * contents of any post snapshot (version) for moderation/audit purposes.
 *
 * This test simulates the following multi-role workflow:
 *
 * 1. Register and authorize an admin.
 * 2. Register a member and log in as that member.
 * 3. Member creates a new community (logo_uri and banner_uri omitted because
 *    only string or undefined allowed per schema)
 * 4. Member creates a post in the community.
 * 5. Member edits (updates) the post multiple times, each time modifying title
 *    or body — this generates multiple snapshots.
 * 6. Switch context back to admin via admin login.
 * 7. As admin, list all snapshots for the post and select a snapshotId
 * 8. As admin, retrieve the details of the selected snapshot using the admin
 *    snapshot detail endpoint.
 * 9. Assert that the snapshot details (title, body, author_display_name,
 *    created_at) correspond to the expected edited state captured in step
 *    5.
 *
 * This scenario ensures that the admin interface allows full post history
 * review for moderation, and validates correct linkage and detail payload
 * for post versioning.
 */
export async function test_api_post_snapshot_admin_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authorize admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test12345!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Register a member and log in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "User54321!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 3. Member creates a new community (logo_uri and banner_uri omitted)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          // logo_uri and banner_uri omitted
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Member creates a post in the new community
  const originalTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 6,
    wordMax: 12,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: originalTitle,
        body: originalBody,
        author_display_name: RandomGenerator.name(1),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Member edits (updates) the post to generate snapshots
  let lastTitle = post.title;
  let lastBody = post.body;
  let lastAuthorDisplayName = post.author_display_name;
  for (let i = 0; i < 2; ++i) {
    lastTitle = RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    });
    lastBody = RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 12,
    });
    lastAuthorDisplayName = RandomGenerator.name(1);
    const updated = await api.functional.communityPlatform.member.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          title: lastTitle,
          body: lastBody,
          author_display_name: lastAuthorDisplayName,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
    typia.assert(updated);
  }

  // 6. Switch back to admin via admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 7. As admin, list all snapshots for the post and select a snapshotId
  const snapshotPage =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          order: "desc",
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "at least one snapshot must exist",
    snapshotPage.data.length > 0,
  );
  const targetSnapshot = snapshotPage.data[0];
  typia.assert(targetSnapshot);

  // 8. Retrieve the details of the selected snapshot using the admin snapshot detail endpoint
  const detail =
    await api.functional.communityPlatform.admin.posts.snapshots.at(
      connection,
      {
        postId: post.id,
        snapshotId: targetSnapshot.id,
      },
    );
  typia.assert(detail);

  // 9. Assert that the snapshot details match the expected edited state (since edits were made above, snapshotPage.data[0] should correspond to the last edit)
  const { title, body, author_display_name } = detail;
  TestValidator.equals(
    "snapshot title must match latest edit",
    title,
    lastTitle,
  );
  TestValidator.equals("snapshot body must match latest edit", body, lastBody);
  TestValidator.equals(
    "snapshot author_display_name must match latest edit",
    author_display_name,
    lastAuthorDisplayName,
  );
}
