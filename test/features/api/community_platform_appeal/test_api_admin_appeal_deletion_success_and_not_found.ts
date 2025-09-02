import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";

/**
 * Validates that an admin can permanently delete an appeal and that
 * attempts to delete already deleted or non-existent appeals fail as
 * expected.
 *
 * Business context: In a community platform, appeals may be filed by
 * members for moderation or admin actions. Admins must be able to
 * permanently delete appeals (e.g., if filed in error or for
 * privacy/compliance reasons), but once deleted, the appeal should not be
 * deletable again. Attempts to delete non-existent appeals should also
 * yield clear errors.
 *
 * Workflow:
 *
 * 1. Register and authenticate an admin.
 * 2. Register and authenticate a member.
 * 3. As the member, file an appeal against a fresh admin action id (with
 *    status 'submitted').
 * 4. As the admin, delete the newly created appeal.
 * 5. Attempt to delete the same appeal again; verify that an appropriate error
 *    is returned.
 * 6. Attempt to delete a random non-existent appeal id; verify consistent
 *    error response.
 *
 * Note: No 'read' endpoint exists for appeals, so deletion is confirmed
 * indirectly by the error on repeated deletion attempts.
 *
 * Steps use proper role authentication switching and strict type safety at
 * each step.
 */
export async function test_api_admin_appeal_deletion_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register a new member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 3. Switch to member context and file an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const adminActionId = typia.random<string & tags.Format<"uuid">>();
  const appeal = await api.functional.communityPlatform.member.appeals.create(
    connection,
    {
      body: {
        admin_action_id: adminActionId,
        appeal_status: "submitted",
        decision_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  const appealId = appeal.id;

  // 4. Switch back to admin and erase the appeal
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  await api.functional.communityPlatform.admin.appeals.erase(connection, {
    appealId: appealId,
  });

  // 5. Attempt to delete the same appeal again - should yield error
  await TestValidator.error(
    "attempt to erase already deleted appeal should fail",
    async () => {
      await api.functional.communityPlatform.admin.appeals.erase(connection, {
        appealId: appealId,
      });
    },
  );

  // 6. Attempt to delete a random non-existent appeal id - should yield error
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "attempt to erase non-existent appeal should fail",
    async () => {
      await api.functional.communityPlatform.admin.appeals.erase(connection, {
        appealId: nonExistentAppealId,
      });
    },
  );
}
