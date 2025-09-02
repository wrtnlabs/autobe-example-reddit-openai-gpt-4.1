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
 * E2E test for member's report search on a post with pagination and
 * filtering.
 *
 * Validates that:
 *
 * - Only the logged-in member's post reports are shown in the result.
 * - The paginated response contains the correct number of records per limit
 *   and page.
 * - Filtering by report_type (and via substring of reason, simulated
 *   post-fetch) functions correctly.
 * - All DTO type constraints and API response contracts are enforced.
 *
 * Scenario:
 *
 * 1. Register and authenticate a member account
 *    (api.functional.auth.member.join).
 * 2. Create a community post as this member
 *    (api.functional.communityPlatform.member.posts.create).
 * 3. File several reports on the created post as this member, varying the
 *    report_type and reasons
 *    (api.functional.communityPlatform.member.posts.reports.create).
 * 4. Fetch a full list of reports via PATCH
 *    /communityPlatform/member/posts/{postId}/reports with default
 *    pagination.
 *
 *    - Assert that all reports in the response belong to the current member on
 *         the correct post.
 *    - Assert pagination metadata matches the count and limit.
 * 5. Pick one of the report_types used above and perform a filtered search by
 *    report_type; assert only matching types returned.
 * 6. Substring filter: Since the API does not directly support filtering by
 *    reason substring, verify at least one returned report contains a known
 *    substring in its reason (simulate manual filter after fetch).
 * 7. Use limit=2 to test pagination (page 1, page 2); assert correct slice
 *    logic and no duplicate records between pages; check total records
 *    metadata consistency.
 * 8. Edge: Test filtering by a non-existent report_type, assert response is
 *    empty with zero records.
 */
export async function test_api_post_report_member_search_success_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const memberId = joinResult.member.id;

  // 2. Create a post as this member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        author_display_name: display_name,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. File multiple reports by this member on the created post, with varying types/reasons
  const reportTypes = [
    "spam",
    "abuse",
    "copyright",
    "rude",
    "irrelevant",
  ] as const;
  const reportReasons = [
    RandomGenerator.paragraph({ sentences: 5 }),
    RandomGenerator.paragraph({ sentences: 5 }),
    RandomGenerator.paragraph({ sentences: 5 }),
    RandomGenerator.paragraph({ sentences: 5 }),
    RandomGenerator.paragraph({ sentences: 5 }),
  ];
  const createdReports: ICommunityPlatformPostReport[] = [];
  for (let i = 0; i < reportTypes.length; ++i) {
    const report =
      await api.functional.communityPlatform.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: {
            report_type: reportTypes[i],
            reason: reportReasons[i],
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    typia.assert(report);
    TestValidator.equals(
      `created report has correct report_type`,
      report.report_type,
      reportTypes[i],
    );
    TestValidator.equals(
      `created report reason matches`,
      report.reason,
      reportReasons[i],
    );
    TestValidator.equals(
      "created report links correct post",
      report.community_platform_post_id,
      post.id,
    );
    TestValidator.equals(
      "created report belongs to member",
      report.reported_by_member_id,
      memberId,
    );
    createdReports.push(report);
  }

  // 4. Fetch the full list (no filter, default pagination)
  let fetchAll =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {}, // No filter = all
      },
    );
  typia.assert(fetchAll);
  TestValidator.equals(
    "all reports returned for this member and post",
    fetchAll.data.length,
    createdReports.length,
  );
  for (const r of fetchAll.data) {
    TestValidator.equals(
      "fetched report correct post",
      r.community_platform_post_id,
      post.id,
    );
    TestValidator.equals(
      "fetched report belongs to member",
      r.reported_by_member_id,
      memberId,
    );
  }

  // 5. Filter by report_type (pick one from above)
  const filterIdx = 2;
  const typeToFilter = reportTypes[filterIdx];
  const filterRes =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: { report_type: typeToFilter },
      },
    );
  typia.assert(filterRes);
  for (const r of filterRes.data) {
    TestValidator.equals(
      "filtered by report_type only that type appears",
      r.report_type,
      typeToFilter,
    );
    TestValidator.equals(
      "filtered type correct post",
      r.community_platform_post_id,
      post.id,
    );
    TestValidator.equals(
      "filtered type correct member",
      r.reported_by_member_id,
      memberId,
    );
  }
  TestValidator.equals(
    "filtered count for single report type",
    filterRes.data.length,
    1,
  );

  // 6. Substring filter simulation (API does not support direct substring filter). Post-process by checking at least one report contains the substring.
  const reasonSample =
    reportReasons[3].split(" ")[1]?.slice(0, 4) ?? reportReasons[3];
  const findByReason = fetchAll.data.find((r) =>
    r.reason.includes(reasonSample),
  );
  TestValidator.predicate(
    "at least one report reason matches the substring (simulated post-fetch)",
    !!findByReason,
  );

  // 7. Pagination: limit 2, fetch two pages, check that records do not overlap and total is correct.
  const paged1 =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(paged1);
  TestValidator.equals("pagination first page limit", paged1.data.length, 2);

  const paged2 =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: { limit: 2, page: 2 },
      },
    );
  typia.assert(paged2);
  TestValidator.predicate(
    "pagination second page <= 2 records",
    paged2.data.length <= 2,
  );
  TestValidator.equals(
    "pagination total matches created (page 1)",
    paged1.pagination.records,
    reportTypes.length,
  );
  TestValidator.equals(
    "pagination total matches created (page 2)",
    paged2.pagination.records,
    reportTypes.length,
  );
  // Confirm no overlap between pages except when overlapping the last record
  const page1Ids = new Set(paged1.data.map((r) => r.id));
  const page2Unique = paged2.data.filter((r) => !page1Ids.has(r.id));
  TestValidator.predicate(
    "no duplicate ids between page 1 and 2 (except possible last record)",
    page2Unique.length === paged2.data.length ||
      page1Ids.size + paged2.data.length - page2Unique.length ===
        reportTypes.length,
  );

  // 8. Edge: Non-existent report_type filter returns empty
  const notFound =
    await api.functional.communityPlatform.member.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: { report_type: "not_a_type" },
      },
    );
  typia.assert(notFound);
  TestValidator.equals(
    "non-existent report_type yields no data",
    notFound.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent report_type yields zero records",
    notFound.pagination.records,
    0,
  );
}
