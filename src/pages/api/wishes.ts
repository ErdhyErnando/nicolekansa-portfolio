import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { WishRecord, WishSticker } from '../../types/wish';

export const prerender = false;

const MAX_NAME = 100;
const MAX_MESSAGE = 280;
const MAX_BODY_BYTES = 500_000;

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

export const GET: APIRoute = async () => {
	const list = await env.KV.list({ prefix: 'wish:' });
	const rows = await Promise.all(
		list.keys.map(async (k) => {
			const raw = await env.KV.get(k.name);
			if (!raw) return null;
			try {
				return JSON.parse(raw) as WishRecord;
			} catch {
				return null;
			}
		})
	);
	const wishes = rows.filter(Boolean) as WishRecord[];
	wishes.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	return Response.json(wishes);
};

export const POST: APIRoute = async ({ request }) => {
	const cl = request.headers.get('Content-Length');
	if (cl && Number(cl) > MAX_BODY_BYTES) {
		return jsonError('Payload too large', 413);
	}

	const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
	const { success } = await env.WISH_RATE_LIMITER.limit({ key: `wish:${ip}` });
	if (!success) {
		return jsonError('Too many requests', 429);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonError('Invalid JSON', 400);
	}

	if (!body || typeof body !== 'object') {
		return jsonError('Invalid body', 400);
	}

	const b = body as Record<string, unknown>;
	const name = typeof b.name === 'string' ? b.name.trim() : '';
	const message = typeof b.message === 'string' ? b.message.trim() : '';
	const stickersRaw = b.stickers;
	const drawing = b.drawing === null || typeof b.drawing === 'string' ? b.drawing : null;

	if (!name || name.length > MAX_NAME) {
		return jsonError(`Name required, max ${MAX_NAME} chars`, 400);
	}
	if (!message || message.length > MAX_MESSAGE) {
		return jsonError(`Message required, max ${MAX_MESSAGE} chars`, 400);
	}
	if (!Array.isArray(stickersRaw)) {
		return jsonError('stickers must be an array', 400);
	}

	const stickers: WishSticker[] = [];
	for (const s of stickersRaw) {
		if (!s || typeof s !== 'object') continue;
		const o = s as Record<string, unknown>;
		const id = typeof o.id === 'string' ? o.id : '';
		const x = typeof o.x === 'number' ? o.x : Number.NaN;
		const y = typeof o.y === 'number' ? o.y : Number.NaN;
		if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
		if (x < 0 || x > 1 || y < 0 || y > 1) continue;
		stickers.push({ id, x, y });
	}

	if (drawing && drawing.length > MAX_BODY_BYTES) {
		return jsonError('Drawing too large', 413);
	}

	const payload: WishRecord = {
		name,
		message,
		stickers,
		drawing,
		createdAt: new Date().toISOString()
	};

	const json = JSON.stringify(payload);
	if (json.length > MAX_BODY_BYTES) {
		return jsonError('Stored record too large', 413);
	}

	const key = `wish:${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
	await env.KV.put(key, json);

	return Response.json({ ok: true, key }, { status: 201 });
};
