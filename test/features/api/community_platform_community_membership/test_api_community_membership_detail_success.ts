import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";

/**
 * Validate retrieval of community membership details for an existing
 * member.
 *
 * This test confirms the business workflow for a member joining a community
 * and then retrieving detailed information about their own membership. The
 * flow ensures proper user authentication, community creation, membership
 * joining, and record retrieval using the corresponding IDs, validating the
 * business mapping and type safety throughout.
 *
 * Step-by-step process:
 *
 * 1. Register a new member account using unique randomized email and password.
 *    Assert successful registration (correct mapping, type safety, active
 *    flag).
 * 2. Create a new community as the authenticated member (owner). Capture the
 *    communityId from the response. Assert returned community data, and
 *    validate owner is same member.
 * 3. Join the new community with the member account, creating a membership
 *    record. Assert membership details and capture the membershipId.
 * 4. Retrieve the membership details via GET using the acquired communityId
 *    and membershipId. Assert correct member/community mapping, that ids
 *    match the join result, and (optionally) that join time matches within
 *    tolerance.
 */
export async function test_api_community_membership_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name();
  const memberJoinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoinResult);
  const member = memberJoinResult.member;
  TestValidator.equals("member email matches input", member.email, memberEmail);
  TestValidator.equals(
    "member display name matches input",
    member.display_name,
    memberDisplayName,
  );
  TestValidator.predicate(
    "member.is_active should be true",
    member.is_active === true,
  );

  // 2. Create a new community owned by the member (no logo_uri or banner_uri)
  const communityCreate =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          // logo_uri and banner_uri omitted because both are optional string fields and must not be set to null
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);
  const communityId = communityCreate.id;
  TestValidator.equals(
    "community owner is the registered member",
    communityCreate.owner_id,
    member.id,
  );

  // 3. Join the newly created community (membership record creation)
  const membership =
    await api.functional.communityPlatform.member.communities.memberships.create(
      connection,
      {
        communityId,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);
  const membershipId = membership.id;
  TestValidator.equals(
    "membership.member_id matches member.id",
    membership.member_id,
    member.id,
  );
  TestValidator.equals(
    "membership.community_id matches community",
    membership.community_id,
    communityId,
  );

  // 4. Retrieve membership details with GET
  const membershipDetail =
    await api.functional.communityPlatform.member.communities.memberships.at(
      connection,
      {
        communityId,
        membershipId,
      },
    );
  typia.assert(membershipDetail);
  TestValidator.equals(
    "detail.member_id matches join",
    membershipDetail.member_id,
    membership.member_id,
  );
  TestValidator.equals(
    "detail.community_id matches join",
    membershipDetail.community_id,
    membership.community_id,
  );
  TestValidator.equals(
    "detail.id matches join id",
    membershipDetail.id,
    membershipId,
  );
  // Optional additional assertion: joined_at timestamp consistency
  TestValidator.equals(
    "detail.joined_at matches join",
    membershipDetail.joined_at,
    membership.joined_at,
  );
}
