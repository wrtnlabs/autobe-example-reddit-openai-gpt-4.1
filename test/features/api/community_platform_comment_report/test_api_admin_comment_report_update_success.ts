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
 * Successfully updates a comment report's status and resolution as an
 * admin.
 *
 * This test replicates a realistic moderation lifecycle:
 *
 * 1. Register first member and create a community
 * 2. Post is created by the first member
 * 3. Comment is added to the post by the first member
 * 4. Switch to a second member account and log in
 * 5. File a new report on the existing comment as the second member (reporter)
 * 6. Register a new admin account and log in
 * 7. Update the report's status (e.g., to 'resolved') and add a resolution
 *    note as admin
 * 8. Assert changes are made: status, resolution note, updated_at,
 *    resolved_at, and admin_id attribution
 */
export async function test_api_admin_comment_report_update_success(
  connection: api.IConnection,
) {
  // 1. Register first member
  const member1Email = typia.random<string & tags.Format<"email">>();
  const password = "s3cretPassw0rd";
  const member1Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Join);

  // 2. Create community (simulate category_id, all optional fields as undefined if unused)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          // logo_uri and banner_uri omitted (undefined by default, not null)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 30,
        }),
        author_display_name: member1Join.member.display_name,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create comment (as member1)
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Register second member and log in
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Join);

  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. File report as member2
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 7. Register admin and log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 8. Update report as admin
  const updateInput: ICommunityPlatformCommentReport.IUpdate = {
    status: "resolved",
    resolution: RandomGenerator.paragraph({ sentences: 3 }),
    admin_id: adminJoin.admin.id,
  };
  const updatedReport =
    await api.functional.communityPlatform.admin.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: report.id,
        body: updateInput,
      },
    );
  typia.assert(updatedReport);

  // 9. Assert updates
  TestValidator.equals(
    "report status was updated to resolved",
    updatedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution is present",
    updatedReport.resolution,
    updateInput.resolution,
  );
  TestValidator.equals(
    "admin_id set to admin",
    updatedReport.admin_id,
    adminJoin.admin.id,
  );
  TestValidator.predicate(
    "updated_at is not before original updated_at",
    new Date(updatedReport.updated_at) >= new Date(report.updated_at),
  );
  TestValidator.predicate(
    "resolved_at is set after update",
    updatedReport.resolved_at !== null &&
      new Date(updatedReport.resolved_at!) >= new Date(report.updated_at),
  );
}
