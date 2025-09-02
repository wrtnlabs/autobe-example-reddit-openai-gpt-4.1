import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that an admin can retrieve a paginated, filterable list of
 * reports for a specific comment.
 *
 * This test covers the full business scenario for report administration:
 * admin account creation and authentication, member account creation,
 * member comment creation, multiple admin-filed reports creation (with
 * different status/reason), and final retrieval and validation of the
 * reports list with correct pagination and filtering logic for moderation
 * use-cases.
 *
 * Steps:
 *
 * 1. Admin account is registered and authenticated.
 * 2. Member account is created and authenticated.
 * 3. Member posts a comment (with a faked post_id).
 * 4. Admin logs in and submits several reports with different statuses and
 *    explanations against the comment.
 * 5. The report listing endpoint is called for that comment with pagination
 *    and status filter; the results are validated.
 * 6. The report listing endpoint is called WITHOUT search substring validation
 *    (since ISummary lacks report_reason).
 * 7. All checks confirm only the correct reports for the comment are returned,
 *    with correct statuses and search matches.
 */
export async function test_api_admin_comment_report_list_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.admin.id;
  // 2. Register and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // 3. Member posts a comment (post_id is faked/random as there is no post entity in the API)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: fakePostId,
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  const commentId = comment.id;
  // 4. Switch context back to admin (login)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 5. Admin files multiple distinct reports against the comment
  const reportsToCreate = ArrayUtil.repeat(
    3,
    (i) =>
      ({
        report_reason:
          `Auto report ${i} for moderation: ` +
          RandomGenerator.paragraph({ sentences: 2 }),
        status: i === 0 ? "pending" : i === 1 ? "resolved" : "under_review",
      }) satisfies ICommunityPlatformCommentReport.ICreate,
  );
  const createdReports: ICommunityPlatformCommentReport[] = [];
  for (const req of reportsToCreate) {
    const report =
      await api.functional.communityPlatform.admin.comments.reports.create(
        connection,
        {
          commentId,
          body: req,
        },
      );
    typia.assert(report);
    createdReports.push(report);
  }
  // 6. Query reports for status 'pending' with pagination
  const pageSize = 2;
  const filterStatus = "pending";
  const paged =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId,
        body: {
          page: 1,
          limit: pageSize,
          status: filterStatus,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination reflects requested limit",
    paged.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "all results have status 'pending'",
    paged.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "results only for correct comment",
    paged.data.every((r) => r.comment_id === commentId),
  );
  // Check the created 'pending' report is present in the listing
  const pendingReport = createdReports.find((r) => r.status === "pending");
  TestValidator.predicate(
    "created pending report is included in result",
    paged.data.some((r) => r.id === pendingReport?.id),
  );
  // 7. Since ISummary does not include report_reason, omit substring search test. Instead, verify count and correct referencing for all created reports via simple pagination.
  const pagedAll =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId,
        body: {
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(pagedAll);
  TestValidator.predicate(
    "all results have expected comment_id",
    pagedAll.data.every((r) => r.comment_id === commentId),
  );
  // As a substitute for substring matching, ensure that at least all reports created are represented in the pagedAll result set by id
  for (const rep of createdReports) {
    TestValidator.predicate(
      `report id ${rep.id} is present in all page result`,
      pagedAll.data.some((r) => r.id === rep.id),
    );
  }
}
