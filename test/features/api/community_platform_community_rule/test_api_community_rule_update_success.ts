import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Test successful update of a community rule by the owner-member.
 *
 * 1. Register as a new member (establish auth context).
 * 2. Create a new community (owned by this member).
 * 3. Add a rule to the community.
 * 4. Update the rule's text and/or ordering.
 * 5. Verify the response matches the expected updated rule and unchanged
 *    immutable fields.
 * 6. Confirm that owner authorization is effective and business constraints
 *    are respected.
 */
export async function test_api_community_rule_update_success(
  connection: api.IConnection,
) {
  // 1. Register as a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "StrongP@ssword1";
  const memberDisplayName = RandomGenerator.name(2);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 2. Create a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(8),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          // logo_uri and banner_uri are optional; omit for this test
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner is member",
    community.owner_id,
    member.id,
  );

  // 3. Add a rule to the community
  const ruleCreate =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId: community.id,
        body: {
          rule_index: 0,
          rule_line: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 2,
            wordMax: 7,
          }).slice(0, 50),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleCreate);

  // 4. Prepare changes for update (different index and line text)
  const newRuleIndex = 1;
  const newRuleLine = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 7,
  }).slice(0, 50);

  // 5. Update the rule (change index and line text)
  const updatedRule =
    await api.functional.communityPlatform.member.communities.rules.updateCommunityRule(
      connection,
      {
        communityId: community.id,
        ruleId: ruleCreate.id,
        body: {
          rule_index: newRuleIndex,
          rule_line: newRuleLine,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // 6. Verify the updated fields and check immutable associations
  TestValidator.equals(
    "Updated rule's id remains the same",
    updatedRule.id,
    ruleCreate.id,
  );
  TestValidator.equals(
    "Updated rule is linked to community",
    updatedRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "Updated rule_index applied",
    updatedRule.rule_index,
    newRuleIndex,
  );
  TestValidator.equals(
    "Updated rule_line applied",
    updatedRule.rule_line,
    newRuleLine,
  );
}
