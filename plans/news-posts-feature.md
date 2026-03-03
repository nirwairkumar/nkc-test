# 📰 News & Posts Feature — Full Implementation Plan

> **Feature**: Admins and Verified Creators can publish rich-text news posts related to competitive exams.  
> **Benefit**: Students get a centralised feed of exam-related news, important links, test links, study materials, and updates — all in one place.

---

## 1. Feature Overview

| Aspect | Detail |
|---|---|
| **Who can create** | Admin, Verified Creators (`is_verified_creator = true`) |
| **Who can read** | All users (public, logged-in, anonymous) |
| **Content type** | Rich-text (WYSIWYG editor — like a web page, no code needed) |
| **Rich-text capabilities** | Headings, bold/italic/underline, font-size, font-color, highlight, bullet/numbered lists, tables, links (external + internal test links), images (upload/paste), embeds, block-quotes, dividers, code blocks |
| **SEO** | Each post gets a slug-based URL, meta tags, Open Graph for social sharing |

---

## 2. Database Schema (Supabase / PostgreSQL)

### 2.1 `posts` table

```sql
CREATE TABLE posts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Content
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,               -- URL-safe slug
  summary       TEXT,                                -- Short preview text (≤300 chars)
  content       JSONB NOT NULL,                      -- Rich-text stored as Tiptap JSON
  cover_image   TEXT,                                -- Public URL of cover image

  -- Metadata
  category      TEXT DEFAULT 'general',              -- e.g. jee, neet, upsc, ssc, general
  tags          TEXT[] DEFAULT '{}',                  -- Array of tags for filtering
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_pinned     BOOLEAN DEFAULT false,               -- Pinned posts appear at top

  -- Engagement
  view_count    INTEGER DEFAULT 0,
  like_count    INTEGER DEFAULT 0,

  -- Timestamps
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_published ON posts(published_at DESC);
```

### 2.2 `post_likes` table (optional — for like tracking)

```sql
CREATE TABLE post_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);
```

### 2.3 RLS Policies

```sql
-- Anyone can READ published posts
CREATE POLICY "Public read published posts"
  ON posts FOR SELECT
  USING (status = 'published');

-- Authors can read their own drafts
CREATE POLICY "Authors read own posts"
  ON posts FOR SELECT
  USING (auth.uid() = author_id);

-- Verified creators & admins can INSERT
CREATE POLICY "Verified creators can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_verified_creator = true OR role = 'admin')
    )
  );

-- Authors can UPDATE their own posts
CREATE POLICY "Authors update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Authors can DELETE their own posts
CREATE POLICY "Authors delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
```

### 2.4 Supabase Storage Bucket

```
Bucket: post-images
  ├── {user_id}/
  │   ├── cover_{timestamp}.webp
  │   └── inline_{timestamp}.webp
```

- Public bucket (read access for all), write access restricted to verified creators + admins.

---

## 3. Backend (FastAPI)

### 3.1 New Router: `backend/app/routers/posts.py`

Following the existing pattern (e.g., `materials.py`, `tests/write.py`).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/posts/feed` | Public | Paginated list of published posts (title, summary, cover, author, date) |
| `GET`  | `/api/posts/{slug}` | Public | Full post by slug |
| `GET`  | `/api/posts/my` | Auth | Creator's own posts (drafts + published) |
| `POST` | `/api/posts` | Auth + Verified | Create new post |
| `PUT`  | `/api/posts/{id}` | Auth + Owner | Update post |
| `DELETE` | `/api/posts/{id}` | Auth + Owner | Delete post (+ cleanup images) |
| `POST` | `/api/posts/{id}/publish` | Auth + Owner | Set status → `published`, set `published_at` |
| `POST` | `/api/posts/{id}/archive` | Auth + Owner | Set status → `archived` |
| `POST` | `/api/posts/upload-image` | Auth + Verified | Upload inline image to Supabase Storage |
| `POST` | `/api/posts/{id}/like` | Auth | Toggle like |
| `GET`  | `/api/posts/{id}/liked` | Auth | Check if current user liked |
| `PUT`  | `/api/posts/{id}/pin` | Admin only | Pin/unpin post |

### 3.2 Pydantic Models

```python
class PostCreate(BaseModel):
    title: str
    content: dict         # Tiptap JSON document
    summary: Optional[str]
    cover_image: Optional[str]
    category: str = "general"
    tags: List[str] = []
    status: str = "draft"

class PostUpdate(BaseModel):
    title: Optional[str]
    content: Optional[dict]
    summary: Optional[str]
    cover_image: Optional[str]
    category: Optional[str]
    tags: Optional[List[str]]
    status: Optional[str]
```

### 3.3 Authorization Helper

```python
def require_verified_creator(user, db):
    """Check if user is admin or verified creator."""
    profile = db.table("profiles").select("is_verified_creator, role").eq("id", user.id).single().execute()
    if not profile.data:
        raise HTTPException(403, "Profile not found")
    if not profile.data.get("is_verified_creator") and profile.data.get("role") != "admin":
        raise HTTPException(403, "Only verified creators or admins can create posts")
    return profile.data
```

### 3.4 Register Router in `main.py`

```python
from app.routers import posts
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])
```

---

## 4. Frontend (React + Vite)

### 4.1 Rich-Text Editor — Technology Choice

**Recommended: [Tiptap](https://tiptap.dev/)** (Industry standard, MIT-licensed)

| Why Tiptap | |
|---|---|
| Battle-tested | Used by GitLab, Substack, Notion alternatives |
| Headless | Fully customizable UI — matches your existing design system |
| Extension-based | Only include what you need (tables, links, images, colors, etc.) |
| JSON output | Stores as structured JSON — cleaner than raw HTML |
| React support | Official `@tiptap/react` package |

**NPM packages needed:**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm
npm install @tiptap/extension-color @tiptap/extension-text-style
npm install @tiptap/extension-highlight @tiptap/extension-text-align
npm install @tiptap/extension-link @tiptap/extension-image
npm install @tiptap/extension-table @tiptap/extension-table-row
npm install @tiptap/extension-table-cell @tiptap/extension-table-header
npm install @tiptap/extension-underline @tiptap/extension-placeholder
npm install @tiptap/extension-font-family @tiptap/extension-heading
```

### 4.2 New Files

```
frontend/src/
├── lib/
│   └── postsApi.ts                    # API client for posts endpoints
├── pages/
│   ├── NewsFeed.tsx                   # Public feed page (all published posts)
│   ├── NewsPostView.tsx               # Single post page (slug-based)
│   ├── NewsPostEditor.tsx             # Create/Edit post page (Tiptap editor)
│   └── MyPosts.tsx                    # Creator's dashboard for their posts
├── components/
│   ├── posts/
│   │   ├── PostCard.tsx               # Card for feed display
│   │   ├── PostToolbar.tsx            # Rich-text toolbar (bold, italic, tables, etc.)
│   │   ├── PostRenderer.tsx           # Renders Tiptap JSON to HTML (read-only)
│   │   ├── PostCategoryBadge.tsx      # Category pill badge
│   │   └── PostImageUpload.tsx        # Inline image upload handler
```

### 4.3 Route Setup (App.tsx)

```tsx
const NewsFeed = lazy(() => import("./pages/NewsFeed"));
const NewsPostView = lazy(() => import("./pages/NewsPostView"));
const NewsPostEditor = lazy(() => import("./pages/NewsPostEditor"));
const MyPosts = lazy(() => import("./pages/MyPosts"));

// Routes
<Route path="/news" element={<NewsFeed />} />
<Route path="/news/:slug" element={<NewsPostView />} />
<Route path="/news/create" element={<NewsPostEditor />} />       // Auth + Verified
<Route path="/news/edit/:id" element={<NewsPostEditor />} />     // Auth + Owner
<Route path="/my-posts" element={<MyPosts />} />                 // Auth + Verified
```

### 4.4 API Client: `postsApi.ts`

Following the existing pattern in `materialsApi.ts`, `testsApi.ts`:

```typescript
// Key functions:
export const fetchPostsFeed = (page, category?, search?) => ...
export const fetchPostBySlug = (slug) => ...
export const fetchMyPosts = () => ...
export const createPost = (data) => ...
export const updatePost = (id, data) => ...
export const deletePost = (id) => ...
export const publishPost = (id) => ...
export const archivePost = (id) => ...
export const uploadPostImage = (file) => ...
export const toggleLike = (id) => ...
export const checkLiked = (id) => ...
```

---

## 5. UI/UX Design Specifications

### 5.1 News Feed Page (`/news`)

- **Hero section**: Search bar + category filter pills (JEE, NEET, UPSC, SSC, General)
- **Post cards**: Cover image, title, summary (truncated), author avatar + name, date, category badge, like count
- **Pinned posts**: Shown at the top with a 📌 indicator
- **Infinite scroll** or pagination (12 posts per page)
- **"Write a Post" button**: Visible only to verified creators/admins (floating action button at bottom-right corner)

### 5.2 Single Post View (`/news/:slug`)

- **Cover image** (full-width banner)
- **Title** (H1)
- **Author info**: Avatar, name, verified badge, publish date
- **Content area**: Rendered rich-text output (headings, tables, images, links all clickable)
- **Like button** + share buttons
- **Related posts** sidebar or bottom section
- **Test links**: Automatically detected `/test/...` URLs rendered as interactive cards

### 5.3 Post Editor (`/news/create`)

- **Title field**: Large text input
- **Cover image**: Drag-and-drop or click to upload
- **Rich-text toolbar** (sticky at top when scrolling):
  - **Text**: Bold, Italic, Underline, Strikethrough
  - **Heading**: H1, H2, H3
  - **Font size**: Small, Normal, Large
  - **Color**: Text color picker, Highlight color
  - **Lists**: Bullet, Numbered
  - **Alignment**: Left, Center, Right
  - **Insert**: Link, Image (upload), Table, Divider, Block Quote, Code Block
  - **Undo/Redo**
- **Category selector**: Dropdown
- **Tags**: Multi-tag input
- **Summary**: Auto-generated from first ~300 chars or manually written
- **Action buttons**: Save Draft, Preview, Publish
- **Auto-save** every 30 seconds on draft

### 5.4 My Posts Dashboard (`/my-posts`)

- List of creator's posts with status badges (Draft, Published, Archived)
- Quick actions: Edit, Delete, Publish/Unpublish
- Analytics per post: Views count, Likes count

---

## 6. Implementation Phases

### Phase 1 — Core (MVP) — ~3-4 days
1. Database: Create `posts` table, RLS policies, storage bucket
2. Backend: Create `posts.py` router with CRUD + publish + image upload
3. Frontend: Install Tiptap + build editor page
4. Frontend: Build news feed page with post cards
5. Frontend: Build single post view page
6. Register routes in `App.tsx` and router in `main.py`

### Phase 2 — Polish — ~2 days
7. Likes system (backend + frontend toggle)
8. Category filtering, search, tag filtering
9. Pinned posts (admin-only)
10. Auto-save drafts
11. Cover image upload with preview

### Phase 3 — Enhancement — ~1-2 days
12. Test-link detection: Auto-render platform test links as interactive cards
13. SEO: Meta tags, Open Graph, structured data
14. Share buttons (WhatsApp, Twitter, copy link)
15. Related posts algorithm
16. Add "News" link to navbar/sidebar navigation

---

## 7. Navigation Integration

Add a "News" item to the existing navigation:
- **Desktop navbar**: Add "📰 News" link between existing nav items
- **Mobile sidebar**: Add "📰 News" menu item
- **Landing page**: Add a "Latest News" section showing 3 recent pinned/published posts
- **Dashboard**: Show a "Latest Updates" widget if relevant

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| XSS from rich-text | Tiptap outputs structured JSON, rendered via its own sanitized renderer — no raw HTML injection |
| Unauthorized posting | Backend verifies `is_verified_creator` or admin role before allowing create/update |
| Image abuse | Rate limit image uploads (max 10 per post, max 5MB each), NSFW detection can be added later |
| Spam | Draft → Published requires explicit action; admin can archive any post |
| Slug collision | Generate slug from title + short random suffix |

---

## 9. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Database** | Supabase PostgreSQL |
| **Storage** | Supabase Storage (`post-images` bucket) |
| **Backend** | FastAPI (Python) — new `posts.py` router |
| **Frontend** | React + Vite + TypeScript |
| **Rich-Text Editor** | Tiptap (headless, extension-based) |
| **Styling** | Tailwind CSS (matches existing design) |
| **State Management** | React Query (TanStack Query — already in project) |

---

## 10. Verification Plan

### Automated
- After implementation, run `npm run build` in frontend to verify no TypeScript errors.
- Run backend server (`uvicorn app.main:app`) to verify router registration and endpoints respond.

### Manual Testing
1. **Create Post**: Log in as a verified creator → navigate to `/news/create` → write a rich post with headings, images, table, links → save as draft → verify it appears in `/my-posts`.
2. **Publish Post**: From `/my-posts`, click Publish → verify post appears on `/news` feed.
3. **View Post**: Click a post card → verify full content renders correctly at `/news/:slug`.
4. **Edit Post**: From `/my-posts`, click Edit → modify content → save → verify changes.
5. **Delete Post**: Delete a post → verify it's removed from feed and `/my-posts`.
6. **Unauthorized Access**: Log in as a regular (non-verified) user → verify "Write a Post" button is hidden and `/news/create` is blocked.
7. **Anonymous Access**: Open `/news` without logging in → verify feed loads correctly.
8. **Image Upload**: In editor, upload an inline image → verify it renders in preview and in published post.

---

> **Estimated Total Effort**: ~6-8 days for full feature (MVP + Polish + Enhancements)
