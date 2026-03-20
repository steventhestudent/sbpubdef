export type ListResult = Record<string, string | undefined> & {
	Title?: string;
	Username?: string;
	TitleName?: string;
};

export interface PDStaffDirectoryItem {
	name?: string;
	username?: string;
	ext?: string;
	workCell?: string;
	personalCell?: string;
	titleName?: string;
}
