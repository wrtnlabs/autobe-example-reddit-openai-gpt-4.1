import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate error when updating a community rule with an overlength
 * rule_line (>50chars).
 *
 * This scenario ensures the backend enforces the 50-character constraint
 * for rule_line fields on update. Steps:
 *
 * 1. Register and authenticate a new member
 * 2. Create a community as that member
 * 3. Add a rule to the community
 * 4. Attempt to update the rule using rule_line with >50 characters
 * 5. Expects a validation/business logic error
 */
export async function test_api_community_rule_update_length_constraint_error(
  connection: api.IConnection,
) {
  // 1. Register a new member to acquire 'member' role authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  const member = memberAuth.member;

  // 2. Create a community as the authenticated member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Add a valid rule for update testing
  const rule =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId: community.id,
        body: {
          rule_index: 0,
          rule_line: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 5,
            wordMax: 6,
          }).slice(0, 40),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // 4. Attempt to update rule_line with a string longer than 50 characters
  const overlengthRule = RandomGenerator.alphabets(51); // always 51 chars

  await TestValidator.error(
    "should fail when updating rule_line to >50 chars",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.updateCommunityRule(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
          body: {
            rule_line: overlengthRule,
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
