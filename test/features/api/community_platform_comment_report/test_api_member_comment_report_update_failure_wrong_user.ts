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
 * Validates that a member cannot update a comment report filed by another
 * user (permission denial).
 *
 * Full business context: This test orchestrates two separate member
 * accounts to simulate realistic ownership boundaries. Member 1 is
 * responsible for creating all primary content (community, post, comment)
 * and then files a report against the comment. Member 2 is then registered
 * and logs into the system as a fresh user. Member 2 then attempts to
 * update the report that was filed by Member 1, using valid update data
 * such as new reason text or status. The API must correctly deny this
 * operation according to business rules, returning a permission error. This
 * validates that ownership of report updates is strictly enforced and
 * prevents privilege escalation or unauthorized editing.
 *
 * Step-by-step workflow:
 *
 * 1. Register Member 1 and authenticate.
 * 2. Create a Community (Member 1).
 * 3. Create a Post in the Community (Member 1).
 * 4. Create a Comment on the Post (Member 1).
 * 5. Member 1 files a Report on the Comment.
 * 6. Register Member 2 and authenticate.
 * 7. Member 2 attempts to update Member 1's report, and receives a permission
 *    error.
 */
export async function test_api_member_comment_report_update_failure_wrong_user(
  connection: api.IConnection,
) {
  // 1. Register Member 1 and authenticate
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Auth);
  // 2. Create a Community (Member 1)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a Post in the Community (Member 1)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a Comment on the Post (Member 1)
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. Member 1 files a Report on the Comment
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 12,
          }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Register Member 2 and authenticate (context switch)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Auth);
  // 7. Member 2 attempts to update Member 1's report and is denied
  await TestValidator.error(
    "member 2 cannot update another user's comment report",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.update(
        connection,
        {
          commentId: comment.id,
          reportId: report.id,
          body: {
            report_reason: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 10,
            }),
            status: "resolved",
            resolution: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformCommentReport.IUpdate,
        },
      );
    },
  );
}
