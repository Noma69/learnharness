export interface BabelResource {
	id: number;
	title: string;
	type: string;
	fileName: string | null;
	filePath: string | null;
	absolutePath: string | null;
	exists: boolean;
	sizeBytes: number | null;
	isPdf: boolean;
	isMarkdown: boolean;
}

export interface BabelGuide {
	available: boolean;
	title: string;
	fileName: string;
	absolutePath: string;
	actionsCount: number;
}

export interface BabelChapter {
	id: number;
	moduleNumber: number;
	title: string;
	hasGuide: boolean;
	guide: BabelGuide | null;
	resources: BabelResource[];
}

export interface BabelSubject {
	id: number;
	title: string;
	slug: string;
	icon: string;
	color: string;
	chapters: BabelChapter[];
}
