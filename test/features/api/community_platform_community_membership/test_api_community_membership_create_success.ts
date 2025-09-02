import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";

/**
 * Validate the process of joining a community as a successfully registered
 * member.
 *
 * This test covers the positive path for membership creation:
 *
 * 1. Register the community owner member and become authenticated as owner.
 * 2. Owner creates a new community (captures its ID).
 * 3. Register as a new member who will join the community (context switches to
 *    this account).
 * 4. Join the previously created community via the join endpoint as the new
 *    member.
 * 5. Validate that the created membership links the new member to the correct
 *    community, and the record is properly structured.
 *
 * This ensures all relationships (member_id and community_id) are valid,
 * authentication flow works as expected, and the main business logic for
 * successful joins functions correctly.
 */
export async function test_api_community_membership_create_success(
  connection: api.IConnection,
) {
  // 1. Register the owner member (and become authenticated as owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const ownerDisplayName = RandomGenerator.name();
  const ownerReg = await api.functional.auth.member.join(connection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: ownerDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(ownerReg);
  // current connection is now authenticated as owner

  // 2. Owner creates a new community
  const communityName = RandomGenerator.alphabets(10);
  const newCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          // logo_uri and banner_uri omitted because they are optional and should be undefined (not null)
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);
  // capture for membership join
  const communityId = newCommunity.id;

  // 3. Register the member who will join, creates authentication context for this member
  const joinerEmail = typia.random<string & tags.Format<"email">>();
  const joinerPassword = RandomGenerator.alphaNumeric(12);
  const joinerDisplayName = RandomGenerator.name();
  const joinerReg = await api.functional.auth.member.join(connection, {
    body: {
      email: joinerEmail,
      password: joinerPassword,
      display_name: joinerDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinerReg);
  // now authenticated as joiner

  // 4. The joiner joins the community
  const membership =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 5. Validate new membership links new member to correct community
  TestValidator.equals(
    "membership member_id matches joiner id",
    membership.member_id,
    joinerReg.member.id,
  );
  TestValidator.equals(
    "membership community_id matches created community",
    membership.community_id,
    communityId,
  );
  TestValidator.predicate(
    "membership id is a valid uuid",
    typeof membership.id === "string" && membership.id.length > 0,
  );
}
