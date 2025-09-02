import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated rule list retrieval and permission constraints.
 *
 * This test ensures:
 *
 * - Community owners can list rules with pagination/filter
 * - More than one rule exists, so pagination is meaningful
 * - Returned data matches input (rule text/index)
 * - Non-owner/non-admin member access to rule list is forbidden or properly
 *   restricted by permission/business logic
 *
 * 1. Register the owner member account, then join/login (auth context)
 * 2. Create a new community as this member (extract communityId)
 * 3. Add 3+ rules to the community so pagination can be tested
 * 4. Fetch rules via PATCH endpoint as owner, passing explicit page/limit
 *    (e.g., page: 1, limit: 2), verify pagination and result order/data
 * 5. Register a second member (not owner), change auth context
 * 6. Attempt to list rules as non-owner (should receive error or restricted
 *    result per business logic)
 *
 * Validation details:
 *
 * - Owner gets all data for their own rules, data matches what was created
 * - Non-owner gets forbidden or error on the PATCH rules endpoint
 */
export async function test_api_community_rule_list_pagination_and_permission(
  connection: api.IConnection,
) {
  // 1. Owner registration
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: "StrongPassword123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(ownerAuth);
  const ownerId = ownerAuth.member.id;

  // 2. Create community as the owner
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.name(2),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;

  // 3. Add multiple rules
  const ruleDefs = [
    { rule_index: 0, rule_line: "No spamming" },
    { rule_index: 1, rule_line: "Be respectful" },
    { rule_index: 2, rule_line: "No off-topic posts" },
  ];
  const createdRules = [];
  for (const rule of ruleDefs) {
    const created =
      await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
        connection,
        {
          communityId,
          body: rule as ICommunityPlatformCommunityRule.ICreate,
        },
      );
    typia.assert(created);
    createdRules.push(created);
  }

  // 4. Owner requests paginated rules (page 1, limit 2)
  const page1 =
    await api.functional.communityPlatform.member.communities.rules.indexCommunityRules(
      connection,
      {
        communityId,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination meta page 1", page1.pagination.current, 1);
  TestValidator.equals("pagination meta limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "pagination meta total records",
    page1.pagination.records,
    createdRules.length,
  );
  TestValidator.equals(
    "pagination meta pages",
    page1.pagination.pages,
    Math.ceil(createdRules.length / 2),
  );
  TestValidator.equals("page 1 rule count", page1.data.length, 2);
  TestValidator.equals(
    "page 1 first rule",
    page1.data[0].rule_line,
    createdRules[0].rule_line,
  );
  TestValidator.equals(
    "page 1 second rule",
    page1.data[1].rule_line,
    createdRules[1].rule_line,
  );

  // 4b. Owner requests page 2 (should have remaining rule)
  const page2 =
    await api.functional.communityPlatform.member.communities.rules.indexCommunityRules(
      connection,
      {
        communityId,
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination meta page 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 rule count (should be 1)", page2.data.length, 1);
  TestValidator.equals(
    "page 2 rule matches last inserted",
    page2.data[0].rule_line,
    createdRules[2].rule_line,
  );

  // 5. Register second member (non-owner)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "SecondStrong123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Auth);

  // 6. Non-owner attempts to fetch rules (should error or receive restricted data)
  await TestValidator.error(
    "Non-owner cannot use PATCH /communities/:id/rules to list rules",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.indexCommunityRules(
        connection,
        {
          communityId,
          body: {
            page: 1,
            limit: 2,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    },
  );
}
