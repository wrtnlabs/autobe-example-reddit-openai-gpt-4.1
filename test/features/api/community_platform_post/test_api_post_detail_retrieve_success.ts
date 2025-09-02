import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate public retrieval of community post details by postId.
 *
 * This test ensures the public endpoint for reading a post detail works as
 * intended and exposes all required information for anonymous users (not
 * authenticated). The flow is:
 *
 * 1. Register a new member account (generates an authenticated context).
 * 2. Create a community post as that member, capturing all details used.
 * 3. Fetch the created post using the public, unauthenticated detail GET
 *    endpoint.
 * 4. Validate the response structure and values match the created post.
 *
 * Steps:
 *
 * - Account creation is done via POST /auth/member/join; member info stored
 *   for test purposes.
 * - Post creation is via POST /communityPlatform/member/posts; use the
 *   member's JWT context for authentication; record all post fields used in
 *   creation plus generated ID fields.
 * - Directly call GET /communityPlatform/posts/{postId} with no extra
 *   headers.
 * - Assert that the GET response matches the known post structure/data,
 *   except for timestamp and ID fields which are generated during create.
 * - All test data (email, title, body, etc.) are randomly generated within
 *   field constraints for uniqueness.
 */
export async function test_api_post_detail_retrieve_success(
  connection: api.IConnection,
) {
  // Step 1: Register a test member for post authoring
  const email = typia.random<string & tags.Format<"email">>();
  const password = "passWord123";
  const displayName = RandomGenerator.name();
  const join = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(join);
  const member = join.member;

  // Step 2: Create a post with distinct random content
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 14,
  });
  const body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 10,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title,
        body,
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Retrieve the post using the public GET endpoint (no auth needed)
  const retrieved = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrieved);

  // Step 4: Check all relevant fields match—ID, title, body, author_display_name, and relational IDs
  TestValidator.equals("post id matches", retrieved.id, post.id);
  TestValidator.equals(
    "community id matches",
    retrieved.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "member id matches",
    retrieved.community_platform_member_id,
    member.id,
  );
  TestValidator.equals("title matches", retrieved.title, title);
  TestValidator.equals("body matches", retrieved.body, body);
  TestValidator.equals(
    "author_display_name matches",
    retrieved.author_display_name,
    displayName,
  );
  TestValidator.predicate(
    "created_at should be defined",
    !!retrieved.created_at,
  );
  TestValidator.predicate(
    "updated_at should be defined",
    !!retrieved.updated_at,
  );
  // Soft delete timestamp should be null for active posts
  TestValidator.equals("not soft-deleted", retrieved.deleted_at, null);
}
