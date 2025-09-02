import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that unauthenticated users cannot create community posts.
 *
 * This test attempts to call the /communityPlatform/member/posts creation
 * endpoint without performing any authentication (no join or login). It
 * constructs a valid post creation payload and submits it using a
 * connection with no Authorization header. The test ensures that the API
 * rejects the request with an authentication or unauthorized error,
 * verifying correct enforcement of access control. No member registration
 * or login occurs in this test.
 */
export async function test_api_member_post_create_unauthenticated_failure(
  connection: api.IConnection,
) {
  // Step 1: Prepare a connection with no Authorization header.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt to create a post with valid payload but as an unauthenticated user.
  const validPost: ICommunityPlatformPost.ICreate = {
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    author_display_name: null,
  };

  // Step 3: Verify that an authentication/unauthorized error occurs.
  await TestValidator.error(
    "unauthenticated users cannot create community posts",
    async () => {
      await api.functional.communityPlatform.member.posts.create(unauthConn, {
        body: validPost satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );
}
