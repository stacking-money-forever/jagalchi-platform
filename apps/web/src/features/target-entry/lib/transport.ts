import { createApiTransport } from '@jagalchi/api-client';

import { createCsrfAwareFetch } from '@/api/client';

export const entryTransport = createApiTransport('/api', createCsrfAwareFetch());
