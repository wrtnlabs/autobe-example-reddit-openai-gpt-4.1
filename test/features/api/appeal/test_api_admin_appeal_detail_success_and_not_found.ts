import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";

/**
 * Test admin appeal detail retrieval and not found handling.
 *
 * Validates that an admin can fetch the details of an appeal by ID, and
 * that the system returns an error for non-existent appeal IDs.
 *
 * Steps:
 *
 * 1. Register a new admin (random email/password)
 * 2. Register a new member (random email/password)
 * 3. Log in as the member and create an appeal (random admin_action_id,
 *    'submitted' status)
 * 4. Switch to admin authentication
 * 5. Fetch the appeal detail with valid ID and assert correctness
 * 6. Attempt to fetch with a random (invalid/non-existent) uuid and assert
 *    error handling
 */
export async function test_api_admin_appeal_detail_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongAdminPw123!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "StrongMemberPw123!";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 3. Member login and create an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const adminActionId = typia.random<string & tags.Format<"uuid">>();
  const appealStatus = "submitted";
  const createAppeal =
    await api.functional.communityPlatform.member.appeals.create(connection, {
      body: {
        admin_action_id: adminActionId,
        appeal_status: appealStatus,
        decision_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformAppeal.ICreate,
    });
  typia.assert(createAppeal);

  // 4. Admin login for authorized context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Fetch the appeal detail with valid appealId
  const fetchedAppeal = await api.functional.communityPlatform.admin.appeals.at(
    connection,
    {
      appealId: createAppeal.id,
    },
  );
  typia.assert(fetchedAppeal);
  TestValidator.equals(
    "admin can fetch appeal by id",
    fetchedAppeal.id,
    createAppeal.id,
  );

  // 6. Attempt to fetch an invalid (non-existent) appealId and validate error handling
  const invalidAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching an invalid or non-existent appealId returns error (not found)",
    async () => {
      await api.functional.communityPlatform.admin.appeals.at(connection, {
        appealId: invalidAppealId,
      });
    },
  );
}
