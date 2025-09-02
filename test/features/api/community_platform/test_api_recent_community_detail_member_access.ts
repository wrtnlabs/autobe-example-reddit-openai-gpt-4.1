import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";

export async function test_api_recent_community_detail_member_access(
  connection: api.IConnection,
) {
  // 1. Register member and establish auth context
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.member.id;

  // 2. Create a community as this member (must supply required category_id and name)
  const communityInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    // logo_uri and banner_uri omitted since they are string | undefined only
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);
  const communityId = community.id;

  // 3. Add to recent communities (maps the community to this user)
  const addRecent =
    await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
      connection,
      {
        communityId,
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(addRecent);
  const recentCommunityId = addRecent.id;

  // 4. Retrieve details and validate correctness
  const recentDetail =
    await api.functional.communityPlatform.member.communities.recentCommunities.at(
      connection,
      {
        communityId,
        recentCommunityId,
      },
    );
  typia.assert(recentDetail);
  TestValidator.equals(
    "recent record member id matches member",
    recentDetail.member_id,
    memberId,
  );
  TestValidator.equals(
    "recent record community id matches",
    recentDetail.community_id,
    communityId,
  );
  TestValidator.predicate(
    "recent record has non-null touched_at timestamp",
    recentDetail.touched_at !== null &&
      typeof recentDetail.touched_at === "string",
  );

  // 5. Attempt to get a non-existent recentCommunityId (must fail)
  await TestValidator.error(
    "error thrown for non-existent recent community entry",
    async () => {
      await api.functional.communityPlatform.member.communities.recentCommunities.at(
        connection,
        {
          communityId,
          recentCommunityId: typia.random<string & tags.Format<"uuid">>(), // random unrelated UUID
        },
      );
    },
  );

  // 6. (Optional) Register a second member and verify access control
  const member2Input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password2!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: member2Input,
  });
  typia.assert(member2Auth);
  // Add the same community as recent for member2
  const addRecent2 =
    await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
      connection,
      {
        communityId,
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(addRecent2);
  // member1 attempts to access member2's recentCommunityId should fail
  await TestValidator.error(
    "error thrown when accessing another member's recent community entry",
    async () => {
      await api.functional.communityPlatform.member.communities.recentCommunities.at(
        connection,
        {
          communityId,
          recentCommunityId: addRecent2.id,
        },
      );
    },
  );
}
