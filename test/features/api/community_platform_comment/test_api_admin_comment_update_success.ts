import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test that an admin user can successfully update a member's comment
 * content.
 *
 * This workflow validates admin privilege to edit arbitrary member
 * comments. It assures proper authentication, context switching, and
 * up-to-date audit fields. Verifies that the content and 'edited' flag of
 * the comment are updated and that admin operations do not alter immutable
 * properties such as author or post association.
 *
 * Step-by-step:
 *
 * 1. Register a member (author) and login
 * 2. As member, create a post
 * 3. As member, create a comment on the post
 * 4. Confirm original comment's 'edited' flag is false
 * 5. Register admin and log in as admin
 * 6. As admin, update the comment's content via the privileged endpoint
 * 7. Validate that:
 *
 *    - Content was updated
 *    - 'edited' becomes true
 *    - Updated_at changed
 *    - 'post_id' and 'author_id' remain intact
 */
export async function test_api_admin_comment_update_success(
  connection: api.IConnection,
) {
  // 1. Register a member (author) and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 2. As member, create a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        author_display_name: member.display_name ?? null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. As member, create a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: originalContent,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Confirm original comment 'edited' flag is false
  TestValidator.equals(
    "original member comment is not marked as edited",
    comment.edited,
    false,
  );

  // 5. Register admin and log in as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 6. As admin, update the comment's content
  const newContent = RandomGenerator.paragraph({ sentences: 8 });
  const updated = await api.functional.communityPlatform.admin.comments.update(
    connection,
    {
      commentId: comment.id,
      body: {
        content: newContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    },
  );
  typia.assert(updated);

  // 7a. Validate that content was updated
  TestValidator.equals(
    "comment content updated by admin",
    updated.content,
    newContent,
  );
  // 7b. Validate edited flag is now true
  TestValidator.equals(
    "comment edited flag becomes true after admin update",
    updated.edited,
    true,
  );
  // 7c. Validate updated_at has changed (reflects edit)
  TestValidator.notEquals(
    "updated_at timestamp should change after admin update",
    updated.updated_at,
    comment.updated_at,
  );
  // 7d. Validate post and author association is not changed
  TestValidator.equals(
    "comment's post_id remains unaltered after admin update",
    updated.post_id,
    comment.post_id,
  );
  TestValidator.equals(
    "comment's author_id remains unaltered after admin update",
    updated.author_id,
    comment.author_id,
  );
}
