import { z } from 'zod';
const jsonFeedAttachmentSchema = z.object({
    mime_type: z.string().min(3).includes('/'),
    url: z.string().url(),
    title: z.string().optional(),
    size_in_bytes: z.number().optional(),
    duration_in_seconds: z.number().optional(),
});
const jsonFeedAuthorSchema = z.object({
    avatar: z.string().url().optional(),
    name: z.string().optional(),
    url: z.string().url().optional(),
});
const jsonFeedItemSchema = z.object({
    id: z.string().min(1),
    // One of these should be present
    content_html: z.string().optional(),
    content_text: z.string().optional(),
    authors: jsonFeedAuthorSchema.array().optional(),
    banner_image: z.string().url().optional(),
    date_modified: z.string().datetime().optional(),
    date_published: z.string().datetime().optional(),
    external_url: z.string().url().optional(),
    image: z.string().url().optional(),
    language: z.string().optional(),
    summary: z.string().optional(),
    tags: z.string().array().optional(),
    title: z.string().optional(),
    url: z.string().url().optional(),
    attachments: jsonFeedAttachmentSchema.array().optional(),
});
const jsonFeedSchema = z.object({
    version: z.string().startsWith('https://jsonfeed.org/version/').url(),
    title: z.string(),
    items: jsonFeedItemSchema.array(),
    authors: jsonFeedAuthorSchema.array().optional(),
    description: z.string().optional(),
    expired: z.boolean().optional(),
    favicon: z.string().url().optional(),
    feed_url: z.string().url().optional(),
    home_page_url: z.string().url().optional(),
    icon: z.string().url().optional(),
    language: z.string().optional(),
    next_url: z.string().optional(),
    user_comment: z.string().optional(),
    // Deprecated: JSON feed 1.0
    author: jsonFeedAuthorSchema.optional(),
});
export const getMessages = async (url, { format, filter }) => {
    try {
        const response = await fetch(url);
        const json = await response.json();
        const feed = jsonFeedSchema.parse(json);
        return feed.items
            .map((item) => {
            const contentMessage = item.content_text ?? item.content_html ?? '';
            const contentUrl = item.url ?? '';
            return {
                id: item.id,
                language: item.language ?? feed.language ?? undefined,
                content: format(contentMessage, contentUrl ?? ''),
            };
        })
            .filter(filter);
    }
    catch (error) {
        throw new Error(`Unable to read feed ${url}`);
    }
};
