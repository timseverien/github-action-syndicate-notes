import type { Message } from '@/lib/message';
import { isBefore } from 'date-fns';
import { parse, stringify } from 'devalue';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { z } from 'zod';

const CACHE_FILE_NAME = 'syndicate-notes.json';

const cacheDataSchema = z.object({
	lastSyndicated: z.date(),
	syndicatedItems: z.set(z.string().min(1)),
});
export type CacheData = z.infer<typeof cacheDataSchema>;

function getCacheFilePath(directory: string): string {
	return path.relative(directory, CACHE_FILE_NAME);
}

export function addMessageToCache(
	cache: CacheData,
	message: Message,
): CacheData {
	const items = new Set(cache.syndicatedItems);
	items.add(message.id);

	return {
		lastSyndicated: new Date(),
		syndicatedItems: items,
	};
}

export function createMessageFilter(cache: CacheData) {
	return (message: Message) => {
		// Message is explicitly included in syndicated items
		if (!cache.syndicatedItems.has(message.id)) return false;

		// Message was published before last syndication
		if (
			message.publishDate &&
			isBefore(message.publishDate, cache.lastSyndicated)
		)
			return false;

		return true;
	};
}

export async function getCache(directory: string): Promise<CacheData> {
	const cacheFilePath = getCacheFilePath(directory);

	try {
		const buffer = await fs.readFile(cacheFilePath);
		const data = parse(buffer.toString());
		return cacheDataSchema.parse(data);
	} catch {
		return {
			lastSyndicated: new Date(),
			syndicatedItems: new Set(),
		};
	}
}

export async function persistCache(directory: string, cache: CacheData) {
	const cacheFilePath = getCacheFilePath(directory);

	try {
		await fs.writeFile(cacheFilePath, stringify(cache));
	} catch (error) {
		throw new Error(`Unable to write cache (${(error as Error).message})`);
	}
}
