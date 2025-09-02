import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Validates that attempting to create an admin action without the required
 * 'action_type' field results in a validation error and no record is
 * created.
 *
 * Business Context: This test ensures that the admin audit/operations
 * logging endpoint enforces required field validation. Only properly
 * structured admin actions should be recordable in the audit trail. Missing
 * required fields (like 'action_type') must result in a validation error
 * and must not insert a partial row.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new admin via /auth/admin/join
 *    (establishing an authenticated admin session).
 * 2. Prepare a creation request for /communityPlatform/admin/adminActions
 *    intentionally omitting the required 'action_type' property, to
 *    simulate a client mistake.
 * 3. Use TestValidator.error (with await) to validate that the operation fails
 *    due to this omission, confirming backend schema enforcement and error
 *    reporting.
 */
export async function test_api_admin_action_creation_missing_required_field(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authentication context for subsequent requests)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const registerResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(registerResponse);
  const admin = registerResponse.admin;

  // 2. Attempt to create admin action—deliberately omit 'action_type'.
  // ALL OTHER required fields are present (admin_id, target_entity, target_entity_id, result).
  // Using 'as any' type here ONLY to permit omission for negative-path testing. DO NOT use in positive-path tests.
  const invalidActionInput = {
    admin_id: admin.id,
    // action_type: purposely omitted
    target_entity: RandomGenerator.name(1),
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    result: RandomGenerator.pick(["success", "error", "restored"] as const),
    reason: null,
  } as any;

  // 3. Must fail: server should reject with validation error
  await TestValidator.error(
    "should fail validation when 'action_type' is missing",
    async () => {
      await api.functional.communityPlatform.admin.adminActions.create(
        connection,
        {
          body: invalidActionInput,
        },
      );
    },
  );
}
