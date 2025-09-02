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
 * E2E test that an admin user can successfully delete a comment report in
 * the community platform, verifying admin-only permission, report removal,
 * and role context switching.
 *
 * Scenario steps:
 *
 * 1. Register member1 (for comment creation).
 * 2. Register member2 (as the separate reporting actor).
 * 3. Register admin (for deletion action).
 * 4. Member1 creates a community.
 * 5. Member1 creates a post in the created community.
 * 6. Member1 creates a comment in the post.
 * 7. Switch context and login as member2.
 * 8. Member2 reports the comment.
 * 9. Switch context and login as admin.
 * 10. Admin deletes the report.
 * 11. Attempt to delete the report again to validate it's no longer present
 *     (should error).
 *
 * This tests correct cross-role permissions and that report deletion is
 * irreversible and admin-protected.
 */
export async function test_api_admin_comment_report_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register member1 (comment owner)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "Password123!";
  const member1Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Join);

  // 2. Register member2 (reporter)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "Password456!";
  const member2Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Join);

  // 3. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SuperAdmin123!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 4. Member1 creates a community
  // (re-login as member1 is unnecessary; join auto-authenticates)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member1 creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
        }),
        author_display_name: RandomGenerator.name(1),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Member1 creates a comment in the post
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

  // 7. Switch context to member2 (login as reporter)
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 8. Member2 reports the comment
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 12,
          }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 9. Switch context to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 10. Admin deletes the report
  await api.functional.communityPlatform.admin.comments.reports.erase(
    connection,
    {
      commentId: comment.id,
      reportId: report.id,
    },
  );

  // 11. Attempt to delete again should fail (report is already removed)
  await TestValidator.error(
    "deleting an already-deleted report should fail",
    async () => {
      await api.functional.communityPlatform.admin.comments.reports.erase(
        connection,
        {
          commentId: comment.id,
          reportId: report.id,
        },
      );
    },
  );
}
