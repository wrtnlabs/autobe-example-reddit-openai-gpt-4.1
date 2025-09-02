import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";

/**
 * Validate error handling for retrieving audit log details by non-existent
 * or malformed ID.
 *
 * This test ensures the audit log detail endpoint properly returns a
 * not-found error when provided with a random, invalid, or non-existent
 * auditLogId. The process is as follows:
 *
 * 1. Register a new admin to acquire authentication credentials (POST
 *    /auth/admin/join)
 * 2. Attempt to retrieve the details of an audit log using a randomly
 *    generated UUID value as auditLogId via GET
 *    /communityPlatform/admin/auditLogs/{auditLogId}
 * 3. Assert the API responds with the appropriate not-found error, confirming
 *    that non-existent audit log IDs are not accepted and do not yield
 *    sensitive system information.
 */
export async function test_api_audit_log_detail_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Register new admin and authenticate
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  };
  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(authorized);
  // Step 2: Attempt to access audit log detail using random non-existent auditLogId
  const nonExistentAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Assert that the API correctly rejects this with a not-found error (HTTP 404)
  await TestValidator.error(
    "should return not-found error for invalid auditLogId",
    async () => {
      await api.functional.communityPlatform.admin.auditLogs.at(connection, {
        auditLogId: nonExistentAuditLogId,
      });
    },
  );
}
