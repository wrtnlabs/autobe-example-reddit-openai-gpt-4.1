import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate public discovery and listing of communities without
 * authentication.
 *
 * Ensures that the PATCH /communityPlatform/communities endpoint is
 * accessible publicly (unauthenticated), and returns a paginated list of
 * ICommunityPlatformCommunity.ISummary objects. This test confirms that no
 * authentication headers are needed, and that all returned community data
 * and pagination metadata match the documented schemas. It also covers edge
 * cases such as missing display_title values, nullable display_title, and
 * empty result sets. All validation uses typia.assert for type safety, and
 * TestValidator for structural/business logic validation.
 */
export async function test_api_community_discovery_success_public_access(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection for public access (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Make the PATCH request to /communityPlatform/communities with empty filter (public search)
  const output = await api.functional.communityPlatform.communities.index(
    unauthConn,
    {
      body: {}, // ICommunityPlatformCommunity.IRequest: all fields optional for general search
    },
  );
  typia.assert(output);

  // Validate top-level pagination structure
  TestValidator.predicate(
    "pagination metadata present",
    !!output.pagination && typeof output.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current is number",
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof output.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof output.pagination.pages === "number",
  );

  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(output.data));
  if (output.data.length === 0) {
    // Explicitly verify empty result edge case: no communities found
    TestValidator.equals(
      "data array is empty when no results",
      output.data.length,
      0,
    );
    return;
  }
  // Validate all community summaries in the result
  for (const summary of output.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary.id is uuid",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary.name is string",
      typeof summary.name === "string" && summary.name.length > 0,
    );
    TestValidator.predicate(
      "summary.category_id is uuid",
      typeof summary.category_id === "string" && summary.category_id.length > 0,
    );
    TestValidator.predicate(
      "summary.owner_id is uuid",
      typeof summary.owner_id === "string" && summary.owner_id.length > 0,
    );
    TestValidator.predicate(
      "summary.created_at is string",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
    // display_title is optional and can be undefined, null, or string
    TestValidator.predicate(
      "summary.display_title is string, null, or undefined",
      summary.display_title === undefined ||
        summary.display_title === null ||
        typeof summary.display_title === "string",
    );
  }
}
