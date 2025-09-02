import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";

/**
 * E2E test for successful admin audit log retrieval of individual search
 * queries.
 *
 * This test ensures that an authenticated admin can retrieve a single
 * search query log record by ID, and that all required audit and query
 * metadata are present in the response. This supports compliance, forensic,
 * and administrative workflows.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new admin account (using POST
 *    /auth/admin/join).
 * 2. Simulate/prepare an existing search query log record ID (as fixtures or
 *    via random for test context).
 * 3. Request GET /communityPlatform/admin/search/queries/{searchQueryId} as
 *    the admin.
 * 4. Validate the returned ICommunityPlatformSearchQuery object for
 *    completeness, audit field coverage, and type correctness.
 */
export async function test_api_admin_search_query_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Strong#Passw0rd",
        display_name: RandomGenerator.name(2),
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  const adminId = adminAuth.admin.id;

  // 2. Simulate/obtain a search query log record (fixture system or random for test context)
  const fixtureSearchQuery: ICommunityPlatformSearchQuery =
    typia.random<ICommunityPlatformSearchQuery>();
  typia.assert(fixtureSearchQuery);
  const searchQueryId = fixtureSearchQuery.id;

  // 3. Admin retrieves the specific search query log record
  const log: ICommunityPlatformSearchQuery =
    await api.functional.communityPlatform.admin.search.queries.at(connection, {
      searchQueryId,
    });
  typia.assert(log);

  // 4. Full audit, metadata, and type validations
  TestValidator.equals("searchQueryId matches", log.id, searchQueryId);
  TestValidator.predicate(
    "created_at is correctly formatted",
    typeof log.created_at === "string" && !!log.created_at,
  );
  TestValidator.predicate(
    "updated_at is correctly formatted",
    typeof log.updated_at === "string" && !!log.updated_at,
  );
  TestValidator.predicate(
    "performed_at is correctly formatted",
    typeof log.performed_at === "string" && !!log.performed_at,
  );
  TestValidator.predicate(
    "search_type is present and non-empty",
    typeof log.search_type === "string" && !!log.search_type,
  );
  TestValidator.predicate(
    "query_text is present and non-empty",
    typeof log.query_text === "string" && !!log.query_text,
  );
  TestValidator.predicate(
    "Either admin_id or member_id is string/null",
    typeof log.admin_id === "string" ||
      log.admin_id === null ||
      typeof log.member_id === "string" ||
      log.member_id === null,
  );
}
