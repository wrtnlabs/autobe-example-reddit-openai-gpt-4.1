import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate that creating a community rule with a rule_line exceeding 50
 * characters fails due to length validation.
 *
 * This test ensures that the community platform API properly enforces the
 * maximum length constraint on rule_line when adding a rule to a community.
 * It verifies the business rule that each rule_line must not exceed 50
 * characters. The workflow involves creating a member, creating a
 * community, and then attempting to create a community rule with a
 * rule_line that deliberately exceeds the allowed length. The expected
 * outcome is that the API call fails validation.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate as a new member (providing randomized email,
 *    password, display_name)
 * 2. Create a new community with valid randomized properties (including
 *    required category_id and name)
 * 3. Attempt to create a rule in this community with rule_line >50 characters,
 *    ensuring rule_index is valid (0)
 * 4. Assert that the API call fails, triggering error validation due to
 *    rule_line length violation
 */
export async function test_api_community_rule_creation_length_validation_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2. Create a new community
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const communityName = RandomGenerator.alphabets(10);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: categoryId,
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }), // optional
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 4,
            wordMax: 8,
          }), // optional
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Attempt to create a rule with rule_line exceeding 50 characters
  const invalidRuleLine = RandomGenerator.paragraph({
    sentences: 55,
    wordMin: 1,
    wordMax: 1,
  }); // Will create string length > 50
  await TestValidator.error(
    "should fail if rule_line exceeds 50 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.createCommunityRule(
        connection,
        {
          communityId: community.id,
          body: {
            rule_index: 0,
            rule_line: invalidRuleLine,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );
}
