import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Ensure attempts to create a post with invalid input data are properly
 * rejected.
 *
 * This test confirms that business rules (minimum/maximum length, non-empty
 * fields, etc.) for post creation are enforced by the API. After
 * registering a member and establishing authentication, multiple attempts
 * are made to create a new post with faulty payloads:
 *
 * - Title too short (less than 5 chars)
 * - Title missing
 * - Title exceeding 120 chars
 * - Body too short (less than 10 chars)
 * - Body missing
 * - Body exceeding 10,000 chars The test expects each request to be rejected
 *   with a runtime error.
 */
export async function test_api_member_post_create_invalid_input(
  connection: api.IConnection,
) {
  // 1. Register and log in member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPw123";
  const join = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(join);
  const member = join.member;

  const community_platform_community_id = typia.random<
    string & tags.Format<"uuid">
  >(); // Simulated, as no community join in input materials

  // 2. Attempt to create post with invalid input: title too short
  await TestValidator.error("title too short (min 5 chars)", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id,
        title: "Abc", // too short
        body: RandomGenerator.paragraph({ sentences: 20 }), // valid body
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // 3. Attempt to create post with invalid input: missing title
  await TestValidator.error("missing title", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id,
        body: RandomGenerator.paragraph({ sentences: 20 }),
      } as any, // Known: will cause runtime error at API due to missing title
    });
  });

  // 4. Attempt to create post with invalid input: title too long (>120 chars)
  await TestValidator.error("title too long (exceeds 120 chars)", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id,
        title: RandomGenerator.paragraph({
          sentences: 130,
          wordMin: 1,
          wordMax: 1,
        }), // ~130 chars
        body: RandomGenerator.paragraph({ sentences: 20 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // 5. Attempt to create post with invalid input: body too short
  await TestValidator.error("body too short (min 10 chars)", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id,
        title: RandomGenerator.paragraph({ sentences: 8 }),
        body: "12345", // too short
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // 6. Attempt to create post with invalid input: missing body
  await TestValidator.error("missing body", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id,
        title: RandomGenerator.paragraph({ sentences: 10 }),
      } as any,
    });
  });

  // 7. Attempt to create post with invalid input: body too long (>10000 chars)
  await TestValidator.error(
    "body too long (exceeds 10,000 chars)",
    async () => {
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_platform_community_id,
          title: RandomGenerator.paragraph({ sentences: 10 }),
          body: RandomGenerator.content({
            paragraphs: 100,
            sentenceMin: 20,
            sentenceMax: 40,
            wordMin: 6,
            wordMax: 9,
          }), // makes very long body
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );
}
