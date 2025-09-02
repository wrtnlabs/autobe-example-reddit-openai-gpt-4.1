import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Retrieve a list of community members (memberships) for a valid
 * community
 *
 * This test covers the full flow:
 *
 * 1. Register a new user (primary member — future community owner)
 * 2. Create a new community as this user
 * 3. Join the created community as the owner (initial membership)
 * 4. Register another member, join them to the same community
 * 5. Retrieve the list of memberships for the community using the PATCH API
 * 6. Validate both owner and additional member are present with correct
 *    records
 */
export async function test_api_community_membership_list_success(
  connection: api.IConnection,
) {
  // 1. Register the community owner (also authenticates connection)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(10);
  const ownerDisplayName = RandomGenerator.name();
  const ownerAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: ownerDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(ownerAuth);
  const ownerId = ownerAuth.member.id;

  // 2. Create a new community (as owner)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const communityName = RandomGenerator.alphaNumeric(8);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: categoryId,
          name: communityName,
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;
  TestValidator.equals(
    "community owner should match creator",
    community.owner_id,
    ownerId,
  );

  // 3. Join community as the owner
  const ownerMembership =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId: communityId,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(ownerMembership);
  TestValidator.equals(
    "membership is for same user",
    ownerMembership.member_id,
    ownerId,
  );
  TestValidator.equals(
    "membership is for this community",
    ownerMembership.community_id,
    communityId,
  );

  // 4. Register another member and join them to the community
  const additionalEmail = typia.random<string & tags.Format<"email">>();
  const additionalPassword = RandomGenerator.alphaNumeric(10);
  const additionalDisplayName = RandomGenerator.name();
  const additionalAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: additionalEmail,
      password: additionalPassword,
      display_name: additionalDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(additionalAuth);
  const additionalMemberId = additionalAuth.member.id;
  // After join, connection has additional member's token: join them to community
  const additionalMembership =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId: communityId,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(additionalMembership);
  TestValidator.equals(
    "additional member_id on membership",
    additionalMembership.member_id,
    additionalMemberId,
  );
  TestValidator.equals(
    "shared community_id for additional member",
    additionalMembership.community_id,
    communityId,
  );

  // 5. Switch back to owner (re-authenticate using join)
  await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: ownerDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 6. Retrieve membership list for the community as owner using PATCH endpoint
  const page =
    await api.functional.communityPlatform.member.communities.memberships.index(
      connection,
      {
        communityId: communityId,
        body: {} satisfies ICommunityPlatformCommunityMembership.IRequest,
      },
    );
  typia.assert(page);

  // Validate both members exist in membership data and communityId matches
  TestValidator.predicate(
    "At least both owner and additional member present in membership list",
    page.data.some((m) => m.member_id === ownerId) &&
      page.data.some((m) => m.member_id === additionalMemberId),
  );
  TestValidator.equals(
    "correct community_id in all memberships",
    page.data.every((m) => m.community_id === communityId),
    true,
  );
  TestValidator.equals(
    "list pagination minimum records = 2",
    page.data.length >= 2,
    true,
  );
}
