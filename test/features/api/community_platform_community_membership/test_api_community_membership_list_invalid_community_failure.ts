import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that querying community memberships for a non-existent community
 * fails as expected.
 *
 * Business context: Access to a community's memberships requires a valid,
 * existing communityId. The API must reject requests referencing deleted or
 * invalid communities.
 *
 * Steps in this test:
 *
 * 1. Register and authenticate a new member to supply the required
 *    authorization context (via /auth/member/join).
 * 2. Attempt to list memberships for a communityId that is guaranteed not to
 *    exist (using a random UUID).
 * 3. Confirm the operation fails: verify that an error is thrown (ideally 404
 *    not found or equivalent), and that no data is returned for the invalid
 *    community.
 */
export async function test_api_community_membership_list_invalid_community_failure(
  connection: api.IConnection,
) {
  // 1. Register a member for authentication context
  const newMember = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(newMember);

  // 2. Attempt to retrieve memberships for a non-existent community UUID
  await TestValidator.error(
    "should fail to list memberships for invalid community id",
    async () => {
      await api.functional.communityPlatform.member.communities.memberships.index(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies ICommunityPlatformCommunityMembership.IRequest,
        },
      );
    },
  );
}
