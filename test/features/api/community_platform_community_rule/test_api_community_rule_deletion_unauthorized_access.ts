import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate that a member who does not own a community cannot delete its
 * rules (unauthorized access attempt).
 *
 * Business context: Community rule deletion is restricted to the community
 * owner or authorized personnel. The platform should prevent deletion
 * attempts by non-owners to maintain data integrity and enforce access
 * control. This test simulates the workflow of two completely separate
 * users: one who creates the community and the rule, and a second who
 * attempts the prohibited action.
 *
 * Steps:
 *
 * 1. Register Member 1 (owner)
 * 2. Member 1 creates a community
 * 3. Member 1 creates a rule in that community
 * 4. Register Member 2 (attacker)
 * 5. Switch authentication context to Member 2
 * 6. Attempt to delete the rule using Member 2's credentials (should fail)
 *
 * The final assertion expects a business rule authorization error (e.g.,
 * HTTP 403 or relevant error) when Member 2 attempts to delete a rule they
 * do not own.
 */
export async function test_api_community_rule_deletion_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register Member 1 (community owner)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "securePass1!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 2. Member 1 creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphabets(12),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member 1 creates a rule for the community
  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
      connection,
      {
        communityId: community.id,
        body: {
          rule_index: 0,
          rule_line: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 9,
          }).substring(0, 50),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // 4. Register Member 2 (attacker)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "securePass2!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 5. Context is now authenticated as Member 2

  // 6. Attempt to delete the rule as Member 2 (should fail with authorization error)
  await TestValidator.error(
    "Member 2 cannot delete rule owned by Member 1 (authorization failure)",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.eraseCommunityRule(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
}
