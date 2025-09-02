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
 * Test successful retrieval of an audit log by its unique ID.
 *
 * This test validates the complete end-to-end workflow to ensure that, for
 * a legitimate admin action, an audit log is created, retrievable via list,
 * and accessible in detail by ID. This ensures that audit log
 * data-integrity, admin/auth context, and event linkage are reliably
 * wired.
 *
 * 1. Register an admin account and receive authentication context
 * 2. Simulate an admin business event, logging a moderation action
 * 3. Retrieve audit log entries filtering for the event generated in step 2
 * 4. Lookup audit log details by the fetched ID value
 * 5. Validate that:
 *
 *    - Audit log fields are all present and have correct data types
 *    - Admin_id, event_type, entity_type, entity_id, and result match those
 *         supplied/executed
 *    - Created_at is a valid ISO 8601 timestamp
 *    - Response is properly typed and matches API contract
 */
export async function test_api_audit_log_detail_success(
  connection: api.IConnection,
) {
  // 1. Register/Join an admin (get context and identity)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const join = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(join);
  const adminId = join.admin.id;

  // 2. Create an admin action that triggers an audit log (link to admin)
  const action_type = "delete_post";
  const target_entity = "post";
  const target_entity_id = typia.random<string & tags.Format<"uuid">>();
  const result = "success";
  const adminAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: adminId,
          action_type,
          target_entity,
          target_entity_id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          result,
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(adminAction);

  // 3. List audit logs and locate the new record for our action
  const auditLogIndex =
    await api.functional.communityPlatform.admin.auditLogs.index(connection, {
      body: {
        event_type: "admin_action",
        entity_type: target_entity,
        entity_id: target_entity_id,
        result,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    });
  typia.assert(auditLogIndex);
  const auditLog = auditLogIndex.data.find(
    (log) =>
      log.entity_id === target_entity_id &&
      log.admin_id === adminId &&
      log.event_type === "admin_action" &&
      log.entity_type === target_entity &&
      log.result === result,
  );
  TestValidator.predicate("audit log matching admin action exists", !!auditLog);
  typia.assert(auditLog);

  // 4. Fetch the audit log detail by ID for field-level checks
  const detail = await api.functional.communityPlatform.admin.auditLogs.at(
    connection,
    {
      auditLogId: auditLog!.id,
    },
  );
  typia.assert(detail);

  // 5. Check correct linkage and data integrity
  TestValidator.equals(
    "audit log id matches index result",
    detail.id,
    auditLog!.id,
  );
  TestValidator.equals(
    "admin_id ties back to creating admin",
    detail.admin_id,
    adminId,
  );
  TestValidator.equals(
    "event_type is admin_action",
    detail.event_type,
    "admin_action",
  );
  TestValidator.equals(
    "entity_type matches target_entity",
    detail.entity_type,
    target_entity,
  );
  TestValidator.equals(
    "entity_id matches target_entity_id",
    detail.entity_id,
    target_entity_id,
  );
  TestValidator.equals("audit log result matches", detail.result, result);
  TestValidator.predicate(
    "created_at is a present, non-empty ISO timestamp",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
}
