import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Test that updating a comment report as a non-admin user fails
 * authorization.
 *
 * This function validates that only admins can update comment reports via
 * the admin API endpoint. All prerequisite resources (members, community,
 * post, comment, report, and admin) are established. The test attempts to
 * update the report using a non-admin session and verifies that the API
 * returns an authorization error (401/403), confirming the enforcement of
 * admin-only access control.
 *
 * Steps:
 *
 * 1. Register member1 (for comment authoring)
 * 2. Create a community (member1)
 * 3. Create a post in the community (member1)
 * 4. Post a comment on the post (member1)
 * 5. Register member2 (for reporting)
 * 6. Login as member2
 * 7. Report the comment (member2)
 * 8. Register an admin (do not login as admin yet)
 * 9. Switch context to non-admin/unauthenticated
 * 10. Attempt an admin comment-report update operation
 * 11. Validate that the operation returns a forbidden/unauthorized error.
 */
export async function test_api_admin_comment_report_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register first member (this user will author the comment)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "TestPw1!";
  await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 2. Create community as member1
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.name(2),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          // logo_uri and banner_uri omitted as they are string | undefined
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post in the community as member1
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        author_display_name: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Author a comment on the post as member1
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Register second member (reporting actor)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "TestPw2!";
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 6. Login as member2
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 7. Report the comment as member2
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 6 }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 8. Register an admin (but do NOT log in as admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminTest1!";
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });

  // 9. Switch context to unauthorized (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 10. Attempt the admin update operation as unauthorized
  await TestValidator.error(
    "unauthorized user cannot update comment report via admin API",
    async () => {
      await api.functional.communityPlatform.admin.comments.reports.update(
        unauthConn,
        {
          commentId: comment.id,
          reportId: report.id,
          body: {
            status: "resolved",
            resolution: "Handled in test.",
          } satisfies ICommunityPlatformCommentReport.IUpdate,
        },
      );
    },
  );
}
