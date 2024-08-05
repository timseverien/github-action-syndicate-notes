import type { Message } from '@/lib/message';

export type MessageFromSourceGetterFilter = (message: Message) => boolean;
export type MessageFromSourceGetterFormatter = (
	content: string,
	url: string,
) => string;

export type MessagesFromSourceGetter = (
	url: URL,
	options: {
		filter: MessageFromSourceGetterFilter;
		format: MessageFromSourceGetterFormatter;
	},
) => Promise<Message[]>;
