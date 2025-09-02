import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test that a non-owner member cannot soft delete a community (should be
 * rejected by auth rules).
 *
 * This test verifies business rules prohibiting unauthorized soft deletion
 * of a community by a member other than its owner. Only the community's
 * owner or an admin may perform soft deletion (logical deletion) by setting
 * the deleted_at timestamp. This scenario walks through the registration
 * and authentication context for both owner and non-owner, and confirms the
 * system enforces correct authorization boundaries.
 *
 * **Workflow:**
 *
 * 1. Register an owner member (obtains authentication as owner)
 * 2. As owner, create a community (get its unique communityId)
 * 3. Register a second member (authentication switches context to non-owner)
 * 4. As non-owner, attempt to soft delete the community
 * 5. Confirm the operation fails and throws an authorization error
 */
export async function test_api_community_soft_delete_by_non_owner_failure(
  connection: api.IConnection,
) {
  // 1. Register owner member and obtain authentication
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = "TestOwner1234!";
  const ownerJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(ownerJoin);
  const ownerId = ownerJoin.member.id;

  // 2. Owner creates a new community
  const communityCreate =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(8),
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 3,
            wordMax: 10,
          }),
          // logo_uri and banner_uri are omitted as their types are string | undefined
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);
  const communityId = communityCreate.id;

  // 3. Register second member (non-owner) and switch authentication context
  const nonOwnerEmail = typia.random<string & tags.Format<"email">>();
  const nonOwnerPassword = "TestNonOwner1234!";
  const nonOwnerJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: nonOwnerEmail,
      password: nonOwnerPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(nonOwnerJoin);

  // 4. Attempt to perform soft delete as non-owner; must result in error
  await TestValidator.error(
    "non-owner member cannot soft delete the community",
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        connection,
        {
          communityId,
        },
      );
    },
  );
}
