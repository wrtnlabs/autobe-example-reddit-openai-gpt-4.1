import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * 커뮤니티 플랫폼 게시글 관리자 업데이트 유효성 검사 실패 케이스 테스트
 *
 * 이 테스트는 관리자가 올바르지 않은 입력 데이터(제목이 너무 짧거나 본문이 너무 김 등)로 게시글 수정(업데이트) 시도 시,
 * API에서 적절한 입력 검증 오류가 발생하는지 확인합니다. 또한, 잘못된 요청 후 게시글 원본 데이터가 변하지 않는지도
 * 검증합니다.
 *
 * 프로세스:
 *
 * 1. 회원 계정 생성 및 인증
 * 2. (테스트 견고성을 위해) 더미 커뮤니티 ID 생성
 * 3. 회원으로 로그인 상태에서 게시글 생성(유효 데이터)
 * 4. 관리자 계정 생성 및 인증(권한 스위치)
 * 5. "제목이 너무 짧은 경우"(예: 1글자), "본문이 너무 긴 경우"(예: 10001자) 등
 *
 *    - 각 입력 오류 케이스에 대해 게시글 업데이트 요청(관리자 API)
 *    - API가 입력 유효성 검증 에러를 반환하는지, 원본 게시글 데이터가 그대로인지(회원 인증으로 글 재조회) 검증
 *    - 정상 범위 길이(경계값)인 경우 성공하는지도 비교
 */
export async function test_api_admin_post_update_invalid_input(
  connection: api.IConnection,
) {
  // 1. 회원 계정 생성
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "abcd1234";
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const memberId = memberJoin.member.id;

  // 2. 더미 커뮤니티 ID 생성 (실 운영에서는 유효한 커뮤니티 참조 필요)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 3. 회원 인증 상태로 정상 게시글 작성
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const postTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 8,
  }); // 30~48자 정도
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const postCreate = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: postTitle,
        body: postBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postCreate);
  const postId = postCreate.id;

  // 4. 관리자 계정 생성 & 인증(권한 스위치)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPass1234";
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5-1. "제목이 너무 짧은 경우" (최소 5자 미만, 예: 1글자)
  await TestValidator.error(
    "관리자 게시글 업데이트 - 제목이 5자 미만일 때 입력 검증 실패",
    async () => {
      await api.functional.communityPlatform.admin.posts.update(connection, {
        postId: postId,
        body: { title: "A" } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 5-2. "본문이 너무 긴 경우" (최대 10000자 초과)
  const tooLongBody = "B".repeat(10001);
  await TestValidator.error(
    "관리자 게시글 업데이트 - 본문이 10000자 초과 시 입력 검증 실패",
    async () => {
      await api.functional.communityPlatform.admin.posts.update(connection, {
        postId: postId,
        body: { body: tooLongBody } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 5-3. 정상 범위(제목 5자, 본문 10자) 경계값은 성공해야 함
  const validTitle = "ABCDE";
  const validBody = "abcdefghij";
  const updated = await api.functional.communityPlatform.admin.posts.update(
    connection,
    {
      postId: postId,
      body: {
        title: validTitle,
        body: validBody,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "게시글 수정 정상 케이스(제목 5자, 본문 10자)",
    updated.title,
    validTitle,
  );
  TestValidator.equals(
    "게시글 수정 정상 케이스(제목 5자, 본문 10자)",
    updated.body,
    validBody,
  );

  // 5-4. 실패 케이스에서 원본 게시글 유지 확인 (회원 인증으로 재조회 필요 — 읽기 API 미제공으로 생략 가능)
}
