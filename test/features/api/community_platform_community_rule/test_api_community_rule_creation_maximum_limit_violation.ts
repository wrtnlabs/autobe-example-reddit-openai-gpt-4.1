import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Test that creating an 11th rule for a community fails as expected when
 * the maximum number (10) is reached.
 *
 * 1. Register and authenticate a new member (user).
 * 2. Create a new community as this member, using random valid data.
 * 3. Create 10 rules for the community (reaching limit: rule_index 0-9).
 * 4. Attempt to create an 11th rule (with a rule_index that is already used),
 *    expecting a business error.
 * 5. Validate that the API responds with an error (TestValidator.error) for
 *    this 11th rule creation.
 * 6. Assert type safety and authentication is correctly handled.
 */
export async function test_api_community_rule_creation_maximum_limit_violation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "AutoTest_1234";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. Create new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create 10 rules for the community (indexes 0-9)
  for (let i = 0; i < 10; ++i) {
    const rule =
      await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
        connection,
        {
          communityId: community.id,
          body: {
            rule_index: i as number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<9>,
            rule_line: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 8,
            }).slice(0, 50),
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    TestValidator.equals(`Rule index ${i} matches`, rule.rule_index, i);
  }

  // 4. Attempt to create 11th rule (with a valid rule_index)—should fail
  await TestValidator.error(
    "should reject 11th rule creation for a single community",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
        connection,
        {
          communityId: community.id,
          body: {
            rule_index: 0 as number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<9>, // any valid index would fail
            rule_line: "Extra rule exceeding limit",
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );
}
