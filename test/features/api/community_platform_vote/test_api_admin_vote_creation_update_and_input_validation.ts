import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * 커뮤니티 플랫폼 관리자용 투표 생성/수정 및 입력 검증 E2E
 *
 * (1) 관리자(admin)와 일반 회원(member) 계정을 각각 생성한다. (2) 실제 게시글/댓글 엔티티는 생성할 수 없으므로
 * 임의 UUID를 대상(post_id, comment_id)으로 지정해 테스트한다. (3) 관리자가 본인이 작성하지 않은 회원의
 * post_id/comment_id로 upvote, downvote, neutral 투표를 각각 생성/수정하며 결과를 검증한다.
 * (4) 관리자가 자기 자신을 타겟(post_id, comment_id 모두 본인 ID)으로 하는 투표를 생성 시 에러 처리가
 * 정상적으로 이루어지는지 체크한다. (5) 존재하지 않는 post_id, comment_id 혹은 value 허용값(1, -1,
 * 0)이 아닌 값, 필수 필드 누락(타겟값 없음) 등 잘못된 입력을 전달했을 때 에러가 반환되는지 검증한다. (6) 모든 경로에서
 * TestValidator로 정상 동작 및 비정상(에러) 동작을 단언한다.
 *
 * @steps
 *  1. 관리자(admin) 계정 가입 및 인증
 *  2. 회원(member) 계정 가입
 *  3. 테스트용 UUID(post_id, comment_id, 관리자 본인 id) 준비
 *  4. 정상: 관리자 계정으로 회원이 작성한 post_id에 upvote(1) - 성공
 *  5. 정상: 동일 post_id에 downvote(-1), neutral(0)로 변경 - 성공
 *  6. 정상: 회원이 작성한 comment_id에 upvote(1) - 성공
 *  7. 비정상: 관리자가 본인 post_id/comment_id에 투표 시도 - 실패
 *  8. 비정상: 존재하지 않는 post_id/comment_id나 value 값 범위 벗어남, 필수값 누락 등 - 실패
 */
export async function test_api_admin_vote_creation_update_and_input_validation(
  connection: api.IConnection,
) {
  // 1. 관리자(admin) 회원 가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "secureAdmin!23",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminResult);

  // 2. 회원(member) 계정 가입
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "goodPwd123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResult);

  // 3. 테스트용 target UUID(post/comment, 관리자 id) 준비
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const adminId = adminResult.admin.id;

  // 4. 정상: 회원 post_id에 upvote(1)
  const upvote = await api.functional.communityPlatform.admin.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote의 value 필드가 1임을 보장", upvote.value, 1);
  TestValidator.equals(
    "upvote의 post_id가 입력과 동일함",
    upvote.post_id,
    postId,
  );

  // 5. 동일 post_id에 downvote(-1) → 업데이트
  const downvote = await api.functional.communityPlatform.admin.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        value: -1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "downvote의 value 필드가 -1임을 보장",
    downvote.value,
    -1,
  );
  TestValidator.equals(
    "downvote의 post_id가 입력과 동일함",
    downvote.post_id,
    postId,
  );

  // 6. neutral(0)로 변경 (투표 취소)
  const neutralVote = await api.functional.communityPlatform.admin.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        value: 0,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(neutralVote);
  TestValidator.equals("neutral vote value가 0임을 보장", neutralVote.value, 0);

  // 7. 회원 comment_id에 upvote(1) 수행 및 필드 체크
  const commentVote = await api.functional.communityPlatform.admin.votes.create(
    connection,
    {
      body: {
        comment_id: commentId,
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(commentVote);
  TestValidator.equals("commentUpvote 값 검증", commentVote.value, 1);
  TestValidator.equals(
    "commentId가 일치함을 검증",
    commentVote.comment_id,
    commentId,
  );

  // 8. 비정상: 관리자 본인 id로 투표(자기 post/comment) → 실패여야 함
  await TestValidator.error(
    "관리자는 본인 post_id로 투표 불가 (에러)",
    async () => {
      await api.functional.communityPlatform.admin.votes.create(connection, {
        body: {
          post_id: adminId, // 실제로는 post_id가 컨텐츠 id여야 하나, 본인 id를 강제 사용해 business rule 위반 시도
          value: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      });
    },
  );
  await TestValidator.error(
    "관리자는 본인 comment_id로 투표 불가 (에러)",
    async () => {
      await api.functional.communityPlatform.admin.votes.create(connection, {
        body: {
          comment_id: adminId,
          value: -1,
        } satisfies ICommunityPlatformVote.ICreate,
      });
    },
  );

  // 9. 비정상: 존재하지 않는 post_id, comment_id에 투표시도(에러)
  await TestValidator.error("존재하지 않는 post_id 투표시 에러", async () => {
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    });
  });
  await TestValidator.error(
    "존재하지 않는 comment_id 투표시 에러",
    async () => {
      await api.functional.communityPlatform.admin.votes.create(connection, {
        body: {
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          value: -1,
        } satisfies ICommunityPlatformVote.ICreate,
      });
    },
  );

  // 10. value필드가 1, -1, 0이 아니면 실패
  // 타입 시스템 상 직접 유효하지 않은 값 입력 전파가 불가하므로 as any로 강제(이 라인은 business rule invalid payload 검증 목적)
  await TestValidator.error("value에 잘못된 값(99) 주입 시 에러", async () => {
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        post_id: postId,
        value: 99 as 1, // 타입 안전성상 허용 불가이기 때문에(e2e 테스트 상 비정상 상황 강제 유발)
      } as any, // ※ as any로 invalid payload 테스트임을 명확히 명시
    });
  });

  // 11. 필수타겟(post_id/comment_id) 누락시 에러
  await TestValidator.error("투표 타겟값 미입력시 에러", async () => {
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        value: 1,
      } as any, // 구조적 불가 케이스 강제
    });
  });
}
