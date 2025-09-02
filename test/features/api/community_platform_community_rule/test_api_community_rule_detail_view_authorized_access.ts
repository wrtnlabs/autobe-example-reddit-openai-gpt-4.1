import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate retrieval of a community rule by an authenticated member.
 *
 * This test simulates the end-to-end business workflow for ensuring that
 * authenticated members can successfully register, create a community,
 * establish at least one community rule, and retrieve the details of that
 * rule via the appropriate GET endpoint.
 *
 * Steps:
 *
 * 1. Register a new member
 * 2. Create a new community as that member
 * 3. Create a rule attached to that community
 * 4. Retrieve that rule by its id and assert it matches the creation result
 */
export async function test_api_community_rule_detail_view_authorized_access(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1",
    display_name: RandomGenerator.name(),
  };
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "registered member email matches",
    memberAuth.member.email,
    memberInput.email,
  );

  // 2. Create community
  const communityInput: ICommunityPlatformCommunity.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    // display_title, logo_uri, and banner_uri can be omitted, as per type definition
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator should match member",
    community.owner_id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityInput.name,
  );

  // 3. Create rule for the community
  const ruleInput: ICommunityPlatformCommunityRule.ICreate = {
    rule_index: 0,
    rule_line: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 30,
    }).slice(0, 50),
  };
  const rule =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId: community.id,
        body: ruleInput,
      },
    );
  typia.assert(rule);
  TestValidator.equals(
    "rule index matches input",
    rule.rule_index,
    ruleInput.rule_index,
  );
  TestValidator.equals(
    "rule line matches input",
    rule.rule_line,
    ruleInput.rule_line,
  );
  TestValidator.equals(
    "rule's community id matches",
    rule.community_id,
    community.id,
  );

  // 4. Retrieve the rule by id
  const fetchedRule =
    await api.functional.communityPlatform.member.communities.rules.getCommunityRule(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  typia.assert(fetchedRule);
  TestValidator.equals("retrieved rule matches created", fetchedRule, rule);
}
