import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * E2E test for successful deletion of a community rule by the community
 * owner.
 *
 * This test validates that a member-owner can delete a rule in their own
 * community, that deletion causes the rule to be removed entirely (hard
 * deletion), and that further attempts to delete the same rule result in
 * error, confirming deletion is effective.
 *
 * Step-by-step process:
 *
 * 1. Register a new member (who will act as the community owner) and
 *    authenticate.
 * 2. Create a new community as this member (member is set as the owner).
 * 3. Create a rule inside the community (to ensure a valid rule exists for
 *    deletion).
 * 4. Delete the rule as the authorized member-owner, ensuring success (no
 *    error).
 * 5. Immediately attempt to delete the same rule again—this must fail, which
 *    validates that the rule was indeed deleted and is no longer
 *    deletable.
 */
export async function test_api_community_rule_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new member (authorized context for next steps)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test@1234";
  const memberDisplay = RandomGenerator.name(2);
  const registerResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplay,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registerResult);
  TestValidator.equals(
    "registered member email matches input",
    registerResult.member.email,
    memberEmail,
  );

  // 2. Create a new community as this member/owner
  const communityResult =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityResult);
  TestValidator.equals(
    "community owner matches registered member",
    communityResult.owner_id,
    registerResult.member.id,
  );

  // 3. Add a rule to the created community
  const ruleToCreate = {
    rule_index: 0,
    rule_line: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }).slice(0, 50),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const ruleResult =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId: communityResult.id,
        body: ruleToCreate,
      },
    );
  typia.assert(ruleResult);
  TestValidator.equals(
    "rule belongs to the correct community",
    ruleResult.community_id,
    communityResult.id,
  );
  TestValidator.equals(
    "rule line matches input",
    ruleResult.rule_line,
    ruleToCreate.rule_line,
  );

  // 4. Successfully delete the rule as the authorized owner
  await api.functional.communityPlatform.member.communities.rules.eraseCommunityRule(
    connection,
    {
      communityId: communityResult.id,
      ruleId: ruleResult.id,
    },
  );
  // No error expected

  // 5. Attempt to delete the same rule again—should produce error, confirming deletion
  await TestValidator.error(
    "deleting the same rule a second time should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.eraseCommunityRule(
        connection,
        {
          communityId: communityResult.id,
          ruleId: ruleResult.id,
        },
      );
    },
  );
}
