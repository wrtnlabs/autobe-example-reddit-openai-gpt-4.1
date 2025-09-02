import { IPage } from "./IPage";
import { ICommunityPlatformVote } from "./ICommunityPlatformVote";

export namespace IPageICommunityPlatformVote {
  /**
   * Paginated response with a list of summarized vote records matching the
   * query or filter criteria.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformVote.ISummary[];
  };
}
