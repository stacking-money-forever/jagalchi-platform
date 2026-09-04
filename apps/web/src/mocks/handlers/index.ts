import { authHandlers } from './auth';
import { careerHandlers } from './career';
import { githubHandlers } from './github';
import { profileHandlers } from './profile';
import { roadmapHandlers } from './roadmap';

export const handlers = [
  ...authHandlers,
  ...careerHandlers,
  ...githubHandlers,
  ...roadmapHandlers,
  ...profileHandlers,
];
