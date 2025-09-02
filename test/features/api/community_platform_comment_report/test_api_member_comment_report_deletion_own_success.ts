import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";

/**
 * Test deleting a member's own comment report before it is resolved.
 *
 * Validates the complete flow that a community member can register, create
 * a community and post, comment, file a report on their own comment, and
 * then delete that report before it is resolved. Finally, verifies that the
 * report is actually deleted by attempting a second deletion (which must
 * fail).
 *
 * Steps:
 *
 * 1. Register a new member (and authenticate).
 * 2. Create a new community as the member.
 * 3. Create a post in that community.
 * 4. Comment on the post as the member.
 * 5. File a report on the member's own comment.
 * 6. Delete the report before it is resolved.
 * 7. Attempt to delete the same report again and assert failure (confirm
 *    deletion).
 */
export async function test_api_member_comment_report_deletion_own_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(auth);
  TestValidator.equals(
    "member email matches input",
    auth.member.email,
    memberEmail,
  );

  // 2. Create a new community
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: categoryId,
          name: RandomGenerator.alphaNumeric(12),
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 12,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner matches registered member",
    community.owner_id,
    auth.member.id,
  );

  // 3. Create a post within the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 10,
        }),
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post created in correct community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post author matches member",
    post.community_platform_member_id,
    auth.member.id,
  );

  // 4. Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment author matches member",
    comment.author_id,
    auth.member.id,
  );
  TestValidator.equals(
    "comment attached to correct post",
    comment.post_id,
    post.id,
  );

  // 5. File a report as the member on their own comment
  const report_reason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 10,
    wordMax: 20,
  });
  const report_status = "pending";
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason,
          status: report_status,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report status is pending",
    report.status,
    report_status,
  );
  TestValidator.equals(
    "reporter matches member",
    report.reporter_id,
    auth.member.id,
  );
  TestValidator.equals(
    "report attached to correct comment",
    report.comment_id,
    comment.id,
  );

  // 6. Delete the report prior to resolution
  await api.functional.communityPlatform.member.comments.reports.erase(
    connection,
    {
      commentId: comment.id,
      reportId: report.id,
    },
  );

  // 7. Attempt to delete again and confirm it fails
  await TestValidator.error(
    "deleting nonexistent report should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.erase(
        connection,
        {
          commentId: comment.id,
          reportId: report.id,
        },
      );
    },
  );
}
