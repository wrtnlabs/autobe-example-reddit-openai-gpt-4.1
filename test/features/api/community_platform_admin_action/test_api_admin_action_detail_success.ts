import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import type { IPageICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an authenticated admin can retrieve details for a specific
 * admin/moderation action by unique ID.
 *
 * This comprehensive test ensures that the admin action detail endpoint
 * returns correct data only for authenticated admin users:
 *
 * 1. Admin registration (POST /auth/admin/join)
 * 2. Index/search for admin actions to obtain a valid ID (PATCH
 *    /communityPlatform/admin/adminActions)
 * 3. Fetch detail for that ID (GET
 *    /communityPlatform/admin/adminActions/{adminActionId})
 * 4. Assert that the returned record matches the requested ID and satisfies
 *    the shape of ICommunityPlatformAdminAction
 *
 * Also verifies full type safety and correct business logic.
 */
export async function test_api_admin_action_detail_success(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const admin = joinResult.admin;

  // 2. Search admin actions (get at least one ID)
  const indexResult =
    await api.functional.communityPlatform.admin.adminActions.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformAdminAction.IRequest,
      },
    );
  typia.assert(indexResult);
  const actions = indexResult.data;
  TestValidator.predicate(
    "at least one admin action exists for detail look-up",
    Array.isArray(actions) && actions.length > 0,
  );

  // 3. Select first adminActionId for detail
  const actionId = actions[0].id;

  // 4. Fetch admin action detail
  const detail = await api.functional.communityPlatform.admin.adminActions.at(
    connection,
    {
      adminActionId: actionId,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "fetched adminAction.id matches request",
    detail.id,
    actionId,
  );
}
