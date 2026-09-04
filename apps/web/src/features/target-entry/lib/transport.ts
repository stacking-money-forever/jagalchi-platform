import { createApiTransport } from '@jagalchi/api-client';

export const entryTransport = createApiTransport('/api', fetch);
