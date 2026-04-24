export type WishSticker = {
	id: string;
	x: number;
	y: number;
	/** 0.4–2; omitted or 1 = default */
	scale?: number;
};

export type WishRecord = {
	name: string;
	message: string;
	stickers: WishSticker[];
	drawing: string | null;
	createdAt: string;
};
