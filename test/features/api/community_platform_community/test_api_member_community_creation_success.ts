import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test: A registered member can create a new community successfully
 *
 * Business context:
 *
 * - Only authenticated members can create communities
 * - Must supply required fields to creation (category_id, name)
 * - Owner_id in result must match the member
 *
 * Workflow:
 *
 * 1. Register a new member using the join endpoint
 * 2. Prepare valid ICommunityPlatformCommunity.ICreate input (mock valid UUID
 *    for category, valid slug name, optional fields)
 * 3. Call create endpoint as that member
 * 4. Assert output matches ICommunityPlatformCommunity and all properties
 *    follow constraints (ownership, immutability, system fields). Validate
 *    that the response's owner_id matches the member's id, and
 *    category/name are set as requested. All type and format constraints
 *    must be respected.
 */
export async function test_api_member_community_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const memberId = joinResult.member.id;

  // Step 2: Prepare community creation input
  const createInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(8), // Valid slug (3-32 chars, alphanumeric/hyphen/underscore, lower-case)
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://example.com/logo/${RandomGenerator.alphaNumeric(6)}.png`,
    banner_uri: `https://example.com/banner/${RandomGenerator.alphaNumeric(6)}.jpg`,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 3: Create the community as the registered member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(community);

  // Step 4: Validate business rules
  TestValidator.equals(
    "community owner_id matches member",
    community.owner_id,
    memberId,
  );
  TestValidator.equals(
    "community category matches input",
    community.category_id,
    createInput.category_id,
  );
  TestValidator.equals(
    "community name matches input",
    community.name,
    createInput.name,
  );
  TestValidator.equals(
    "community display_title matches input",
    community.display_title,
    createInput.display_title,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    createInput.description,
  );
  TestValidator.equals(
    "community logo_uri matches input",
    community.logo_uri,
    createInput.logo_uri,
  );
  TestValidator.equals(
    "community banner_uri matches input",
    community.banner_uri,
    createInput.banner_uri,
  );
  TestValidator.predicate(
    "community id is uuid",
    typeof community.id === "string" && community.id.length > 0,
  );
  TestValidator.predicate(
    "community created_at and updated_at are defined",
    typeof community.created_at === "string" &&
      typeof community.updated_at === "string",
  );
}
