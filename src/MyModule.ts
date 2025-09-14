import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { CommunityplatformAdminuserCategoriesController } from "./controllers/communityPlatform/adminUser/categories/CommunityplatformAdminuserCategoriesController";
import { CommunityplatformMemberuserCategoriesController } from "./controllers/communityPlatform/memberUser/categories/CommunityplatformMemberuserCategoriesController";
import { CommunityplatformAdminuserConfigurationsController } from "./controllers/communityPlatform/adminUser/configurations/CommunityplatformAdminuserConfigurationsController";
import { CommunityplatformAdminuserAuditlogsController } from "./controllers/communityPlatform/adminUser/auditLogs/CommunityplatformAdminuserAuditlogsController";
import { CommunityplatformAdminuserSessionsController } from "./controllers/communityPlatform/adminUser/sessions/CommunityplatformAdminuserSessionsController";
import { CommunityplatformAdminuserExternalintegrationsController } from "./controllers/communityPlatform/adminUser/externalIntegrations/CommunityplatformAdminuserExternalintegrationsController";
import { CommunityplatformAdminuserGuestusersController } from "./controllers/communityPlatform/adminUser/guestUsers/CommunityplatformAdminuserGuestusersController";
import { CommunityplatformAdminuserMemberusersController } from "./controllers/communityPlatform/adminUser/memberUsers/CommunityplatformAdminuserMemberusersController";
import { CommunityplatformMemberuserMemberusersController } from "./controllers/communityPlatform/memberUser/memberUsers/CommunityplatformMemberuserMemberusersController";
import { CommunityplatformAdminuserAdminusersController } from "./controllers/communityPlatform/adminUser/adminUsers/CommunityplatformAdminuserAdminusersController";
import { CommunityplatformAdminuserUsercredentialsController } from "./controllers/communityPlatform/adminUser/userCredentials/CommunityplatformAdminuserUsercredentialsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberuserCommunitiesController } from "./controllers/communityPlatform/memberUser/communities/CommunityplatformMemberuserCommunitiesController";
import { CommunityplatformAdminuserCommunitiesController } from "./controllers/communityPlatform/adminUser/communities/CommunityplatformAdminuserCommunitiesController";
import { CommunityplatformMemberuserCommunitiesMembershipsController } from "./controllers/communityPlatform/memberUser/communities/memberships/CommunityplatformMemberuserCommunitiesMembershipsController";
import { CommunityplatformMemberuserCommunitiesRulesController } from "./controllers/communityPlatform/memberUser/communities/rules/CommunityplatformMemberuserCommunitiesRulesController";
import { CommunityplatformCommunitiesRulesController } from "./controllers/communityPlatform/communities/rules/CommunityplatformCommunitiesRulesController";
import { CommunityplatformAdminuserCommunitiesRulesController } from "./controllers/communityPlatform/adminUser/communities/rules/CommunityplatformAdminuserCommunitiesRulesController";
import { CommunityplatformMemberuserRecentcommunitiesController } from "./controllers/communityPlatform/memberUser/recentCommunities/CommunityplatformMemberuserRecentcommunitiesController";
import { CommunityplatformAdminuserRecentcommunitiesController } from "./controllers/communityPlatform/adminUser/recentCommunities/CommunityplatformAdminuserRecentcommunitiesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberuserPostsController } from "./controllers/communityPlatform/memberUser/posts/CommunityplatformMemberuserPostsController";
import { CommunityplatformAdminuserPostsController } from "./controllers/communityPlatform/adminUser/posts/CommunityplatformAdminuserPostsController";
import { CommunityplatformMemberuserPostsVotesController } from "./controllers/communityPlatform/memberUser/posts/votes/CommunityplatformMemberuserPostsVotesController";
import { CommunityplatformAdminuserPostsVotesController } from "./controllers/communityPlatform/adminUser/posts/votes/CommunityplatformAdminuserPostsVotesController";
import { CommunityplatformAdminuserPostsModerationlogsController } from "./controllers/communityPlatform/adminUser/posts/moderationLogs/CommunityplatformAdminuserPostsModerationlogsController";
import { CommunityplatformCommentsController } from "./controllers/communityPlatform/comments/CommunityplatformCommentsController";
import { CommunityplatformMemberuserCommentsController } from "./controllers/communityPlatform/memberUser/comments/CommunityplatformMemberuserCommentsController";
import { CommunityplatformAdminuserCommentsController } from "./controllers/communityPlatform/adminUser/comments/CommunityplatformAdminuserCommentsController";
import { CommunityplatformAdminuserCommentsVotesController } from "./controllers/communityPlatform/adminUser/comments/votes/CommunityplatformAdminuserCommentsVotesController";
import { CommunityplatformMemberuserCommentsVotesController } from "./controllers/communityPlatform/memberUser/comments/votes/CommunityplatformMemberuserCommentsVotesController";
import { CommunityplatformAdminuserSearchlogsController } from "./controllers/communityPlatform/adminUser/searchLogs/CommunityplatformAdminuserSearchlogsController";
import { CommunityplatformAdminuserDataexportlogsController } from "./controllers/communityPlatform/adminUser/dataExportLogs/CommunityplatformAdminuserDataexportlogsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthAdminuserController,
    CommunityplatformAdminuserCategoriesController,
    CommunityplatformMemberuserCategoriesController,
    CommunityplatformAdminuserConfigurationsController,
    CommunityplatformAdminuserAuditlogsController,
    CommunityplatformAdminuserSessionsController,
    CommunityplatformAdminuserExternalintegrationsController,
    CommunityplatformAdminuserGuestusersController,
    CommunityplatformAdminuserMemberusersController,
    CommunityplatformMemberuserMemberusersController,
    CommunityplatformAdminuserAdminusersController,
    CommunityplatformAdminuserUsercredentialsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberuserCommunitiesController,
    CommunityplatformAdminuserCommunitiesController,
    CommunityplatformMemberuserCommunitiesMembershipsController,
    CommunityplatformMemberuserCommunitiesRulesController,
    CommunityplatformCommunitiesRulesController,
    CommunityplatformAdminuserCommunitiesRulesController,
    CommunityplatformMemberuserRecentcommunitiesController,
    CommunityplatformAdminuserRecentcommunitiesController,
    CommunityplatformPostsController,
    CommunityplatformMemberuserPostsController,
    CommunityplatformAdminuserPostsController,
    CommunityplatformMemberuserPostsVotesController,
    CommunityplatformAdminuserPostsVotesController,
    CommunityplatformAdminuserPostsModerationlogsController,
    CommunityplatformCommentsController,
    CommunityplatformMemberuserCommentsController,
    CommunityplatformAdminuserCommentsController,
    CommunityplatformAdminuserCommentsVotesController,
    CommunityplatformMemberuserCommentsVotesController,
    CommunityplatformAdminuserSearchlogsController,
    CommunityplatformAdminuserDataexportlogsController,
  ],
})
export class MyModule {}
