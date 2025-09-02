import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";

/**
 * Test successful update of an admin action via PUT
 * /communityPlatform/admin/adminActions/{adminActionId}.
 *
 * This test covers the full success scenario to update a moderation/admin
 * audit log record:
 *
 * 1. Register a new admin and authenticate (ensures proper privileges for
 *    update operation)
 * 2. Create a new admin action audit entry (records action_type, target_entity
 *    details)
 * 3. Update the just-created admin action record (modifying result and/or
 *    reason fields)
 * 4. Validate API response:
 *
 *    - Confirm that specified fields are updated (reason/result)
 *    - Confirm that unchanged/audit-critical fields (admin_id, target_entity_id,
 *         created_at, etc.) remain correct
 *    - Verify persistence of record ID and admin linkage
 * 5. Confirm audit requirements (timestamps, admin linkage) are satisfied
 */
export async function test_api_admin_action_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin (provides token in connection automatically)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const baseAdminJoin: ICommunityPlatformAdmin.IJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: baseAdminJoin,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;

  // 2. Create an admin action entry (must be logged in as this admin)
  const baseAdminActionCreate: ICommunityPlatformAdminAction.ICreate = {
    admin_id: admin.id,
    action_type: RandomGenerator.pick([
      "delete_post",
      "suspend_user",
      "restore_community",
      "lock_thread",
      "approve_content",
    ] as const),
    target_entity: RandomGenerator.pick([
      "community",
      "post",
      "comment",
      "user",
      "membership",
    ] as const),
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 12,
    }),
    result: "pending",
  };
  const adminAction =
    await api.functional.communityPlatform.admin.adminActions.create(
      connection,
      { body: baseAdminActionCreate },
    );
  typia.assert(adminAction);

  // 3. Prepare updated fields (mutate either or both reason/result)
  const updatedReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
    wordMin: 6,
    wordMax: 15,
  });
  const updatedResult = RandomGenerator.pick([
    "success",
    "error",
    "restored",
    "rejected",
  ] as const);
  const updateBody: ICommunityPlatformAdminAction.IUpdate = {
    reason: updatedReason,
    result: updatedResult,
  };

  // 4. Update the action record
  const updatedAction =
    await api.functional.communityPlatform.admin.adminActions.update(
      connection,
      {
        adminActionId: adminAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // 5. Assert that updated fields are reflected & important fields are unchanged
  TestValidator.equals(
    "adminAction.id remains the same",
    updatedAction.id,
    adminAction.id,
  );
  TestValidator.equals(
    "admin reference remains correct",
    updatedAction.admin_id,
    admin.id,
  );
  TestValidator.equals(
    "target_entity and id unchanged",
    updatedAction.target_entity,
    adminAction.target_entity,
  );
  TestValidator.equals(
    "target_entity_id unchanged",
    updatedAction.target_entity_id,
    adminAction.target_entity_id,
  );
  TestValidator.equals(
    "updated reason is reflected",
    updatedAction.reason,
    updatedReason,
  );
  TestValidator.equals(
    "updated result is reflected",
    updatedAction.result,
    updatedResult,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedAction.created_at,
    adminAction.created_at,
  );
}
