import { describe, expect, test } from 'vitest';
import type { Message } from '../message';
import { getMessagesFromJsonFeed, type JsonFeed } from './jsonfeed';

describe(getMessagesFromJsonFeed.name, () => {
	test('given feed with paths for item URLs, returns messages full URLs', () => {
		const baseUrl = new URL('https://example.com/feed.json');
		const feed: JsonFeed = {
			title: 'Example feed',
			version: 'https://jsonfeed.org/version/1.1',
			items: [
				{
					id: 'ABC',
					content_text: 'Hello world!',
					url: '/posts/abc',
				},
				{
					id: 'DEF',
					content_text: 'Hello world! 2',
					url: '/posts/def',
				},
			],
		};

		const result = getMessagesFromJsonFeed(feed, {
			baseUrl,
			format: (_, url) => url,
		});

		expect(result).toStrictEqual<Message[]>([
			expect.objectContaining({
				id: 'ABC',
				content: 'https://example.com/posts/abc',
			}),
			expect.objectContaining({
				id: 'DEF',
				content: 'https://example.com/posts/def',
			}),
		]);
	});
});
