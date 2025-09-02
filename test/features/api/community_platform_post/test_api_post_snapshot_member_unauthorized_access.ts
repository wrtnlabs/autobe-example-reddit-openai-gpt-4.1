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
 * Test that an unauthorized member cannot view the version history
 * (snapshots) for a post they do not own.
 *
 * This test validates access controls on post snapshot history, ensuring
 * privacy and correct enforcement of author-only access rules.
 *
 * Workflow:
 *
 * 1. Register member A
 * 2. Member A creates a community
 * 3. Member A creates a post in the community
 * 4. Register member B (switches context to B)
 * 5. Explicitly login as member B to ensure authentication context
 * 6. Attempt to list post snapshots of member A's post as member B — this
 *    should fail with an authorization error
 */
export async function test_api_post_snapshot_member_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Member A registration and login
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "TestPassword123!";
  const memberAJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAJoin);
  const memberA = memberAJoin.member;

  // 2. Member A creates a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          // Do NOT provide logo_uri or banner_uri (omit, do not set null)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member A creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 10,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Register member B (also logs in as member B)
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "TestPassword456!";
  const memberBJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberBJoin);

  // 5. Explicitly login as member B to ensure context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Attempt to list post snapshots for member A's post as member B (should fail with authorization error)
  await TestValidator.error(
    "Unauthorized member cannot access another's post snapshot history",
    async () => {
      await api.functional.communityPlatform.member.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: {},
        },
      );
    },
  );
}
