import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate the successful creation of a post report by an admin user using
 * the privileged moderation API.
 *
 * This test establishes admin authentication by registering a new admin
 * account via the /auth/admin/join endpoint. (The API automatically stores
 * the token in connection.headers.Authorization.)
 *
 * The presence of a target post is assumed, so a random UUID is generated
 * as the postId (the post's existence is not within testing scope here).
 *
 * The admin submits a report for this post specifying a valid report_type
 * and a non-empty string reason (<= 1000 chars).
 *
 * API response is validated:
 *
 * - It matches ICommunityPlatformPostReport shape
 * - Community_platform_post_id equals postId used for the report
 * - Admin_id field matches the authenticated admin's id
 * - Report_type and reason echo back input
 * - Status field is 'open' (initial state)
 * - Id, created_at, updated_at are set
 * - Resolution_notes, resolved_at, and deleted_at are null/undefined on
 *   creation
 */
export async function test_api_admin_post_report_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminDisplayName: string = RandomGenerator.name();

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminId: string = adminAuth.admin.id;

  // 2. Prepare a postId (simulate existing post)
  const postId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Form valid report_type and reason
  const reportType = RandomGenerator.pick([
    "spam",
    "abuse",
    "offensive_content",
    "policy_violation",
    "other",
  ] as const);
  const reason = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 8,
    wordMax: 24,
  });
  TestValidator.predicate("reason is not empty", reason.length > 0);
  TestValidator.predicate(
    "reason does not exceed 1000 chars",
    reason.length <= 1000,
  );

  // 4. Create a new report as admin
  const report =
    await api.functional.communityPlatform.admin.posts.reports.create(
      connection,
      {
        postId: postId,
        body: {
          report_type: reportType,
          reason: reason,
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // 5. Business and structural validation
  TestValidator.equals(
    "community_platform_post_id matches input",
    report.community_platform_post_id,
    postId,
  );
  TestValidator.equals("admin_id matches admin", report.admin_id, adminId);
  TestValidator.equals(
    "report_type matches input",
    report.report_type,
    reportType,
  );
  TestValidator.equals("reason matches input", report.reason, reason);
  TestValidator.equals("status is open", report.status, "open");
  TestValidator.predicate(
    "report.id is uuid string",
    typeof report.id === "string" && report.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );
  TestValidator.equals(
    "resolution_notes null or undefined",
    report.resolution_notes ?? null,
    null,
  );
  TestValidator.equals(
    "resolved_at null or undefined",
    report.resolved_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at null or undefined",
    report.deleted_at ?? null,
    null,
  );
}
