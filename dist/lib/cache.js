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
function getCacheFilePath(directory) {
    return path.relative(directory, CACHE_FILE_NAME);
}
export function addMessageToCache(cache, message) {
    const items = new Set(cache.syndicatedItems);
    items.add(message.id);
    return {
        lastSyndicated: new Date(),
        syndicatedItems: items,
    };
}
export function createMessageFilter(cache) {
    return (message) => {
        // Message is explicitly included in syndicated items
        if (!cache.syndicatedItems.has(message.id))
            return false;
        // Message was published before last syndication
        if (message.publishDate &&
            isBefore(message.publishDate, cache.lastSyndicated))
            return false;
        return true;
    };
}
export async function getCache(directory) {
    const cacheFilePath = getCacheFilePath(directory);
    try {
        const buffer = await fs.readFile(cacheFilePath);
        const data = parse(buffer.toString());
        return cacheDataSchema.parse(data);
    }
    catch {
        return {
            lastSyndicated: new Date(),
            syndicatedItems: new Set(),
        };
    }
}
export async function persistCache(directory, cache) {
    const cacheFilePath = getCacheFilePath(directory);
    try {
        const data = await fs.writeFile(cacheFilePath, stringify(cache));
        return cacheDataSchema.parse(data);
    }
    catch {
        throw new Error('Unable to write cache');
    }
}
