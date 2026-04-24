export type WishSticker = { id: string; x: number; y: number };

export type WishRecord = {
	name: string;
	message: string;
	stickers: WishSticker[];
	drawing: string | null;
	createdAt: string;
};
