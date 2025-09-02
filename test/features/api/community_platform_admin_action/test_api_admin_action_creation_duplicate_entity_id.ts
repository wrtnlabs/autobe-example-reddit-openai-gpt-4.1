import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Test creation of admin actions with identical entity reference but
 * different action_type.
 *
 * Business context: Platform audit/actions require unique admin actions by
 * target_entity and action_type, allowing independent records for different
 * actions even with same entity.
 *
 * Workflow:
 *
 * 1. Register admin via /auth/admin/join (for authentication context)
 * 2. Create 'first' admin action (adminActions.create) for a specific
 *    (target_entity, target_entity_id, action_type A)
 * 3. Create 'second' admin action for the same (target_entity,
 *    target_entity_id) but different action_type B
 * 4. Confirm both creations succeed and each record is distinct
 *
 *    - Compare returned IDs
 *    - IDs should differ (distinct records)
 *    - All other relevant properties should match entity reference
 *    - Action_type and result should reflect test input
 */
export async function test_api_admin_action_creation_duplicate_entity_id(
  connection: api.IConnection,
) {
  // 1. Register an admin & establish authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPw123!#",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  const admin = adminJoinResponse.admin;

  // 2. Prepare entity reference and two different action_types
  const targetEntity = "post";
  const entityId = typia.random<string & tags.Format<"uuid">>();
  const actionTypeA = "delete_post";
  const actionTypeB = "suspend_post";
  const actionReason = RandomGenerator.paragraph();

  // 3. Create first admin action
  const firstAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: admin.id,
          action_type: actionTypeA,
          target_entity: targetEntity,
          target_entity_id: entityId,
          reason: actionReason,
          result: "success",
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(firstAction);
  TestValidator.equals(
    "First action_type matches A",
    firstAction.action_type,
    actionTypeA,
  );
  TestValidator.equals(
    "First admin reference matches",
    firstAction.admin_id,
    admin.id,
  );
  TestValidator.equals(
    "First target_entity matches",
    firstAction.target_entity,
    targetEntity,
  );
  TestValidator.equals(
    "First target_entity_id matches",
    firstAction.target_entity_id,
    entityId,
  );
  TestValidator.equals(
    "First result reflects input",
    firstAction.result,
    "success",
  );
  TestValidator.equals(
    "First reason reflects input",
    firstAction.reason,
    actionReason,
  );

  // 4. Create second admin action with a different action_type but same entity
  const secondAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      {
        body: {
          admin_id: admin.id,
          action_type: actionTypeB,
          target_entity: targetEntity,
          target_entity_id: entityId,
          reason: actionReason,
          result: "success",
        } satisfies ICommunityPlatformAdminAction.ICreate,
      },
    );
  typia.assert(secondAction);
  TestValidator.equals(
    "Second action_type matches B",
    secondAction.action_type,
    actionTypeB,
  );
  TestValidator.equals(
    "Second admin reference matches",
    secondAction.admin_id,
    admin.id,
  );
  TestValidator.equals(
    "Second target_entity matches",
    secondAction.target_entity,
    targetEntity,
  );
  TestValidator.equals(
    "Second target_entity_id matches",
    secondAction.target_entity_id,
    entityId,
  );
  TestValidator.equals(
    "Second result reflects input",
    secondAction.result,
    "success",
  );
  TestValidator.equals(
    "Second reason reflects input",
    secondAction.reason,
    actionReason,
  );

  // 5. Confirm both actions are stored as independent records
  TestValidator.notEquals(
    "Distinct action record IDs",
    firstAction.id,
    secondAction.id,
  );
  TestValidator.notEquals(
    "Distinct action_type properties",
    firstAction.action_type,
    secondAction.action_type,
  );
  TestValidator.equals(
    "Same admin reference",
    firstAction.admin_id,
    secondAction.admin_id,
  );
  TestValidator.equals(
    "Same entity reference",
    firstAction.target_entity,
    secondAction.target_entity,
  );
  TestValidator.equals(
    "Same entity ID reference",
    firstAction.target_entity_id,
    secondAction.target_entity_id,
  );
  TestValidator.equals(
    "Same result property",
    firstAction.result,
    secondAction.result,
  );
  TestValidator.equals(
    "Same reason property",
    firstAction.reason,
    secondAction.reason,
  );
}
