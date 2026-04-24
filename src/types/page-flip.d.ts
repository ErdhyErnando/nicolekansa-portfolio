declare module 'page-flip' {
	export class PageFlip {
		constructor(element: HTMLElement, options?: Record<string, unknown>);
		loadFromHTML(pages: NodeListOf<Element> | HTMLElement[]): void;
		turnToPage(pageIndex: number): void;
		turnToNextPage(): void;
		turnToPrevPage(): void;
		flipNext(corner?: string): void;
		flipPrev(corner?: string): void;
		flip(pageIndex: number, corner?: string): void;
		getCurrentPageIndex(): number;
		getPageCount(): number;
		destroy(): void;
	}
}
