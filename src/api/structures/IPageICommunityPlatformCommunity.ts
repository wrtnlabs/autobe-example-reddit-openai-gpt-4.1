import { IPage } from "./IPage";
import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace IPageICommunityPlatformCommunity {
  /**
   * Paginated results (IPage<T>) for community summary data. Provides paging,
   * total record counts, and an array of summary community card data. Used in
   * home feed, explore, and search results.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformCommunity.ISummary[];
  };
}
