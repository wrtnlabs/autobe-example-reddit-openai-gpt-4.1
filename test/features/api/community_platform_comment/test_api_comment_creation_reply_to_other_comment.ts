import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test reply (child) comment creation in community platform.
 *
 * 1. Register/join as a new member (with random email, password, and display
 *    name)
 * 2. Create a new post (randomly generate a community id as fixture)
 * 3. Create a root (top-level) comment for the post
 * 4. Create a reply (child) comment using parent_id = root comment's id
 * 5. Validate reply comment: parent linkage, same post, correct author, and
 *    distinct ID from root
 */
export async function test_api_comment_creation_reply_to_other_comment(
  connection: api.IConnection,
) {
  // STEP 1: Register member and get authorized session
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformMember.ICreate;
  const joinResult = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(joinResult);
  const member = joinResult.member;

  // STEP 2: Create a new post as the member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postInput = {
    community_platform_community_id: communityId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 14 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    author_display_name: member.display_name,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community ID",
    post.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "post author",
    post.community_platform_member_id,
    member.id,
  );

  // STEP 3: Create root/top-level comment on the post
  const rootCommentInput = {
    post_id: post.id,
    parent_id: null,
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 15,
    }),
  } satisfies ICommunityPlatformComment.ICreate;
  const rootComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: rootCommentInput,
    });
  typia.assert(rootComment);
  TestValidator.equals(
    "root comment post linkage",
    rootComment.post_id,
    post.id,
  );
  TestValidator.equals(
    "root comment has no parent_id",
    rootComment.parent_id,
    null,
  );
  TestValidator.equals("root comment author", rootComment.author_id, member.id);

  // STEP 4: Create a reply/child comment with parent_id = rootComment.id
  const replyInput = {
    post_id: post.id,
    parent_id: rootComment.id,
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformComment.ICreate;
  const reply = await api.functional.communityPlatform.member.comments.create(
    connection,
    { body: replyInput },
  );
  typia.assert(reply);
  TestValidator.equals("reply comment post linkage", reply.post_id, post.id);
  TestValidator.equals(
    "reply comment parent linkage",
    reply.parent_id,
    rootComment.id,
  );
  TestValidator.equals("reply comment author", reply.author_id, member.id);
  TestValidator.notEquals(
    "reply is not the root comment",
    reply.id,
    rootComment.id,
  );
}
