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
 * Test successful deletion of a comment by an admin.
 *
 * This test validates that an admin user can successfully perform a
 * soft-delete (set deleted_at) on any member's comment, and demonstrates
 * correct role-based access control flows. The test creates both member and
 * admin actors with real registration and authentication steps. It goes
 * through the process of member post/comment creation, admin-driven
 * deletion, and then validates that the targeted comment is marked as
 * deleted. Complete edge-case search/listing validation is deferred due to
 * the absence of corresponding SDK endpoints.
 *
 * Workflow:
 *
 * 1. Register a member, logging in to obtain credentials.
 * 2. Member creates a post.
 * 3. Member creates a comment on that post.
 * 4. Register an admin and log in as the admin.
 * 5. Perform admin-driven deletion (soft-delete) on the member's comment.
 * 6. Role-switch back to member (to simulate further business logic or prepare
 *    for future search/listing validation).
 * 7. Confirm comment was not previously marked deleted, and deletion was
 *    accepted by the API.
 * 8. Note about limitations: Business expectations for search/listing
 *    exclusions are noted, but are not programmatically checked.
 */
export async function test_api_admin_comment_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a member
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

  // 2. (Redundant but explicit) Log in as member (role context)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Member creates post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 12,
        }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member creates comment on own post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.predicate(
    "Created comment is initially not marked as deleted",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // 5. Register and log in as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
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

  // 6. Admin deletes the comment
  await api.functional.communityPlatform.admin.comments.erase(connection, {
    commentId: comment.id,
  });

  // 7. Switch back to member context in case further checks become possible
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // NOTE: No SDK endpoint for comment read/search after deletion
  // Would validate comment.deleted_at is set and comment is absent from listing if available
}
