import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";
import type { IPageICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchQuery";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * End-to-end test for admin search query log retrieval (success case).
 *
 * This test simulates an administrator querying platform search query logs
 * using a wide set of filters and pagination options. The flow ensures:
 *
 * - An admin user can be created and authenticated successfully
 * - The PATCH /communityPlatform/admin/search/queries endpoint enforces admin
 *   authentication and returns paginated
 *   ICommunityPlatformSearchQuery.ISummary results
 * - Search, filtering, and pagination return well-formed log summaries
 *   matching the criteria
 * - Pagination metadata is correct and response includes the expected
 *   properties
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user (via /auth/admin/join)
 * 2. As admin, request search query logs with several filters, pagination and
 *    sorting applied
 * 3. Validate the response structure (pagination and data array), and check
 *    data fields match the filters sent
 *
 * The test exercises both a basic page-limit filter and complex audit
 * filters such as query_text, search_type, performed_at_start/end, and
 * admin_id. It ensures the endpoint fulfills the business requirement for
 * admin-side system audit and analytics.
 */
export async function test_api_admin_search_queries_index_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);

  // 2. Prepare complex filters and pagination request for logs
  const now = new Date();
  const searchRequest: ICommunityPlatformSearchQuery.IRequest = {
    page: 1,
    limit: 10,
    query_text: RandomGenerator.pick([
      null,
      RandomGenerator.paragraph({ sentences: 2 }),
    ]),
    search_type: RandomGenerator.pick([null, "post", "community", "comment"]),
    admin_id: adminJoinResult.admin.id,
    performed_at_start: now.toISOString(),
    performed_at_end: new Date(
      now.getTime() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    sort_by: RandomGenerator.pick([null, "performed_at", "query_text"]),
    sort_direction: RandomGenerator.pick([null, "asc", "desc"]),
    context: RandomGenerator.pick([null, "home", "explore", "sidebar"]),
    ip: null,
    member_id: null,
  };

  // 3. Execute the PATCH /communityPlatform/admin/search/queries endpoint as admin
  const response =
    await api.functional.communityPlatform.admin.search.queries.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have positive limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // Validate result data is array of summaries
  TestValidator.predicate("data should be array", Array.isArray(response.data));
  if (response.data.length > 0) {
    response.data.forEach((entry) => {
      typia.assert(entry);
      if (searchRequest.admin_id) {
        TestValidator.equals(
          "log admin_id matches filter",
          entry.admin_id,
          searchRequest.admin_id,
        );
      }
      if (searchRequest.query_text) {
        TestValidator.predicate(
          "entry.query_text should contain filter",
          entry.query_text.includes(searchRequest.query_text!),
        );
      }
      if (searchRequest.search_type) {
        TestValidator.equals(
          "entry.search_type matches filter",
          entry.search_type,
          searchRequest.search_type,
        );
      }
      if (searchRequest.context) {
        TestValidator.equals(
          "entry.context matches filter",
          entry.context,
          searchRequest.context,
        );
      }
      if (searchRequest.performed_at_start) {
        TestValidator.predicate(
          "entry.performed at >= filter start",
          entry.performed_at >= searchRequest.performed_at_start!,
        );
      }
      if (searchRequest.performed_at_end) {
        TestValidator.predicate(
          "entry.performed at <= filter end",
          entry.performed_at <= searchRequest.performed_at_end!,
        );
      }
    });
  }
}
