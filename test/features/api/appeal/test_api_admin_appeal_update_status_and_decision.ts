import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";

/**
 * Test the admin appeal update workflow for status, rationale, and reviewer
 * assignment, including error cases for validation and business rules.
 *
 * 1. Register admin and member users (store separate credentials for
 *    login/role switching).
 * 2. Member submits a new appeal (mocking a valid admin_action_id).
 * 3. Switch to admin role.
 * 4. Admin updates the appeal status and decision_reason ("under_review",
 *    "resolved", "rejected" etc), assigns admin_id.
 * 5. Validate that update is persisted (status, admin_id, rationale,
 *    updated_at logic).
 * 6. Attempt to update using an invalid status value - expect error.
 * 7. Attempt to update a non-existent appealId - expect error.
 */
export async function test_api_admin_appeal_update_status_and_decision(
  connection: api.IConnection,
) {
  // 1. Register admin user
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

  // 2. Register member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(14);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const memberId = memberJoin.member.id;

  // 3. Member files an appeal
  // (simulate a mocked admin_action_id for the appeal, random uuid format)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const adminActionId = typia.random<string & tags.Format<"uuid">>();
  const originalDecisionReason = RandomGenerator.paragraph({ sentences: 3 });
  const appeal = await api.functional.communityPlatform.member.appeals.create(
    connection,
    {
      body: {
        admin_action_id: adminActionId,
        appeal_status: "submitted",
        decision_reason: originalDecisionReason,
      } satisfies ICommunityPlatformAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  const appealId = appeal.id;

  // 4. Switch to admin role
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Admin updates: change status to 'under_review', set rationale/owner
  const firstDecisionReason = RandomGenerator.paragraph({ sentences: 5 });
  const firstUpdate =
    await api.functional.communityPlatform.admin.appeals.update(connection, {
      appealId,
      body: {
        appeal_status: "under_review",
        decision_reason: firstDecisionReason,
        admin_id: adminId,
      } satisfies ICommunityPlatformAppeal.IUpdate,
    });
  typia.assert(firstUpdate);
  TestValidator.equals(
    "appeal status updated to under_review",
    firstUpdate.appeal_status,
    "under_review",
  );
  TestValidator.equals("appeal admin assigned", firstUpdate.admin_id, adminId);
  TestValidator.equals(
    "decision_reason updated to first update",
    firstUpdate.decision_reason,
    firstDecisionReason,
  );
  TestValidator.notEquals(
    "updated_at changed after first update",
    firstUpdate.updated_at,
    appeal.updated_at,
  );

  // 6. Admin updates: change status to 'resolved' with new rationale
  const finalDecisionReason = RandomGenerator.paragraph({ sentences: 4 });
  const resolvedUpdate =
    await api.functional.communityPlatform.admin.appeals.update(connection, {
      appealId,
      body: {
        appeal_status: "resolved",
        decision_reason: finalDecisionReason,
      } satisfies ICommunityPlatformAppeal.IUpdate,
    });
  typia.assert(resolvedUpdate);
  TestValidator.equals(
    "appeal status updated to resolved",
    resolvedUpdate.appeal_status,
    "resolved",
  );
  TestValidator.equals(
    "decision_reason updated for resolved",
    resolvedUpdate.decision_reason,
    finalDecisionReason,
  );
  TestValidator.notEquals(
    "updated_at changed for resolved",
    resolvedUpdate.updated_at,
    firstUpdate.updated_at,
  );

  // 7. Attempt to update appeal with invalid status value
  await TestValidator.error(
    "invalid appeal_status update should fail",
    async () => {
      await api.functional.communityPlatform.admin.appeals.update(connection, {
        appealId,
        body: {
          appeal_status: "not_a_valid_status",
        } satisfies ICommunityPlatformAppeal.IUpdate,
      });
    },
  );

  // 8. Attempt to update non-existent appealId
  await TestValidator.error(
    "update non-existent appealId should fail",
    async () => {
      await api.functional.communityPlatform.admin.appeals.update(connection, {
        appealId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          appeal_status: "resolved",
        } satisfies ICommunityPlatformAppeal.IUpdate,
      });
    },
  );
}
