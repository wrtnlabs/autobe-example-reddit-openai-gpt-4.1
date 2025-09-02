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
 * Verify that an admin can query the complete version history (snapshots)
 * of any post through the admin snapshot endpoint.
 *
 * Business context: Moderators and administrators often need to audit the
 * full editing history of user-generated content, regardless of original
 * ownership. This test validates that the patch
 * /communityPlatform/admin/posts/{postId}/snapshots endpoint returns all
 * post version snapshots to an authenticated admin, correctly reflecting
 * both initial creation and all edits.
 *
 * Test steps:
 *
 * 1. Register an administrator user (with unique random credentials), claim
 *    session.
 * 2. Register a regular (member) user, claim session for member actions.
 * 3. The member creates a new community (with required random category_id and
 *    required fields).
 * 4. The member creates a post in that community, capturing the original
 *    postId.
 * 5. The member updates the post multiple times (e.g., 2–3), each with
 *    different titles and bodies, creating multiple edit snapshots.
 * 6. Switch session/auth context to the admin user via login.
 * 7. As admin, invoke the PATCH
 *    /communityPlatform/admin/posts/{postId}/snapshots endpoint for the
 *    member's post, with default or explicit pagination/filter params.
 * 8. Validate that ALL snapshots (initial + N updates) are returned. Confirm
 *    the count and content, ensuring order is expected (e.g., by
 *    created_at).
 * 9. Confirm that post edit history is accessible to admin users regardless of
 *    post authorship.
 */
export async function test_api_post_snapshot_admin_query_success(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // Switch session to member (if not already)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Member creates a new community (logo_uri and banner_uri are omitted unless present as strings)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 12,
          }),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Member creates a post
  const initialTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 8,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: initialTitle,
        body: initialBody,
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Member updates the post multiple times
  const updateCount = 3;
  const snapshots: { title: string; body: string }[] = [
    { title: initialTitle, body: initialBody },
  ];
  let lastPost = post;
  for (let i = 1; i <= updateCount; ++i) {
    const newTitle = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 6,
      wordMax: 16,
    });
    const newBody = RandomGenerator.content({
      paragraphs: i + 1,
      sentenceMin: 9,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    });
    lastPost = await api.functional.communityPlatform.member.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          title: newTitle,
          body: newBody,
          author_display_name: RandomGenerator.name(),
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
    typia.assert(lastPost);
    snapshots.push({ title: newTitle, body: newBody });
  }

  // 6. Switch back to admin session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 7. Admin queries post snapshots
  const res =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          order: "asc",
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(res);
  TestValidator.equals(
    "admin should receive all post snapshots (creation + updates)",
    res.data.length,
    snapshots.length,
  );
  // Optionally validate that snapshot titles/bodies appear in order
  for (let i = 0; i < snapshots.length; ++i) {
    TestValidator.equals(
      `snapshot #${i} title`,
      res.data[i].title,
      snapshots[i].title,
    );
    TestValidator.equals(
      `snapshot #${i} body`,
      res.data[i].body,
      snapshots[i].body,
    );
  }
  // 8/9. Confirm admin sees edit history for post not owned
}
