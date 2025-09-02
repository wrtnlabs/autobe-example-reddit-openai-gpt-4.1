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
 * Validates that a member can successfully update their own comment report
 * before it has been resolved.
 *
 * The scenario follows:
 *
 * 1. Register and authenticate a member.
 * 2. Member creates a community for context.
 * 3. Member creates a post in the community.
 * 4. Member creates a comment on the post.
 * 5. Member files a report on their own comment (with initial reason &
 *    'pending' status).
 * 6. Member updates the report (e.g., changes the reason and/or status) while
 *    unresolved.
 * 7. Checks that the update is successful, fields are set as expected, and
 *    business rules are respected.
 */
export async function test_api_member_comment_report_update_own_report_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const join = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(join);
  TestValidator.equals(
    "member join returns correct email",
    join.member.email,
    email,
  );
  TestValidator.equals(
    "member join returns correct display_name",
    join.member.display_name,
    displayName,
  );

  // 2. Create a community for context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(12),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          // logo_uri and banner_uri omitted because type is string | undefined
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member creates a comment on the post
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

  // 5. Member files a report on the comment
  const initialReason = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const initialStatus = "pending";
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: initialReason,
          status: initialStatus,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report created with correct comment_id",
    report.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "report initial status is 'pending'",
    report.status,
    initialStatus,
  );
  TestValidator.equals(
    "report initial reason set",
    report.report_reason,
    initialReason,
  );
  // Check not resolved
  TestValidator.equals(
    "newly created report is unresolved",
    report.resolved_at,
    null,
  );

  // 6. Member updates the report before it is resolved
  const newReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedStatus = "pending"; // keep as pending (as only admin may resolve)
  const updatePayload = {
    report_reason: newReason,
    status: updatedStatus,
  } satisfies ICommunityPlatformCommentReport.IUpdate;
  const updatedReport =
    await api.functional.communityPlatform.member.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: report.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedReport);
  // 7. Validation
  TestValidator.equals(
    "report reason updated correctly",
    updatedReport.report_reason,
    newReason,
  );
  TestValidator.equals(
    "report status remains pending",
    updatedReport.status,
    updatedStatus,
  );
  TestValidator.equals(
    "report id is unchanged after update",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "report is still unresolved",
    updatedReport.resolved_at,
    null,
  );
  TestValidator.equals(
    "report comment_id remains correct after update",
    updatedReport.comment_id,
    comment.id,
  );
}
