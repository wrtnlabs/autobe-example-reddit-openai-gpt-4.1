import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin's ability to fetch a paginated, filterable list of appeals
 * (success & filtering).
 *
 * Business context:
 *
 * - Verifies that an admin can authenticate and retrieve a list of
 *   moderation/admin appeals from the platform.
 * - Confirms that the admin can use filters (appeal_status, member_id,
 *   admin_id, created_at range) and pagination options.
 * - Asserts that the response matches paginated summary schema and that
 *   filters are respected.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin (via /auth/admin/join)
 * 2. Fetch first page of appeals with no filters, assert type and pagination
 * 3. For each filter (appeal_status, member_id, admin_id [if present],
 *    created_at window):
 *
 *    - Query appeals using the filter
 *    - Assert all results match the filter criteria
 * 4. Validate pagination by requesting limit=1 and confirm result count
 */
export async function test_api_admin_appeal_index_success_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new admin (setup auth, get token)
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Fetch appeals without filter (basic usage)
  const basicResult =
    await api.functional.communityPlatform.admin.appeals.index(connection, {
      body: {} satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic appeal index - has valid pagination/data",
    basicResult.pagination.current > 0 && Array.isArray(basicResult.data),
  );

  // 3. Filtering tests using returned sample data
  if (basicResult.data.length > 0) {
    const sampleAppeal = basicResult.data[0];

    // 3a. Filter by appeal_status
    const statusFiltered =
      await api.functional.communityPlatform.admin.appeals.index(connection, {
        body: {
          appeal_status: sampleAppeal.appeal_status,
        } satisfies ICommunityPlatformAppeal.IRequest,
      });
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "all results have filtered appeal_status",
      statusFiltered.data.every(
        (a) => a.appeal_status === sampleAppeal.appeal_status,
      ),
    );

    // 3b. Filter by member_id
    const memberFiltered =
      await api.functional.communityPlatform.admin.appeals.index(connection, {
        body: {
          member_id: sampleAppeal.member_id,
        } satisfies ICommunityPlatformAppeal.IRequest,
      });
    typia.assert(memberFiltered);
    TestValidator.predicate(
      "all results have filtered member_id",
      memberFiltered.data.every((a) => a.member_id === sampleAppeal.member_id),
    );

    // 3c. Filter by admin_id (if present)
    if (sampleAppeal.admin_id !== null && sampleAppeal.admin_id !== undefined) {
      const adminFiltered =
        await api.functional.communityPlatform.admin.appeals.index(connection, {
          body: {
            admin_id: sampleAppeal.admin_id,
          } satisfies ICommunityPlatformAppeal.IRequest,
        });
      typia.assert(adminFiltered);
      TestValidator.predicate(
        "all results have filtered admin_id",
        adminFiltered.data.every((a) => a.admin_id === sampleAppeal.admin_id),
      );
    }

    // 3d. Filter by created_at window (single record timeframe)
    const createdAt = sampleAppeal.created_at;
    const timeWindowFiltered =
      await api.functional.communityPlatform.admin.appeals.index(connection, {
        body: {
          created_at_from: createdAt,
          created_at_to: createdAt,
        } satisfies ICommunityPlatformAppeal.IRequest,
      });
    typia.assert(timeWindowFiltered);
    TestValidator.predicate(
      "all results are within filtered created_at window",
      timeWindowFiltered.data.every((a) => a.created_at === createdAt),
    );
  }

  // 4. Pagination test: limit=1 (only if data exists)
  const pagedResult =
    await api.functional.communityPlatform.admin.appeals.index(connection, {
      body: { page: 1, limit: 1 } satisfies ICommunityPlatformAppeal.IRequest,
    });
  typia.assert(pagedResult);
  if (pagedResult.data.length > 0) {
    TestValidator.equals(
      "paged results length matches limit",
      pagedResult.data.length,
      1,
    );
  }
  TestValidator.equals(
    "pagination limit matches request",
    pagedResult.pagination.limit,
    1,
  );
}
