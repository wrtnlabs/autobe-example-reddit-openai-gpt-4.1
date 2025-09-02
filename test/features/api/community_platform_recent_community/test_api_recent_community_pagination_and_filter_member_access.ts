import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import type { IPageICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRecentCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test the recent communities pagination and filter logic for a member.
 *
 * This test covers end-to-end flow:
 *
 * 1. Register as a new member
 * 2. Create several communities
 * 3. Add each community to recent list (simulate recent visit activity)
 * 4. List recent communities with pagination (page=1, limit=5), check contents
 *    and order
 * 5. List recent communities for page=2 (remaining results), check boundaries
 * 6. Filter by member_display_name and expect results are correctly scoped
 * 7. Register a second member, check their recent list is empty
 * 8. Validate consistency and type assertions at every step
 */
export async function test_api_recent_community_pagination_and_filter_member_access(
  connection: api.IConnection,
) {
  // 1. Register member
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: newEmail,
      password: newPassword,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const memberId = joinResult.member.id;

  // 2. Create communities with randomized categories
  const CATEGORIES = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 7; ++i) {
    const categoryId = RandomGenerator.pick(CATEGORIES);
    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            category_id: categoryId,
            name: `testcomm-${RandomGenerator.alphaNumeric(8)}-${i}`,
            display_title: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 7 }),
            // logo_uri and banner_uri are omitted to match DTO (string|undefined)
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 3. Add each community to recent
  for (const community of communities) {
    const recent =
      await api.functional.communityPlatform.member.communities.recentCommunities.addToRecentCommunities(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformRecentCommunity.ICreate,
        },
      );
    typia.assert(recent);
  }

  // 4. List (page 1, limit 5)
  const contextCommunity = communities[communities.length - 1];
  const resp1 =
    await api.functional.communityPlatform.member.communities.recentCommunities.index(
      connection,
      {
        communityId: contextCommunity.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformRecentCommunity.IRequest,
      },
    );
  typia.assert(resp1);
  TestValidator.equals(
    "pagination current page is 1",
    resp1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", resp1.pagination.limit, 5);
  TestValidator.predicate("first page count <= 5", resp1.data.length <= 5);

  // 5. List (page 2, limit 5)
  const resp2 =
    await api.functional.communityPlatform.member.communities.recentCommunities.index(
      connection,
      {
        communityId: contextCommunity.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformRecentCommunity.IRequest,
      },
    );
  typia.assert(resp2);
  TestValidator.equals(
    "pagination current page is 2",
    resp2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5 (2nd page)",
    resp2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "second page count is correct",
    resp2.data.length,
    Math.max(0, communities.length - 5),
  );

  // Ensure correct recency sort order (touched_at desc)
  const allData = [...resp1.data, ...resp2.data];
  for (let i = 1; i < allData.length; ++i) {
    TestValidator.predicate(
      `recent communities sorted order [${i}]`,
      new Date(allData[i - 1].touched_at).getTime() >=
        new Date(allData[i].touched_at).getTime(),
    );
  }
  // Ensure all IDs are unique and belong to created communities
  const createdIds = new Set(communities.map((c) => c.id));
  const seenIds = new Set<string>();
  for (const row of allData) {
    TestValidator.predicate(
      "row community belongs to created",
      createdIds.has(row.community_id),
    );
    TestValidator.equals("recent for correct member", row.member_id, memberId);
    TestValidator.predicate("no duplicate row ids", !seenIds.has(row.id));
    seenIds.add(row.id);
  }

  // 6. Filter by member_display_name
  const filterResp =
    await api.functional.communityPlatform.member.communities.recentCommunities.index(
      connection,
      {
        communityId: contextCommunity.id,
        body: {
          member_display_name: displayName,
        } satisfies ICommunityPlatformRecentCommunity.IRequest,
      },
    );
  typia.assert(filterResp);
  for (const row of filterResp.data) {
    TestValidator.equals("member display name filter", row.member_id, memberId);
  }

  // 7. Register second member, ensure their recent list is empty
  const secondJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondJoin);

  // SDK manages authentication automatically for the second member
  const asSecondMember = connection;
  const emptyResp =
    await api.functional.communityPlatform.member.communities.recentCommunities.index(
      asSecondMember,
      {
        communityId: contextCommunity.id,
        body: {} satisfies ICommunityPlatformRecentCommunity.IRequest,
      },
    );
  typia.assert(emptyResp);
  TestValidator.equals(
    "second member has zero recents",
    emptyResp.data.length,
    0,
  );
}
