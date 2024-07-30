import type { GatewayMessage } from '@tsev/social-gateway/core/message';

export type Message = GatewayMessage & {
	id: string;
	publishDate?: Date;
};
