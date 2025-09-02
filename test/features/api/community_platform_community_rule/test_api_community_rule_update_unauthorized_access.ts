import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate that a member cannot update a rule on a community they do not
 * own (unauthorized access).
 *
 * This test implements the following workflow:
 *
 * 1. Register Member 1 (community owner).
 * 2. Member 1 creates a community with random, valid properties.
 * 3. Member 1 adds a rule to their new community (valid rule line and index).
 * 4. Register Member 2 as a different, unique account.
 * 5. Switch authentication context to Member 2 (simulate user login as Member
 *    2).
 * 6. Member 2 attempts to update the rule previously created by Member 1
 *    (attempting to edit both rule_line and rule_index fields).
 * 7. Expect a permission/authorization error—Member 2 is not the owner, so
 *    update must fail.
 *
 * This test specifically verifies that authorization boundaries are
 * enforced for community rule updates: only owners or admins may update
 * rules. The negative test (error path) is considered passed if the API
 * properly rejects the update attempt. We never expect a successful
 * modification, only correct error handling.
 */
export async function test_api_community_rule_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register Member 1 (owner)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1Join = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Join);
  const member1Id = member1Join.member.id;

  // 2. Member 1 creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;

  // 3. Member 1 creates a rule on the community
  const rule =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId,
        body: {
          rule_index: 0,
          rule_line: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 12,
          }).slice(0, 50), // assure max length
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);
  const ruleId = rule.id;

  // 4. Register Member 2
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // (connection is now authenticated as member 2)

  // 5. Member 2 attempts to update the existing rule (should fail)
  await TestValidator.error(
    "member 2 cannot update member 1's community rule",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.updateCommunityRule(
        connection,
        {
          communityId,
          ruleId,
          body: {
            rule_index: 1, // attempt a move
            rule_line: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 12,
            }).slice(0, 50),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
