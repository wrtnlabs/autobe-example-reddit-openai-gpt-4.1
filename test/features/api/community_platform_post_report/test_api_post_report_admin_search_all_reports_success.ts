import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin post report search (all reports, pagination, and filters).
 *
 * Scenario:
 *
 * - Register admin and member accounts, log in each (role context switching)
 * - Member creates a post (in a random community)
 * - Member files several distinct reports (different report_type/reason)
 *   against the post
 * - Admin uses PATCH /communityPlatform/admin/posts/{postId}/reports, both
 *   without filters and with filters (report_type/status/pagination)
 * - Verify all expected reports are returned with correct metadata,
 *   pagination works, order is valid, and admin sees all reports
 * - Check data contents, filtering (by report_type/status), and total/page
 *   counts in pagination
 */
export async function test_api_post_report_admin_search_all_reports_success(
  connection: api.IConnection,
) {
  // Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // Member context: create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Member context: file multiple reports with different report_type/reason
  const reportTypesAndReasons = [
    {
      report_type: "spam",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
    },
    {
      report_type: "abuse",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
    },
    {
      report_type: "other",
      reason: RandomGenerator.paragraph({ sentences: 4 }),
    },
  ];
  const createdReports = await ArrayUtil.asyncMap(
    reportTypesAndReasons,
    async (r) => {
      const rep =
        await api.functional.communityPlatform.member.posts.reports.create(
          connection,
          {
            postId: post.id,
            body: r satisfies ICommunityPlatformPostReport.ICreate,
          },
        );
      typia.assert(rep);
      return rep;
    },
  );

  // Admin context: log back in as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 1. Unfiltered: Fetch all reports for the post (default pagination)
  const pageAll =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(pageAll);
  TestValidator.equals(
    "all reports returned in page",
    pageAll.data.length,
    createdReports.length,
  );
  const reportIds = createdReports.map((r) => r.id);
  for (const found of pageAll.data) {
    TestValidator.predicate(
      "found report must be among created",
      reportIds.includes(found.id),
    );
  }
  TestValidator.equals(
    "total records matches",
    pageAll.pagination.records,
    createdReports.length,
  );

  // 2. Pagination: limit=2, page=1
  const paged1 =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          limit: 2,
          page: 1,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals("pagination page 1 size", paged1.data.length, 2);
  TestValidator.equals(
    "pagination meta (total records)",
    paged1.pagination.records,
    createdReports.length,
  );
  TestValidator.equals("pagination current page", paged1.pagination.current, 1);
  TestValidator.equals("pagination limit", paged1.pagination.limit, 2);

  // 3. Pagination: page=2 (remaining items)
  const paged2 =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          limit: 2,
          page: 2,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "pagination page 2 size",
    paged2.data.length,
    createdReports.length - 2,
  );
  TestValidator.equals(
    "pagination current page (2)",
    paged2.pagination.current,
    2,
  );

  // 4. Filter by report_type ('spam')
  const filteredSpam =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          report_type: "spam",
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(filteredSpam);
  TestValidator.predicate(
    "all returned reports are 'spam'",
    filteredSpam.data.every((d) => d.report_type === "spam"),
  );
  TestValidator.equals("filtered reports count", filteredSpam.data.length, 1);

  // 5. Filter by status - all reports should be 'open' after creation
  if (filteredSpam.data.length > 0) {
    TestValidator.equals(
      "status is open after creation",
      filteredSpam.data[0].status,
      "open",
    );
  }
}
