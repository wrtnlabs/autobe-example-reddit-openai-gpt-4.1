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
 * Ensure only the report author can delete their own comment report
 * (ownership enforcement).
 *
 * Business purpose: Ensures that comment report deletion is tightly coupled
 * to report ownership, preventing any other member from erasing someone
 * else's report (except possibly an admin—not part of this flow). This
 * supports privacy and auditability guarantees for platform
 * reports/complaints.
 *
 * Process:
 *
 * 1. Register member 1 (unique email, password, display name).
 * 2. Member 1 creates a new community (unique name/slug, minimum required
 *    fields).
 * 3. Member 1 creates a post in that community (title, body).
 * 4. Member 1 adds a comment to their post.
 * 5. Member 1 reports (files a report for) their own comment.
 * 6. Register member 2 (different unique email, password, display name).
 * 7. Member 2 attempts to delete the report submitted by member 1.
 * 8. The system must reject this attempt with an ownership/permission error
 *    (do not actually delete).
 *
 * Validation: Step 8 must throw an authorization/ownership error (e.g., 403
 * forbidden or similar), confirming the business rule enforcement. No
 * unauthorized deletions should succeed.
 */
export async function test_api_member_comment_report_deletion_failure_not_owner(
  connection: api.IConnection,
) {
  // Step 1: Register member 1
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(10);
  const member1DisplayName = RandomGenerator.name();
  const member1Reg = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: member1DisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Reg);
  const member1 = member1Reg.member;

  // Step 2: Member 1 creates a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member 1 creates a post in that community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        author_display_name: member1DisplayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Member 1 adds a comment to their post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 20,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Member 1 reports their own comment
  const report =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_reason: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 12,
            wordMax: 18,
          }),
          status: "pending",
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Register member 2 (different email, password, display name)
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(10);
  const member2DisplayName = RandomGenerator.name();
  const member2Reg = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: member2DisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Reg);

  // Step 7: Member 2 attempts to delete the report
  await TestValidator.error(
    "member 2 cannot delete member 1's comment report (ownership unauthorized)",
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
