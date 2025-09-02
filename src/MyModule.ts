import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberPasswordResetInitiateController } from "./controllers/auth/member/password/reset/initiate/AuthMemberPasswordResetInitiateController";
import { AuthMemberPasswordResetCompleteController } from "./controllers/auth/member/password/reset/complete/AuthMemberPasswordResetCompleteController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { CommunityplatformAdminCategoriesController } from "./controllers/communityPlatform/admin/categories/CommunityplatformAdminCategoriesController";
import { CommunityplatformAdminBannedwordsController } from "./controllers/communityPlatform/admin/bannedWords/CommunityplatformAdminBannedwordsController";
import { CommunityplatformAdminConfigurationsController } from "./controllers/communityPlatform/admin/configurations/CommunityplatformAdminConfigurationsController";
import { CommunityplatformAdminGuestsController } from "./controllers/communityPlatform/admin/guests/CommunityplatformAdminGuestsController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformAdminSessionsController } from "./controllers/communityPlatform/admin/sessions/CommunityplatformAdminSessionsController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformMemberCommunitiesMembershipsController } from "./controllers/communityPlatform/member/communities/memberships/CommunityplatformMemberCommunitiesMembershipsController";
import { CommunityplatformMemberCommunitiesRecentcommunitiesController } from "./controllers/communityPlatform/member/communities/recentCommunities/CommunityplatformMemberCommunitiesRecentcommunitiesController";
import { CommunityplatformMemberCommunitiesRulesController } from "./controllers/communityPlatform/member/communities/rules/CommunityplatformMemberCommunitiesRulesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformMemberPostsSnapshotsController } from "./controllers/communityPlatform/member/posts/snapshots/CommunityplatformMemberPostsSnapshotsController";
import { CommunityplatformAdminPostsSnapshotsController } from "./controllers/communityPlatform/admin/posts/snapshots/CommunityplatformAdminPostsSnapshotsController";
import { CommunityplatformMemberPostsReportsController } from "./controllers/communityPlatform/member/posts/reports/CommunityplatformMemberPostsReportsController";
import { CommunityplatformAdminPostsReportsController } from "./controllers/communityPlatform/admin/posts/reports/CommunityplatformAdminPostsReportsController";
import { CommunityplatformCommentsController } from "./controllers/communityPlatform/comments/CommunityplatformCommentsController";
import { CommunityplatformMemberCommentsController } from "./controllers/communityPlatform/member/comments/CommunityplatformMemberCommentsController";
import { CommunityplatformAdminCommentsController } from "./controllers/communityPlatform/admin/comments/CommunityplatformAdminCommentsController";
import { CommunityplatformAdminCommentsReportsController } from "./controllers/communityPlatform/admin/comments/reports/CommunityplatformAdminCommentsReportsController";
import { CommunityplatformMemberCommentsReportsController } from "./controllers/communityPlatform/member/comments/reports/CommunityplatformMemberCommentsReportsController";
import { CommunityplatformAdminVotesController } from "./controllers/communityPlatform/admin/votes/CommunityplatformAdminVotesController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformAdminAdminactionsController } from "./controllers/communityPlatform/admin/adminActions/CommunityplatformAdminAdminactionsController";
import { CommunityplatformAdminAuditlogsController } from "./controllers/communityPlatform/admin/auditLogs/CommunityplatformAdminAuditlogsController";
import { CommunityplatformAdminAppealsController } from "./controllers/communityPlatform/admin/appeals/CommunityplatformAdminAppealsController";
import { CommunityplatformMemberAppealsController } from "./controllers/communityPlatform/member/appeals/CommunityplatformMemberAppealsController";
import { CommunityplatformAdminSearchQueriesController } from "./controllers/communityPlatform/admin/search/queries/CommunityplatformAdminSearchQueriesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberPasswordResetInitiateController,
    AuthMemberPasswordResetCompleteController,
    AuthAdminController,
    CommunityplatformAdminCategoriesController,
    CommunityplatformAdminBannedwordsController,
    CommunityplatformAdminConfigurationsController,
    CommunityplatformAdminGuestsController,
    CommunityplatformMemberSessionsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformAdminSessionsController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformMemberCommunitiesMembershipsController,
    CommunityplatformMemberCommunitiesRecentcommunitiesController,
    CommunityplatformMemberCommunitiesRulesController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformMemberPostsSnapshotsController,
    CommunityplatformAdminPostsSnapshotsController,
    CommunityplatformMemberPostsReportsController,
    CommunityplatformAdminPostsReportsController,
    CommunityplatformCommentsController,
    CommunityplatformMemberCommentsController,
    CommunityplatformAdminCommentsController,
    CommunityplatformAdminCommentsReportsController,
    CommunityplatformMemberCommentsReportsController,
    CommunityplatformAdminVotesController,
    CommunityplatformMemberVotesController,
    CommunityplatformAdminAdminactionsController,
    CommunityplatformAdminAuditlogsController,
    CommunityplatformAdminAppealsController,
    CommunityplatformMemberAppealsController,
    CommunityplatformAdminSearchQueriesController,
  ],
})
export class MyModule {}
