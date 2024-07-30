import { parseISO } from 'date-fns';
import { describe, expect, test } from 'vitest';
import { addMessageToCache } from './cache';
describe(addMessageToCache.name, () => {
    test('given message, returns cache with message added to syndicatedItems list', () => {
        const cache = {
            lastSyndicated: parseISO('2024-01-01'),
            syndicatedItems: new Set(),
        };
        const message = {
            id: 'foobar',
            content: 'Foobar!',
        };
        const result = addMessageToCache(cache, message);
        expect(result).toStrictEqual(expect.objectContaining({
            syndicatedItems: new Set(['foobar']),
        }));
    });
    test('given message, returns cache with updated lastSyndicated ', () => {
        const cache = {
            lastSyndicated: parseISO('2024-01-01'),
            syndicatedItems: new Set(),
        };
        const message = {
            id: 'foobar',
            content: 'Foobar!',
        };
        const result = addMessageToCache(cache, message);
        expect(result).not.toStrictEqual(expect.objectContaining({
            lastSyndicated: parseISO('2024-01-01'),
        }));
    });
});
