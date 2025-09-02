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
 * Validate that admin cannot update a comment with invalid content length.
 *
 * This E2E test covers the following workflow:
 *
 * 1. Register a member to obtain credentials.
 * 2. Member creates a post to attach a comment to.
 * 3. Member creates a comment on the post.
 * 4. Register and log in as admin (role-switch).
 * 5. Attempt to update the comment as admin with too-short content (<2 chars).
 * 6. Validate that a validation error is thrown (TestValidator.error).
 * 7. Attempt to update the comment as admin with too-long content (>2000
 *    chars).
 * 8. Validate that a validation error is thrown.
 *
 * This ensures API-side input validation is properly enforced for
 * administrator updates to comment content, and that business logic
 * prevents out-of-bounds content length edits (under min or over max). It
 * also validates that proper authentication and resource setup (member,
 * post, comment, admin login) is performed prior to privileged admin
 * actions.
 */
export async function test_api_admin_comment_update_invalid_content(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  // 2. Member creates a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 2,
          wordMax: 8,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member creates a comment
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Register admin and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 5. Attempt to update comment as admin with too-short content
  await TestValidator.error(
    "admin update with too-short comment content should fail",
    async () => {
      await api.functional.communityPlatform.admin.comments.update(connection, {
        commentId: comment.id,
        body: { content: "a" } satisfies ICommunityPlatformComment.IUpdate,
      });
    },
  );
  // 6. Attempt to update comment as admin with too-long content
  const overLongContent = "b".repeat(2001);
  await TestValidator.error(
    "admin update with too-long comment content should fail",
    async () => {
      await api.functional.communityPlatform.admin.comments.update(connection, {
        commentId: comment.id,
        body: {
          content: overLongContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      });
    },
  );
}
