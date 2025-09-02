import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validate not found error on requesting detail of non-existent or deleted
 * community.
 *
 * This test checks that the GET
 * /communityPlatform/communities/{communityId} endpoint returns a proper
 * API error (not found) when given a UUID that does NOT correspond to any
 * existing community. This includes cases where the community was
 * soft-deleted (but since no soft-delete or create API is available, only
 * non-existent scenario is tested).
 *
 * 1. Generate a random UUID to ensure the community ID does not match any real
 *    record
 * 2. Call api.functional.communityPlatform.communities.at with this random ID
 * 3. Ensure that the endpoint throws a not found error. Validate with
 *    TestValidator.error so that no data entity is leaked or returned for
 *    missing community
 * 4. (Edge case: soft-deleted community) Skipped, as no delete/create API
 *    exists for setup.
 *
 * This test ensures that no information is leaked about non-existent or
 * deleted communities and the endpoint enforces proper error signaling and
 * access control.
 */
export async function test_api_community_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for communityId
  const randomCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. When querying with a non-existent ID, the API must throw not found (error)
  await TestValidator.error(
    "non-existent community detail returns error",
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityId: randomCommunityId,
      });
    },
  );
}
