import { z } from 'zod';
import type {
	MessageFromSourceGetterFormatter,
	MessagesFromSourceGetter,
} from './common.js';

const jsonFeedAttachmentSchema = z.object({
	mime_type: z.string().min(3).includes('/'),
	url: z.string(),

	title: z.string().optional(),
	size_in_bytes: z.number().optional(),
	duration_in_seconds: z.number().optional(),
});

const jsonFeedAuthorSchema = z.object({
	avatar: z.string().optional(),
	name: z.string().optional(),
	url: z.string().optional(),
});

const jsonFeedItemSchema = z.object({
	id: z.string().min(1),

	// One of these should be present
	content_html: z.string().optional(),
	content_text: z.string().optional(),

	authors: jsonFeedAuthorSchema.array().optional(),
	banner_image: z.string().optional(),
	date_modified: z.string().datetime().optional(),
	date_published: z.string().datetime().optional(),
	external_url: z.string().optional(),
	image: z.string().optional(),
	language: z.string().optional(),
	summary: z.string().optional(),
	tags: z.string().array().optional(),
	title: z.string().optional(),
	url: z.string().optional(),
	attachments: jsonFeedAttachmentSchema.array().optional(),
});

const jsonFeedSchema = z.object({
	version: z.string().startsWith('https://jsonfeed.org/version/'),
	title: z.string(),
	items: jsonFeedItemSchema.array(),

	authors: jsonFeedAuthorSchema.array().optional(),
	description: z.string().optional(),
	expired: z.boolean().optional(),
	favicon: z.string().optional(),
	feed_url: z.string().optional(),
	home_page_url: z.string().optional(),
	icon: z.string().optional(),
	language: z.string().optional(),
	next_url: z.string().optional(),
	user_comment: z.string().optional(),

	// Deprecated: JSON feed 1.0
	author: jsonFeedAuthorSchema.optional(),
});

export type JsonFeed = z.infer<typeof jsonFeedSchema>;

export const getMessagesFromJsonFeedUrl: MessagesFromSourceGetter = async (
	url,
	{ format, filter },
) => {
	try {
		const response = await fetch(url);
		const json = await response.json();
		const feed = jsonFeedSchema.parse(json);

		const baseUrl = new URL(feed.feed_url ?? feed.home_page_url ?? url);

		return getMessagesFromJsonFeed(feed, {
			baseUrl,
			format,
		}).filter(filter);
	} catch (error) {
		console.error(error);
		throw new Error(`Unable to read feed ${url}`);
	}
};

export const getMessagesFromJsonFeed = (
	feed: JsonFeed,
	{
		baseUrl,
		format,
	}: {
		baseUrl: URL;
		format: MessageFromSourceGetterFormatter;
	},
) => {
	return feed.items.map((item) => {
		const contentMessage = item.content_text ?? item.content_html ?? '';
		const contentUrl = new URL(item.url ?? '/', baseUrl);

		return {
			id: item.id,
			language: item.language ?? feed.language ?? undefined,
			content: format(contentMessage, contentUrl.toString()),
		};
	});
};
