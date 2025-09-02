import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test audit log search with out-of-bounds pagination to verify empty
 * results.
 *
 * This test creates an admin, triggers at least one audit log record, then
 * performs a paginated search for a page well beyond available data. It
 * asserts the search succeeds (not 404/500) and confirms no data is
 * returned, verifying a robust pagination UX even at dataset boundaries.
 *
 * Steps:
 *
 * 1. Register an admin account (authenticate and store token in connection)
 * 2. Trigger a sample admin action to guarantee at least one audit log exists
 * 3. Perform an audit log search using a very high page number (e.g., page
 *    9999)
 * 4. Validate that the returned data array is empty, and pagination metadata
 *    is correct for an out-of-bounds page
 */
export async function test_api_audit_log_search_pagination_bounds(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Test1234!#",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);

  // 2. Trigger at least one admin action to ensure audit log is not empty
  const adminAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: adminAuthorized.admin.id,
          action_type: "custom_test_action",
          target_entity: "test_entity",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Test audit log entry",
          result: "success",
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(adminAction);

  // 3. Perform audit log search for an extremely high page number (beyond possible pages)
  const PAGE_NUMBER = 9999;
  const res = await api.functional.communityPlatform.admin.auditLogs.index(
    connection,
    {
      body: {
        page: PAGE_NUMBER,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    },
  );
  typia.assert(res);

  // 4. Assert the response: data array should be empty, pagination.current is as requested
  TestValidator.equals(
    "audit log out-of-bounds returns empty data",
    res.data,
    [],
  );
  TestValidator.equals(
    "pagination.current is requested high page",
    res.pagination.current,
    PAGE_NUMBER,
  );
  TestValidator.predicate(
    "pagination.pages less than requested page",
    res.pagination.pages < PAGE_NUMBER,
  );
}
