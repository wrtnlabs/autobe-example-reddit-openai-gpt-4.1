import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Test successful creation of a new community as an admin.
 *
 * 1. Register and authenticate an admin user using the join endpoint.
 * 2. As the now-authenticated admin, create a new unique community category
 *    via the admin categories endpoint.
 * 3. Create a new community, providing a unique name/slug and the previously
 *    created categoryId. Optional fields like display_title and description
 *    should be supplied.
 * 4. Validate that the response includes all proper relationships and
 *    defaults, associates the admin as owner, links the correct category,
 *    and has the appropriate timestamps and nullable optionals.
 * 5. Check that immutable fields (name, owner_id, category_id) are correctly
 *    assigned and present.
 */
export async function test_api_admin_community_creation_success(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminJoin);
  TestValidator.equals("admin joined", adminJoin.admin.email, adminEmail);
  TestValidator.predicate(
    "admin has correct privileges",
    adminJoin.admin.is_active && typeof adminJoin.admin.id === "string",
  );

  // 2. Create a new category as admin
  const categoryCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        code: categoryCode,
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);
  TestValidator.equals("category is correct", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);

  // 3. Create the community
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const displayTitle = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.paragraph({ sentences: 5 });
  // Purposely not sending logo_uri or banner_uri to test null/undefined
  const createBody: ICommunityPlatformCommunity.ICreate = {
    category_id: category.id,
    name: communityName,
    display_title: displayTitle,
    description,
    // logo_uri and banner_uri omitted
  };
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name immutable and correct",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community links correct category_id",
    community.category_id,
    category.id,
  );
  TestValidator.equals(
    "community owner is admin",
    community.owner_id,
    adminJoin.admin.id,
  );
  TestValidator.equals(
    "community display_title assigned",
    community.display_title,
    displayTitle,
  );
  TestValidator.equals(
    "community description assigned",
    community.description,
    description,
  );
  TestValidator.equals(
    "community logo_uri is null or undefined",
    community.logo_uri,
    undefined,
  );
  TestValidator.equals(
    "community banner_uri is null or undefined",
    community.banner_uri,
    undefined,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    typeof community.created_at === "string" && community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    typeof community.updated_at === "string" && community.updated_at.length > 0,
  );
  TestValidator.equals("community not deleted", community.deleted_at, null);
}
