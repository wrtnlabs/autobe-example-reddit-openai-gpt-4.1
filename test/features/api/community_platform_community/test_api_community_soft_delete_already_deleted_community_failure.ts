import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test attempting to soft delete a community that has already been deleted.
 *
 * This test covers the negative scenario where a member tries to logically
 * delete a community which has already been deleted, ensuring that
 * duplicate delete attempts are handled gracefully by the API.
 *
 * Steps:
 *
 * 1. Register a member account (to establish the owner and obtain
 *    authentication credentials)
 * 2. Create a community as the authenticated member (owner)
 * 3. Soft delete (logically delete) the community (set deleted_at timestamp)
 * 4. Attempt to soft delete the same community again
 * 5. Confirm that the second delete attempt fails with not found or already
 *    deleted error
 */
export async function test_api_community_soft_delete_already_deleted_community_failure(
  connection: api.IConnection,
) {
  // 1. Register a member account (authentication required for subsequent requests)
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
  };
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);

  // 2. Create a community as the authenticated member
  const communityInput: ICommunityPlatformCommunity.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 3. Soft delete (logical delete) the community
  await api.functional.communityPlatform.member.communities.erase(connection, {
    communityId: community.id,
  });

  // 4. Attempt to soft delete the same community again
  await TestValidator.error(
    "double-soft-delete should fail with not found or already deleted error",
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        connection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
