import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test public access to community detail by UUID.
 *
 * 1. Register a new member (user) via POST /auth/member/join, ensure proper
 *    fields, identity and login token returned.
 * 2. Using member session (authenticated), create a new community with
 *    required/optional fields using POST
 *    /communityPlatform/member/communities.
 * 3. Switch context to unauthenticated guest (connection.headers = undefined
 *    or empty object).
 * 4. Fetch community details via GET
 *    /communityPlatform/communities/{communityId} without Authorization
 *    token.
 * 5. Validate returned entity structure, required fields (id, name, owner,
 *    category, etc.), and confirm deleted_at is undefined/null.
 * 6. Ensure that the returned data includes no member PII beyond owner_id
 *    (such as email), and that the community data matches the input (within
 *    allowed constraints).
 */
export async function test_api_community_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123";
  const displayName = RandomGenerator.name(2);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. Create a new community as authenticated member
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();
  const communityInput = {
    category_id: testCategoryId,
    name: RandomGenerator.alphaNumeric(12),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 12,
    }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 12,
    }),
    logo_uri: `https://img.example.com/logo/${RandomGenerator.alphaNumeric(8)}.png`,
    banner_uri: `https://img.example.com/banner/${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Switch to unauthenticated (guest) context
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Fetch community details as guest
  const result = await api.functional.communityPlatform.communities.at(
    guestConnection,
    { communityId: community.id },
  );
  typia.assert(result);

  // 5. Validate data structure, critical fields, and deletion status
  TestValidator.equals("raw community id matches", result.id, community.id);
  TestValidator.equals(
    "raw category id matches",
    result.category_id,
    testCategoryId,
  );
  TestValidator.equals(
    "raw owner id matches",
    result.owner_id,
    memberJoin.member.id,
  );
  TestValidator.equals(
    "community should not be soft-deleted",
    result.deleted_at,
    null,
  );
  TestValidator.equals("raw name matches", result.name, communityInput.name);
  TestValidator.equals(
    "raw display_title matches",
    result.display_title,
    communityInput.display_title,
  );
  TestValidator.equals(
    "raw description matches",
    result.description,
    communityInput.description,
  );
  TestValidator.equals(
    "raw logo URI matches",
    result.logo_uri,
    communityInput.logo_uri,
  );
  TestValidator.equals(
    "raw banner URI matches",
    result.banner_uri,
    communityInput.banner_uri,
  );
  // Ensure private PII isn't exposed
  TestValidator.predicate(
    "response should not expose member email",
    () =>
      typeof (result as any).email === "undefined" ||
      (result as any).email === null,
  );
  TestValidator.predicate(
    "response should not expose member display_name",
    () =>
      typeof (result as any).display_name === "undefined" ||
      (result as any).display_name === null,
  );
}
