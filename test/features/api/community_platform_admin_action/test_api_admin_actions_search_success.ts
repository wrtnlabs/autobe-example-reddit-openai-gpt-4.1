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
 * Test successful search and retrieval of the admin/moderation action audit
 * log by an authenticated admin.
 *
 * 1. Register and authenticate a new admin with random valid credentials by
 *    POST /auth/admin/join.
 * 2. Extract the admin ID from the authentication result for controlled
 *    filtering.
 * 3. Call PATCH /communityPlatform/admin/adminActions with a filter on
 *    admin_id (restrict to actions by this admin only).
 * 4. Include other combinations of filters: action_type, target_entity,
 *    pagination (page/limit), and sort options (sort_by/sort_dir).
 * 5. Assert that all returned actions belong to this admin (if filtered by
 *    admin_id), each action matches all filters, and no record violates
 *    access restrictions.
 * 6. Assert result pagination is consistent (pagination limit/page), and all
 *    result records are proper ICommunityPlatformAdminAction objects.
 */
export async function test_api_admin_actions_search_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name(2);
  const joinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinOutput);
  const adminId = joinOutput.admin.id;
  // 2. Construct diverse filter input
  const filterInput: ICommunityPlatformAdminAction.IRequest = {
    admin_id: adminId,
    action_type: RandomGenerator.pick([
      "delete_post",
      "suspend_user",
      "restore_community",
    ] as const),
    target_entity: RandomGenerator.pick([
      "community",
      "post",
      "comment",
      "user",
      "membership",
    ] as const),
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_dir: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies ICommunityPlatformAdminAction.IRequest;
  // 3. Perform the search as authenticated admin
  const searchResult =
    await api.functional.communityPlatform.admin.adminActions.index(
      connection,
      {
        body: filterInput,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination properties
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
  // 5. Validate each returned action matches the filter
  for (const action of searchResult.data) {
    typia.assert(action);
    TestValidator.equals(
      "action belongs to filtered admin_id",
      action.admin_id,
      adminId,
    );
    TestValidator.equals(
      "action_type matches filter",
      action.action_type,
      filterInput.action_type,
    );
    TestValidator.equals(
      "target_entity matches filter",
      action.target_entity,
      filterInput.target_entity,
    );
  }
}
