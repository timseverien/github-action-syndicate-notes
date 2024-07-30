import { addMessageToCache, createMessageFilter, getCache, persistCache, } from '@/lib/cache';
import { getMessages as getMessagesFromJsonFeed } from '@/lib/sources/jsonfeed';
import * as core from '@actions/core';
import { publish as syndicate, } from '@tsev/social-gateway';
import { createDiscordIntegration } from '@tsev/social-gateway/integrations/discord/index';
import { createMastodonIntegration } from '@tsev/social-gateway/integrations/mastodon/index';
import { z } from 'zod';
export function createIntegrationOrNull(inputKeys, factory) {
    const inputs = Object.fromEntries(inputKeys.map((input) => [input, core.getInput(input)]));
    if (!Object.values(inputs).every((a) => Boolean(a))) {
        return null;
    }
    return factory(inputs);
}
const FEED_KEYS = ['jsonfeed'];
const FEED_PARSE_MAP = {
    jsonfeed: getMessagesFromJsonFeed,
};
const integrations = [
    createIntegrationOrNull(['discordWebhookId', 'discordWebhookToken'], (inputs) => createDiscordIntegration({
        webhookId: inputs.discordWebhookId,
        webhookToken: inputs.discordWebhookToken,
    })),
    createIntegrationOrNull(['mastodonInstance', 'mastodonAccessToken'], (inputs) => createMastodonIntegration({
        accessToken: inputs.mastodonAccessToken,
        instanceUrl: inputs.mastodonInstance,
    })),
];
const cacheDirectorySchema = z.string().min(1);
const contentFormatSchema = z.string().min(1);
const feedTypeSchema = z.enum(FEED_KEYS);
const feedUrlSchema = z.string().url();
try {
    const cacheDirectory = cacheDirectorySchema.parse(core.getInput('cacheDirectory'));
    const contentFormat = contentFormatSchema.parse(core.getInput('contentFormat'));
    const feedType = feedTypeSchema.parse(core.getInput('feedType'));
    const feedUrl = new URL(feedUrlSchema.parse(core.getInput('feedUrl')));
    const formatMessage = (content, url) => contentFormat
        .replace(/{{content}}/g, content)
        .replace(/{{url}}/g, url)
        .trim();
    const cache = await getCache(cacheDirectory);
    const filterMessage = createMessageFilter(cache);
    const messages = await FEED_PARSE_MAP[feedType](feedUrl, {
        filter: filterMessage,
        format: formatMessage,
    });
    const options = {
        integrations: integrations.filter((i) => i !== null),
    };
    let isMessageFailed = false;
    for (const message of messages) {
        try {
            await syndicate(message, options);
        }
        catch (error) {
            core.error(`Unable to syndicate message ${message.id}`);
            isMessageFailed = true;
        }
        try {
            addMessageToCache(cache, message);
            await persistCache(cacheDirectory, cache);
        }
        catch (error) {
            core.error('Unable to save to cache');
        }
    }
    if (isMessageFailed) {
        throw new Error('Not all messages were syndicated');
    }
}
catch (error) {
    core.setFailed(error.message);
}
