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
 * Validates that platform audit logs are successfully searched and contain
 * records for admin actions.
 *
 * This test covers the full workflow for an admin audit log trace:
 *
 * 1. Register a new admin (ensures fresh authentication context)
 * 2. Use the new admin to trigger a business event by creating an admin
 *    action. This will guarantee at least one audit log record exists.
 * 3. Search for audit logs using a combination of filters – by event_type,
 *    entity_type, admin_id, and pagination (page/limit). Try broad
 *    (minimal) and narrow (with filters) queries.
 * 4. Confirm that the audit log for the previously created admin action can be
 *    retrieved via search.
 * 5. Validate response logic: audit log list contains at least one expected
 *    entry (for our admin action), pagination metadata is valid, and record
 *    structure matches expectations.
 *
 * Steps:
 *
 * - Register admin
 * - Trigger admin action (e.g., delete a made-up post by UUID)
 * - Search audit logs: (a) broad - minimal filters, (b) narrow - filtered by
 *   event and entity types or admin_id
 * - Confirm audit log from our action is present and fields
 *   (event/entity/type/id/result/created_at) are correct
 * - Confirm pagination fields are present and positive
 */
export async function test_api_audit_log_search_success(
  connection: api.IConnection,
) {
  // STEP 1: Register admin (creates authentication context)
  const email = typia.random<string & tags.Format<"email">>();
  const joinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinOutput);
  const admin = joinOutput.admin;

  // STEP 2: Trigger an admin action (e.g., admin_action on random entity)
  const entityType = "post";
  const entityId = typia.random<string & tags.Format<"uuid">>();
  const action_type = "delete_post";
  const result = "success";

  const adminAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: admin.id,
          action_type,
          target_entity: entityType,
          target_entity_id: entityId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          result,
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(adminAction);

  // STEP 3a: Broad search for audit logs (minimal filter)
  const broadQuery =
    await api.functional.communityPlatform.admin.auditLogs.index(connection, {
      body: {} satisfies ICommunityPlatformAuditLog.IRequest,
    });
  typia.assert(broadQuery);
  TestValidator.predicate(
    "pagination/records is at least 1",
    broadQuery.pagination.records >= 1,
  );
  TestValidator.predicate(
    "contains admin action log",
    broadQuery.data.some(
      (log) =>
        log.event_type === "admin_action" &&
        log.entity_type === entityType &&
        log.entity_id === entityId &&
        log.result === result,
    ),
  );

  // STEP 3b: Filtered search - restrict by event_type, entity_type, result, and admin_id
  const filteredQuery =
    await api.functional.communityPlatform.admin.auditLogs.index(connection, {
      body: {
        event_type: "admin_action",
        entity_type: entityType,
        entity_id: entityId,
        result,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    });
  typia.assert(filteredQuery);
  TestValidator.predicate(
    "filtered search returns our target log",
    filteredQuery.data.some(
      (log) =>
        log.entity_id === entityId &&
        log.admin_id === admin.id &&
        log.result === result,
    ),
  );
  TestValidator.predicate(
    "filtered pagination correct",
    filteredQuery.pagination.current === 1 &&
      filteredQuery.pagination.limit === 10,
  );
}
