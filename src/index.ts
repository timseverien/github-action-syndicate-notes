import {
	addMessageToCache,
	createMessageFilter,
	getCache,
	persistCache,
} from '@/lib/cache';
import type { MessagesFromSourceGetter } from '@/lib/sources/common';
import { getMessagesFromJsonFeedUrl } from '@/lib/sources/jsonfeed';
import * as core from '@actions/core';
import {
	type PublishOptions as SyndicateOptions,
	createDiscordIntegration,
	createMastodonIntegration,
	publish as syndicate,
} from '@tsev/social-gateway';
import type { Integration } from '@tsev/social-gateway/integrations/common';
import { z } from 'zod';

export function createIntegrationOrNull<
	T extends string,
	InputMap = Record<T, string>,
>(
	inputKeys: T[],
	factory: (inputs: InputMap) => Integration,
): Integration | null {
	const inputs = Object.fromEntries(
		inputKeys.map((input) => [input, core.getInput(input)]),
	) as InputMap;

	if (!Object.values(inputs as object).every((a) => Boolean(a))) {
		return null;
	}

	return factory(inputs);
}

const FEED_KEYS = ['jsonfeed'] as const;
const FEED_PARSE_MAP: {
	[key in (typeof FEED_KEYS)[number]]: MessagesFromSourceGetter;
} = {
	jsonfeed: getMessagesFromJsonFeedUrl,
} as const;

const integrations = [
	createIntegrationOrNull(
		['discordWebhookId', 'discordWebhookToken'],
		(inputs) =>
			createDiscordIntegration({
				webhookId: inputs.discordWebhookId,
				webhookToken: inputs.discordWebhookToken,
			}),
	),
	createIntegrationOrNull(
		['mastodonInstance', 'mastodonAccessToken'],
		(inputs) =>
			createMastodonIntegration({
				accessToken: inputs.mastodonAccessToken,
				instanceUrl: inputs.mastodonInstance,
			}),
	),
];

const cacheDirectorySchema = z.string().min(1);
const contentFormatSchema = z.string().min(1);
const feedTypeSchema = z.enum(FEED_KEYS);
const feedUrlSchema = z.string().url();

try {
	const cacheDirectory = cacheDirectorySchema.parse(
		core.getInput('cacheDirectory'),
	);
	const contentFormat = contentFormatSchema.parse(
		core.getInput('contentFormat'),
	);
	const feedType = feedTypeSchema.parse(core.getInput('feedType'));
	const feedUrl = new URL(feedUrlSchema.parse(core.getInput('feedUrl')));

	const formatMessage = (content: string, url: string) =>
		contentFormat
			.replace(/{{content}}/g, content)
			.replace(/{{url}}/g, url)
			.trim();

	const cache = await getCache(cacheDirectory);
	const filterMessage = createMessageFilter(cache);

	const messages = await FEED_PARSE_MAP[feedType](feedUrl, {
		filter: filterMessage,
		format: formatMessage,
	});

	const options: SyndicateOptions = {
		integrations: integrations.filter((i): i is Integration => i !== null),
	};

	let isMessageFailed = false;

	core.info(
		`Syndicating ${messages.length} messages to ${options.integrations.length} platforms`,
	);

	// Cache is empty — this could be first run, so let's persist cache so next run has a starting point
	if (cache.syndicatedItems.size === 0) {
		await persistCache(cacheDirectory, cache);
	}

	for (const message of messages) {
		try {
			await syndicate(message, options);
		} catch (error) {
			core.error(`Unable to syndicate message ${message.id}`);
			isMessageFailed = true;
		}

		try {
			addMessageToCache(cache, message);
			await persistCache(cacheDirectory, cache);
		} catch (error) {
			core.error('Unable to save to cache');
		}
	}

	if (isMessageFailed) {
		throw new Error('Not all messages were syndicated');
	}
} catch (error) {
	core.setFailed((error as Error).message);
}
