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
 * Test successful reporting of a comment by an authenticated member user.
 *
 * This end-to-end test checks that the full workflow for reporting a
 * comment is supported and functions correctly:
 *
 * 1. Register the first member (the commenter and post author).
 * 2. As the first member, create a new community to house the target post.
 * 3. Still as the first member, create a post in that community.
 * 4. Still as the first member, create a comment under the post.
 * 5. Register a second member (reporter), which switches authentication
 *    context.
 * 6. As the second member, create a report for the comment just created.
 * 7. Validate that the created report references the correct comment, has the
 *    reporter_id for the second member, includes the supplied
 *    report_reason/status, and has valid timestamps.
 *
 * Steps:
 *
 * - All random data is generated using typia.random and RandomGenerator for
 *   appropriate formats/lengths.
 * - The test validates that comments can only be reported by authenticated
 *   members (not guests) and ensures foreign key relationships are
 *   maintained throughout the test (post must belong to the created
 *   community, comment to the post, etc).
 * - Opportunity exists in future for further validation (e.g., duplicate
 *   report check, unauthorized attempts).
 */
export async function test_api_comment_report_creation_success_member(
  connection: api.IConnection,
) {
  // 1. Register the first member
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Auth);

  // 2. Create a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a comment in the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        parent_id: null,
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Register the second member; context switches
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "AnotherPassword456!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Auth);

  // 6. Report the comment as the second member
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialStatus = "pending";
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: reportReason,
          status: initialStatus,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // 7. Validate the report content
  TestValidator.equals(
    "report is for correct comment",
    report.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "report is by correct reporter",
    report.reporter_id,
    member2Auth.member.id,
  );
  TestValidator.equals(
    "report reason is correct",
    report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report status is correct",
    report.status,
    initialStatus,
  );
  TestValidator.predicate(
    "report creation timestamp is present",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report updated timestamp is present",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );
}
