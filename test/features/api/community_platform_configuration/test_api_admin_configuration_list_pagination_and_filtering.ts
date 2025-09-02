import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for admin paginated and filtered configuration listing.
 *
 * Scenario:
 *
 * - Ensures that an authenticated admin can list all configuration records
 *   with/without filters and paging.
 * - Covers basic list, exact key filtering, text query search, and paging
 *   mechanics.
 * - Illustrates soft-delete visibility logic (commented out due to lack of
 *   delete API). If a soft-delete API existed, the test would also check
 *   default exclusion and inclusion (via includeDeleted flag); see inline
 *   comments.
 * - Verifies that all steps proceed without authentication errors following
 *   prerequisite admin join.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user for session context.
 * 2. Create multiple configuration records with unique
 *    keys/values/descriptions.
 * 3. List all configs; validate all created configs are present.
 * 4. Filter list by exact key, confirming only correct config returned.
 * 5. Filter by substring search (q), ensuring relevant config is in results.
 * 6. Paginate results (limit/page) and validate paging metadata/content.
 * 7. (Skipped) Soft-delete visibility: see notes — would require delete API to
 *    fully validate.
 *
 * All validations utilize strict type checks and business-logic assertions.
 */
export async function test_api_admin_configuration_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create several configurations (unique keys/values)
  const configInputs: ICommunityPlatformConfiguration.ICreate[] =
    ArrayUtil.repeat(5, (idx) => ({
      key: `key_${RandomGenerator.alphaNumeric(6)}_${idx}`,
      value: `value_${RandomGenerator.alphaNumeric(8)}_${idx}`,
      description: `Auto-generated config ${idx}`,
    }));
  const configs: ICommunityPlatformConfiguration[] = [];
  for (const input of configInputs) {
    const conf =
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: input,
        },
      );
    typia.assert(conf);
    configs.push(conf);
  }

  // 3. List all configs. Should include all just created.
  const pageAll =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "all created configs appear in list",
    configs.every((c) => pageAll.data.some((d) => d.id === c.id)),
  );

  // 4. Filter by exact key
  const searchByKey = configs[0].key;
  const pageKey =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          key: searchByKey,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(pageKey);
  TestValidator.equals(
    "only one config matches exact key",
    pageKey.data.length,
    1,
  );
  TestValidator.equals(
    "config id matches filtered key",
    pageKey.data[0].id,
    configs[0].id,
  );

  // 5. Text search (q) using substring of config value
  const searchPhrase = configs[2].value.substring(0, 5);
  const pageQ =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          q: searchPhrase,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(pageQ);
  TestValidator.predicate(
    "filtered configs contain search config by value substring",
    pageQ.data.some((d) => d.id === configs[2].id),
  );

  // 6. Pagination: request limit=2, test page 1 and page 2
  const page1 =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 contains two configs", page1.data.length, 2);
  TestValidator.equals(
    "page 1 metadata is correct",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 metadata limit", page1.pagination.limit, 2);
  const page2 =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          limit: 2,
          page: 2,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 contains two configs", page2.data.length, 2);
  TestValidator.equals(
    "page 2 metadata is correct",
    page2.pagination.current,
    2,
  );

  // 7. SOFT-DELETE scenario is skipped (requires a delete endpoint). As the API does not provide a soft-delete operation, inclusion/exclusion of soft-deleted configs cannot be validated in E2E.
  // If a soft-delete API existed, would soft-delete one config, then:
  // - Confirm default list excludes it
  // - Confirm includeDeleted=true shows it

  // 8. No authentication/authorization errors should have occurred; all done in valid admin session context.
}
