import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test successful soft deletion of a community by its owner (logical
 * delete).
 *
 * Scenario:
 *
 * 1. Register a new member who will become the owner.
 * 2. Create a community as this member (authenticated context).
 * 3. Soft delete the community as the owner, expecting the operation to
 *    succeed.
 *
 * This covers the owner flow and verifies authorization, community
 * creation, and logical (soft) delete. The business requirement is that
 * only owners/admins can soft-delete, and the deleted_at field is set (but
 * not directly verifiable since no GET-by-id is available in the API
 * contracts after deletion: this test just ensures operation completes
 * without error and that "erase" works by role).
 */
export async function test_api_community_soft_delete_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register a new member account as the owner
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const joinResp = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResp);
  const member = joinResp.member;

  // 2. Create community with only required/optional fields, omitting logo_uri and banner_uri (they must be omitted if not string, null is not valid)
  const communityCreateInput: ICommunityPlatformCommunity.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateInput },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner matches registered member",
    community.owner_id,
    member.id,
  );

  // 3. Soft-delete (logical delete) as owner: operation must succeed
  await api.functional.communityPlatform.member.communities.erase(connection, {
    communityId: community.id,
  });

  // 4. Assert operation completed (no error thrown means success)
  TestValidator.predicate("soft-delete by owner completes without error", true);
}
