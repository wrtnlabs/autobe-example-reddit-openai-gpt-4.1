import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Ensures a member cannot access post reports created by other members.
 *
 * This scenario tests privacy of post report data: each member should only
 * access their own filed reports, not those of others on the same post.
 *
 * Steps:
 *
 * 1. Register member1.
 * 2. Member1 creates a post.
 * 3. Member1 files a report on their post.
 * 4. Register member2 (automatic authentication switch).
 * 5. Member2 files a report on the same post.
 * 6. As member2, list reports for the post and confirm only their own report
 *    is present.
 * 7. Assert that every report in the returned list has reported_by_member_id
 *    equal to member2's id, and member1's report is not visible.
 * 8. Validate that member2's own report is actually present.
 */
export async function test_api_post_report_member_search_other_member_data_protection(
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
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        author_display_name: member1.member.display_name,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Member1 files a report
  const member1Report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: "spam",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(member1Report);

  // 4. Register member2 (auth switch)
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

  // 5. Member2 files a report
  const member2Report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: "abuse",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(member2Report);

  // 6. As member2, list reports for the post
  const reportPage =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(reportPage);

  // 7. Privacy assertion: only member2's reports shown
  TestValidator.predicate(
    "All returned reports are authored by member2 only",
    reportPage.data.every((r) => r.reported_by_member_id === member2.member.id),
  );
  TestValidator.predicate(
    "member1's report does not appear for member2",
    !reportPage.data.some((r) => r.id === member1Report.id),
  );
  // 8. Additional: member2's own report is present
  TestValidator.predicate(
    "member2's own report is present in their query",
    reportPage.data.some((r) => r.id === member2Report.id),
  );
}
