import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * E2E test for the happy path of creating a community rule as an authorized
 * member.
 *
 * Business context: Only authenticated, registered members may create rules
 * for communities they own. This test exercises registration/join flow,
 * community creation, and community rule creation. Ensures proper
 * authentication and correct association/linking of created entities.
 *
 * Test process:
 *
 * 1. Register a member (join, store credentials), confirming token/login
 * 2. Create a community as that member (store communityId), verifying
 *    ownership and input echo
 * 3. Create a rule for the created community, using edge-valid values for all
 *    inputs
 * 4. Assert schema, field associations, and business logic (ownership, fields,
 *    relationships).
 */
export async function test_api_community_rule_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new platform member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(memberAuth);
  const { member } = memberAuth;

  // 2. Create a community as the now-authenticated member
  const communityInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(8),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://example.com/logo.png",
    banner_uri: "https://example.com/banner.png",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community belongs to owner",
    community.owner_id,
    member.id,
  );
  TestValidator.equals(
    "category matches input",
    community.category_id,
    communityInput.category_id,
  );

  // 3. Create a rule for the community (use edge-valid input)
  const ruleInput = {
    rule_index: 0, // edge-valid (lowest allowed)
    rule_line: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 2,
      wordMax: 6,
    }).slice(0, 50),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
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
    "rule is for correct community",
    rule.community_id,
    community.id,
  );
  TestValidator.equals(
    "rule index as input",
    rule.rule_index,
    ruleInput.rule_index,
  );
  TestValidator.equals(
    "rule_line matches input",
    rule.rule_line,
    ruleInput.rule_line,
  );
}
