import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * 관리자(admin)가 멤버(member)가 작성한 게시글(post)을 성공적으로 수정할 수 있는지 검증합니다.
 *
 * 이 테스트에서는 다음과 같은 절차를 따릅니다:
 *
 * 1. 멤버 회원가입 및 로그인 → 멤버 자격으로 커뮤니티 게시글 작성
 * 2. 관리자 회원가입 및 로그인 → 관리자 세션 권한으로 전환
 * 3. 관리자가 앞서 생성한 게시글(postId)의 제목/본문/작성자명을 새 값으로 업데이트
 * 4. 응답 객체가 수정 요청 값과 일치하는지 검증해 변경 적용을 테스트
 */
export async function test_api_admin_post_update_success(
  connection: api.IConnection,
) {
  // 1. 멤버 회원가입
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPW!1234";
  const memberDisplayName = RandomGenerator.name();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. 멤버가 게시글 작성
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const originalTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const originalAuthorDisplayName = RandomGenerator.name(1);
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: originalTitle,
        body: originalBody,
        author_display_name: originalAuthorDisplayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. 테스트용 관리자 계정 생성 및 로그인
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "rootPW!1234";
  const adminDisplayName = RandomGenerator.name();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 4. 관리자가 게시글 일부 필드 수정
  const newTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 14,
    wordMin: 3,
    wordMax: 8,
  });
  const newAuthorDisplayName = RandomGenerator.name(2);
  const updatedPost = await api.functional.communityPlatform.admin.posts.update(
    connection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        body: newBody,
        author_display_name: newAuthorDisplayName,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // 5. 응답의 변경된 필드 검증
  TestValidator.equals("업데이트된 제목 일치", updatedPost.title, newTitle);
  TestValidator.equals("업데이트된 본문 일치", updatedPost.body, newBody);
  TestValidator.equals(
    "업데이트된 작성자명 일치",
    updatedPost.author_display_name,
    newAuthorDisplayName,
  );
  TestValidator.equals("postId는 변경되지 않아야 함", updatedPost.id, post.id);
  TestValidator.equals(
    "communityId는 변경되지 않아야 함",
    updatedPost.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "memberId는 변경되지 않아야 함",
    updatedPost.community_platform_member_id,
    post.community_platform_member_id,
  );
}
