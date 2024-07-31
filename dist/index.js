import { isBefore } from "date-fns";
import { parse, stringify } from "devalue";
import * as fs from "fs-extra";
import * as path from "node:path";
import { z } from "zod";
import * as core from "@actions/core";
import { publish } from "@tsev/social-gateway";
import { createDiscordIntegration } from "@tsev/social-gateway/integrations/discord/index";
import { createMastodonIntegration } from "@tsev/social-gateway/integrations/mastodon/index";
const CACHE_FILE_NAME = "syndicate-notes.json";
const cacheDataSchema = z.object({
  lastSyndicated: z.date(),
  syndicatedItems: z.set(z.string().min(1))
});
function getCacheFilePath(directory) {
  return path.relative(directory, CACHE_FILE_NAME);
}
function addMessageToCache(cache, message) {
  const items = new Set(cache.syndicatedItems);
  items.add(message.id);
  return {
    lastSyndicated: /* @__PURE__ */ new Date(),
    syndicatedItems: items
  };
}
function createMessageFilter(cache) {
  return (message) => {
    if (!cache.syndicatedItems.has(message.id)) return false;
    if (message.publishDate && isBefore(message.publishDate, cache.lastSyndicated))
      return false;
    return true;
  };
}
async function getCache(directory) {
  const cacheFilePath = getCacheFilePath(directory);
  try {
    const buffer = await fs.readFile(cacheFilePath);
    const data = parse(buffer.toString());
    return cacheDataSchema.parse(data);
  } catch {
    return {
      lastSyndicated: /* @__PURE__ */ new Date(),
      syndicatedItems: /* @__PURE__ */ new Set()
    };
  }
}
async function persistCache(directory, cache) {
  const cacheFilePath = getCacheFilePath(directory);
  try {
    const data = await fs.writeFile(cacheFilePath, stringify(cache));
    return cacheDataSchema.parse(data);
  } catch {
    throw new Error("Unable to write cache");
  }
}
const jsonFeedAttachmentSchema = z.object({
  mime_type: z.string().min(3).includes("/"),
  url: z.string().url(),
  title: z.string().optional(),
  size_in_bytes: z.number().optional(),
  duration_in_seconds: z.number().optional()
});
const jsonFeedAuthorSchema = z.object({
  avatar: z.string().url().optional(),
  name: z.string().optional(),
  url: z.string().url().optional()
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
  attachments: jsonFeedAttachmentSchema.array().optional()
});
const jsonFeedSchema = z.object({
  version: z.string().startsWith("https://jsonfeed.org/version/").url(),
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
  author: jsonFeedAuthorSchema.optional()
});
const getMessages = async (url, { format, filter }) => {
  try {
    const response = await fetch(url);
    const json = await response.json();
    const feed = jsonFeedSchema.parse(json);
    return feed.items.map((item) => {
      const contentMessage = item.content_text ?? item.content_html ?? "";
      const contentUrl = item.url ?? "";
      return {
        id: item.id,
        language: item.language ?? feed.language ?? void 0,
        content: format(contentMessage, contentUrl ?? "")
      };
    }).filter(filter);
  } catch (error) {
    throw new Error(`Unable to read feed ${url}`);
  }
};
function createIntegrationOrNull(inputKeys, factory) {
  const inputs = Object.fromEntries(
    inputKeys.map((input) => [input, core.getInput(input)])
  );
  if (!Object.values(inputs).every((a) => Boolean(a))) {
    return null;
  }
  return factory(inputs);
}
const FEED_KEYS = ["jsonfeed"];
const FEED_PARSE_MAP = {
  jsonfeed: getMessages
};
const integrations = [
  createIntegrationOrNull(
    ["discordWebhookId", "discordWebhookToken"],
    (inputs) => createDiscordIntegration({
      webhookId: inputs.discordWebhookId,
      webhookToken: inputs.discordWebhookToken
    })
  ),
  createIntegrationOrNull(
    ["mastodonInstance", "mastodonAccessToken"],
    (inputs) => createMastodonIntegration({
      accessToken: inputs.mastodonAccessToken,
      instanceUrl: inputs.mastodonInstance
    })
  )
];
const cacheDirectorySchema = z.string().min(1);
const contentFormatSchema = z.string().min(1);
const feedTypeSchema = z.enum(FEED_KEYS);
const feedUrlSchema = z.string().url();
try {
  const cacheDirectory = cacheDirectorySchema.parse(
    core.getInput("cacheDirectory")
  );
  const contentFormat = contentFormatSchema.parse(
    core.getInput("contentFormat")
  );
  const feedType = feedTypeSchema.parse(core.getInput("feedType"));
  const feedUrl = new URL(feedUrlSchema.parse(core.getInput("feedUrl")));
  const formatMessage = (content, url) => contentFormat.replace(/{{content}}/g, content).replace(/{{url}}/g, url).trim();
  const cache = await getCache(cacheDirectory);
  const filterMessage = createMessageFilter(cache);
  const messages = await FEED_PARSE_MAP[feedType](feedUrl, {
    filter: filterMessage,
    format: formatMessage
  });
  const options = {
    integrations: integrations.filter((i) => i !== null)
  };
  let isMessageFailed = false;
  for (const message of messages) {
    try {
      await publish(message, options);
    } catch (error) {
      core.error(`Unable to syndicate message ${message.id}`);
      isMessageFailed = true;
    }
    try {
      addMessageToCache(cache, message);
      await persistCache(cacheDirectory, cache);
    } catch (error) {
      core.error("Unable to save to cache");
    }
  }
  if (isMessageFailed) {
    throw new Error("Not all messages were syndicated");
  }
} catch (error) {
  core.setFailed(error.message);
}
export {
  createIntegrationOrNull
};
//# sourceMappingURL=index.js.map
