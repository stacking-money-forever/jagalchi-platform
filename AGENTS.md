# Project instructions

## Product and deployment scope

- The web application is the current release target. Prioritize the Vercel deployment and the generated `@jagalchi/api-client` contract.
- Backend API runtime lives in `jagalchi-api`, AI runtime in `jagalchi-ai`, and personal-server compose/deploy in `jagalchi-infra`. Do not reintroduce embedded `services/*` or platform-root compose/deploy copies.
- Native mobile applications are planned for a later phase, after the web release.
- Apple App Store, Apple IAP, Apple purchase verification, iOS release, and native mobile deployment are out of scope for the current web phase unless the user explicitly switches the task to the later mobile phase.
- Do not treat Apple-specific credentials or verification settings as deployment requirements, missing-secret blockers, readiness gates, or recommended follow-up work for the web release.
- Do not proactively add, configure, audit, or suggest Apple App Store or Apple IAP infrastructure.
- Preserve existing Apple/mobile code for the later mobile phase. Do not remove or modify it unless the user explicitly asks.
