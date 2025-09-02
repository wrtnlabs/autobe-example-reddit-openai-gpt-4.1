import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test that a member cannot view another member's report details for the
 * same post.
 *
 * This E2E test verifies privacy/ownership enforcement for post reports in
 * the community platform:
 *
 * 1. Register member1 and authenticate (token auto-stored in connection)
 * 2. Member1 creates a post
 * 3. Member1 files a report on that post
 * 4. Register member2 (switch authentication context)
 * 5. Member2 attempts to access member1's report detail endpoint
 * 6. Asserts access is denied (error is thrown, either as not found or
 *    forbidden)
 *
 * This ensures only the reporter (or admin) can view report details, and
 * other members cannot access private report records.
 */
export async function test_api_post_report_member_view_non_owner_report_denied(
  connection: api.IConnection,
) {
  // 1. Register member1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(10);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Member1 creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 15,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 9,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Member1 files a report on their own post
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: "spam",
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 12,
          }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // 4. Register member2 (auth context switches automatically)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(10);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 5. Member2 (now authenticated) attempts to access member1's report
  await TestValidator.error(
    "Non-owner member should be denied access to another member's post report details",
    async () => {
      await api.functional.communityPlatform.member.posts.reports.at(
        connection,
        {
          postId: post.id,
          reportId: report.id,
        },
      );
    },
  );
}
