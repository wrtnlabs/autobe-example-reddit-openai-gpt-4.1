import { IPage } from "./IPage";
import { ICommunityPlatformRecentCommunity } from "./ICommunityPlatformRecentCommunity";

export namespace IPageICommunityPlatformRecentCommunity {
  /**
   * Paginated list of recent community summary records. Each shows the ID,
   * member_id, community_id, and last interaction (touched_at). Used for
   * sidebar UIs, quick navigation, or recent community widgets.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformRecentCommunity.ISummary[];
  };
}
