import type { Message } from '@/lib/message';

export type MessagesFromSourceGetter = (
	url: URL,
	options: {
		filter: (message: Message) => boolean;
		format: (content: string, url: string) => string;
	},
) => Promise<Message[]>;
