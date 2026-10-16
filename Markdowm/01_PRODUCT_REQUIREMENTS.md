# 01 — Product Requirements

## 1. Product concept

A mobile-first, browser-accessible short-video storytelling platform for devotional, mythology, folklore, and later general serialized stories. The first collection is **Guru Daiva Dutta**. The product must support multiple languages, genres, story universes, seasons/series, and short episodes without schema redesign.

Working name: **Daiva Stories** (placeholder; check trademarks/domain before use).

## 2. Target platforms

- Web: modern desktop and mobile browsers.
- iOS and Android: Expo / React Native.
- Shared TypeScript domain models and API client.
- Responsive layouts and accessible controls. Web URLs should be shareable and deep-link to a story or episode.

## 3. MVP user journeys

1. Visitor opens Home and sees featured stories and episode cards.
2. Visitor opens a story, reads synopsis, sees language, duration, content note, and episode list.
3. Visitor plays an episode, can pause/seek/adjust volume, enable captions, and see loading/error states.
4. Signed-in user can favorite a story and resume from last playback position.
5. User can search by title, description, language, deity/character tags, and category.
6. Admin can create/edit a story and episodes, upload a video asset, attach captions/poster, preview it, and publish/unpublish.
7. AI-assisted discovery can suggest content based on explicit user-selected interests and watch/favorite history. The user must be able to ignore/reset suggestions.
8. New story universes and categories are created through metadata/configuration, not hardcoded UI branches.

## 4. Initial content

- Seed 5–10 episodes about Guru Daiva Dutta.
- Each episode should have title, synopsis, language, duration, poster, video manifest URL, captions if available, content source/rights record, publication status, and reviewer approval.
- Do not download and re-upload arbitrary internet videos. A publicly viewable video is not necessarily licensed for redistribution. Use original AI-generated videos, commissioned work, properly licensed stock/assets, or written permission from rights holders. Keep evidence of rights.
- AI-generated religious/mythology content must be labeled appropriately where needed, reviewed by a human for cultural/religious accuracy, and must not falsely claim to be canonical scripture or a historical recording.

## 5. MVP screens

- Home / discovery
- Search results
- Story detail
- Episode player
- Sign in / account (can be phase 2)
- Favorites / Continue Watching
- Admin content list and edit/publish flow (simple protected web interface)
- Privacy and terms pages

## 6. Out of scope for first release

- Comments, public chat, social feed, creator marketplace
- Live video
- Offline downloads
- Paid coins, complex subscriptions, and pay-per-episode
- Real-time collaborative features
- Custom recommendation model
- Multi-cloud active-active deployment
- Kubernetes, Kafka, and microservices

## 7. Non-functional goals

Initial goals, to be validated by load tests:
- API p95 under 300 ms for simple metadata reads under a modest test load, excluding cold starts and third-party latency.
- Video startup and playback quality depend on encoding, CDN, network, and device; measure startup time, rebuffer ratio, playback errors, and completion.
- 99.5% monthly availability target for MVP, not a guarantee.
- Secure authentication and authorization, rate limiting, input validation, safe file upload, audit trail for publishing.
- Privacy by design: collect only data needed for playback and useful discovery; provide account/data deletion workflows before public launch.
- WCAG-oriented web accessibility, captions where available, keyboard-accessible controls.

## 8. Definition of done for MVP

- User can browse, play, search, favorite, and resume an episode.
- Admin can publish and unpublish content, with a rights record and review state required.
- API and frontend have automated tests for core flows.
- No secrets in Git; production configuration uses managed secret storage.
- Video is served through a CDN using adaptive bitrate HLS or an equivalent supported streaming format.
- Basic monitoring and error reporting are configured.
- Privacy policy, terms, content rights records, and AI disclosure/review process are ready.
