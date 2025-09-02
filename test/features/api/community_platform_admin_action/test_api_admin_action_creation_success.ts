import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Test the successful creation of a new admin/moderation action (audit
 * log).
 *
 * This test validates the business flow from registering a new admin
 * account (providing authentication/authorization for admin endpoints) to
 * the creation of a new admin action record, confirming all required fields
 * and business logic.
 *
 * Steps:
 *
 * 1. Register a new admin account using POST /auth/admin/join to acquire
 *    tokens and a valid admin_id.
 * 2. Use the authenticated context to create a new admin/moderation action
 *    with realistic values for action_type, target_entity,
 *    target_entity_id, reason, and result.
 * 3. Verify the API responds with a properly structured
 *    ICommunityPlatformAdminAction record matching the input and new record
 *    constraints.
 * 4. Check all required fields (id, admin_id, action_type, target_entity,
 *    target_entity_id, result, created_at) are present and valid formats.
 * 5. (Optionally) Assert some business relationships, such as whether the
 *    admin_id recorded matches the authenticated admin, and the provided
 *    input values appear in the result.
 */
export async function test_api_admin_action_creation_success(
  connection: api.IConnection,
) {
  // 1. Register an admin account and get authorized context
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const { admin } = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Create new admin/moderation action with required input
  const adminActionInput = {
    admin_id: admin.id,
    action_type: RandomGenerator.pick([
      "delete_post",
      "suspend_user",
      "restore_community",
      "warn_user",
      "pin_post",
    ] as const),
    target_entity: RandomGenerator.pick([
      "community",
      "post",
      "comment",
      "user",
      "membership",
    ] as const),
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 12,
    }),
    result: RandomGenerator.pick([
      "success",
      "error",
      "restored",
      "failed_permission",
      "skipped",
    ] as const),
  } satisfies ICommunityPlatformAdminAction.ICreate;
  const output =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: adminActionInput,
      },
    );
  typia.assert(output);

  // 3. Validate all fields and business logic
  TestValidator.equals(
    "admin_id should match authenticated admin",
    output.admin_id,
    admin.id,
  );
  TestValidator.equals(
    "action_type is as input",
    output.action_type,
    adminActionInput.action_type,
  );
  TestValidator.equals(
    "target_entity is as input",
    output.target_entity,
    adminActionInput.target_entity,
  );
  TestValidator.equals(
    "target_entity_id is as input",
    output.target_entity_id,
    adminActionInput.target_entity_id,
  );
  TestValidator.equals(
    "reason is as input",
    output.reason,
    adminActionInput.reason,
  );
  TestValidator.equals(
    "result is as input",
    output.result,
    adminActionInput.result,
  );
  TestValidator.predicate(
    "id should be a valid uuid",
    typeof output.id === "string" &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        output.id,
      ),
  );
  TestValidator.predicate(
    "created_at should be a well-formed date-time string",
    typeof output.created_at === "string" && !!Date.parse(output.created_at),
  );
}
