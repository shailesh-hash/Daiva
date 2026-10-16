# 06 — AI, Editorial Review, and Video Pipeline

## 1. Initial content strategy

For the first 5–10 episodes, choose one of:
1. Original scripts and AI-assisted visuals/narration with human editorial review.
2. Commissioned production with written rights assignment/license.
3. Content explicitly licensed for redistribution or verified public-domain material, with any separate music, image, performance, translation, and recording rights checked.

Do **not** download and re-upload videos from YouTube, Instagram, TikTok, or other services without permission. Public availability is not permission to redistribute. Do not assume a story being old means a modern recording, translation, screenplay, music track, illustration, or performance is public domain.

Keep a rights record per asset:
- rights type and source
- owner/licensor and evidence reference
- territory, platform, monetization, derivative-work, and expiry limits
- music/voice/visual rights
- reviewer and approval date

## 2. AI use cases

### MVP
- Draft title, synopsis, tags, content warnings, and translations from a human-approved script.
- Natural-language search: “short stories about courage in Kannada.”
- Explain recommendations with simple, non-sensitive reasons: “You chose Kannada and saved two folklore episodes.”
- Optional script brainstorming that is not published automatically.

### Later
- Semantic embeddings for catalogue search.
- Personalized ranking using explicit language/genre preferences, favorites, and watch completion.
- AI narration and dubbing with documented voice rights and appropriate disclosure.
- Caption generation and translation with human correction.

## 3. AI provider interface

Create a domain interface similar to:

```ts
export interface AiProvider {
  draftMetadata(input: {
    script: string;
    language: string;
    styleGuide: string;
  }): Promise<{
    title: string;
    synopsis: string;
    tags: string[];
    reviewNotes: string[];
  }>;

  discover(input: {
    query: string;
    language?: string;
    candidates: Array<{
      id: string;
      title: string;
      synopsis: string;
      tags: string[];
      language: string;
    }>;
    limit: number;
  }): Promise<{ orderedIds: string[]; explanationById: Record<string, string> }>;
}
```

Validate all output. In discovery, accept only IDs from the candidate set, cap result count, and escape or render text safely. Never accept model-supplied arbitrary URLs or SQL.

## 4. Recommendation design

Start with deterministic ranking:
- language match
- selected genre/category
- same universe or related tags
- recently published
- user favorites and completed stories, if the user has opted into personalization

Use transparent weights in ordinary code. AI can rerank a small, authorized candidate list, but it must not be the source of truth for content availability or access permissions. Keep an AI-off fallback.

Provide controls to disable personalization, clear history, and correct language/interest settings. Do not infer religion, caste, political views, or other sensitive traits from viewing behavior. Treat devotional viewing as sensitive enough to minimize and protect.

## 5. Prompt safety and editorial controls

- Treat user queries, scripts, captions, and uploaded metadata as untrusted input.
- Separate system instructions from content being summarized.
- Do not execute model-generated code, SQL, shell commands, or tool calls from content.
- Enforce output schema and length limits.
- AI-generated synopsis/script is always draft until approved by a human.
- Require human review for religious/cultural accuracy, translations, factual/canonical claims, age suitability, and potential offense.
- Clearly distinguish traditional/source-based narration from creative dramatization.
- Store model name/version and approval record where useful; avoid retaining unnecessary raw prompts.

## 6. Video delivery

Recommended flow:
1. Admin requests upload session.
2. API creates server-generated object key and short-lived signed URL.
3. Browser uploads directly to private object storage.
4. API validates upload completion and stores asset state.
5. Worker starts transcoding/packaging to adaptive bitrate HLS.
6. Worker generates poster/thumbnail and captions if configured.
7. Worker updates asset to `READY` only after validating expected outputs.
8. Reviewer previews video and approves rights/editorial record.
9. Publisher checks all conditions and publishes.
10. Client obtains playback session and loads manifest from CDN.

For a very small pilot, a managed video service may be more cost-effective than operating transcoding pipelines. Compare total cost, supported regions, data residency, player SDKs, DRM needs, and egress pricing before committing.

## 7. Video quality and performance

- Provide multiple HLS renditions; tune resolutions/bitrates to audience devices and network conditions.
- Use poster images and preload metadata rather than downloading full videos in feed.
- Do not autoplay audio unexpectedly; respect platform rules and user settings.
- Keep captions selectable and accessible.
- Measure startup time, rebuffering, failures, and completion.
- Avoid caching private signed manifests beyond their expiry.
