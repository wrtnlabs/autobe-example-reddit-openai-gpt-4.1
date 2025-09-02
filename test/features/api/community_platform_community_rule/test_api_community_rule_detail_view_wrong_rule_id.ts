import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

export async function test_api_community_rule_detail_view_wrong_rule_id(
  connection: api.IConnection,
) {
  /**
   * Test failure case when requesting a rule that does not exist or is not
   * associated with the specified community.
   *
   * This test ensures that the API endpoint
   * /communityPlatform/member/communities/{communityId}/rules/{ruleId}
   * correctly rejects requests for non-existent or unrelated rule IDs.
   *
   * Workflow:
   *
   * 1. Register a new member (using /auth/member/join) and authenticate.
   * 2. Create a new community (using /communityPlatform/member/communities) to
   *    obtain a valid communityId.
   * 3. Generate a random UUID not associated with any community rule.
   * 4. Attempt to fetch a community rule using this valid communityId and the
   *    invalid ruleId.
   * 5. Assert that the API returns an error (using TestValidator.error) indicating
   *    the rule does not exist.
   */

  // 1. Register and authenticate a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestP@ssword1";
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2. Create a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Generate an invalid rule ID
  const invalidRuleId = typia.random<string & tags.Format<"uuid">>();

  // 4 & 5. Attempt to retrieve community rule with invalid rule ID and assert error
  await TestValidator.error(
    "should fail to retrieve community rule for non-existent ruleId",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.getCommunityRule(
        connection,
        {
          communityId: community.id,
          ruleId: invalidRuleId,
        },
      );
    },
  );
}
