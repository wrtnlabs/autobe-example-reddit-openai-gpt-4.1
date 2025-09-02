import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";

/**
 * Ensure duplicate membership joining is prevented.
 *
 * Tests that once a member joins a community, they cannot create a
 * duplicate membership for the same community.
 *
 * Business steps:
 *
 * 1. Register a member to own the community (owner)
 * 2. The owner creates a community
 * 3. Register a new (non-owner) member
 * 4. New member joins the created community (success)
 * 5. New member attempts to join again (expect error)
 */
export async function test_api_community_membership_create_duplicate_failure(
  connection: api.IConnection,
) {
  // 1. Register owner member (context: owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerReg = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(ownerReg);

  // 2. Owner creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          // logo_uri and banner_uri are omitted, as they are optional and undefined by default
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register a new member (will join as regular member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberReg = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberReg);

  // 4. New member joins the created community (success expected)
  const ms1 =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(ms1);
  TestValidator.equals(
    "membership community match",
    ms1.community_id,
    community.id,
  );
  TestValidator.equals(
    "membership member match",
    ms1.member_id,
    memberReg.member.id,
  );

  // 5. Attempt duplicate join: member tries to join again (should fail)
  await TestValidator.error(
    "duplicate membership joining should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.memberships.create(
        connection,
        {
          communityId: community.id,
          body: {},
        },
      );
    },
  );
}
