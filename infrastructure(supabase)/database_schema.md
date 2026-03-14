# Supabase Database Schema

This document contains the tables and their columns found in the Supabase public schema.

## Table: `test_results`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `test_name` | `string` | `text` | `` |  |
| `student_name` | `string` | `text` | `` |  |
| `marks_scored` | `integer` | `integer` | `` |  |
| `total_marks` | `integer` | `integer` | `` |  |
| `submission_time` | `string` | `timestamp with time zone` | `now()` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `test_categories`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `test_id` | `string` | `uuid` | `` | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `tests.id`.<fk table='tests' column='id'/> |
| `category_id` | `string` | `uuid` | `` | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `categories.id`.<fk table='categories' column='id'/> |
| `is_primary` | `boolean` | `boolean` | `False` | Indicates if this is the main category for the test |
| `added_at` | `string` | `timestamp with time zone` | `now()` |  |
| `added_by` | `string` | `uuid` | `` |  |

## Table: `page_views`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `session_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `sessions.id`.<fk table='sessions' column='id'/> |
| `visitor_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `visitors.id`.<fk table='visitors' column='id'/> |
| `page_path` | `string` | `text` | `` |  |
| `page_title` | `string` | `text` | `` |  |
| `timestamp` | `string` | `timestamp with time zone` | `now()` |  |
| `time_on_page` | `integer` | `integer` | `` |  |
| `referrer_page` | `string` | `text` | `` |  |
| `is_unique` | `boolean` | `boolean` | `False` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `question_reports`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `created_at` | `string` | `timestamp with time zone` | `CURRENT_TIMESTAMP` |  |
| `test_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `tests.id`.<fk table='tests' column='id'/> |
| `question_id` | `integer` | `integer` | `` |  |
| `reporter_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `creator_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `reason` | `string` | `text` | `` |  |
| `details` | `string` | `text` | `` |  |
| `status` | `string` | `text` | `open` |  |

## Table: `classes`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `name` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `test_registrations`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` |  |
| `test_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `tests.id`.<fk table='tests' column='id'/> |
| `started_at` | `string` | `timestamp with time zone` | `now()` |  |
| `metadata` | `` | `jsonb` | `` |  |

## Table: `profiles`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `` | Note:
This is a Primary Key.<pk/> |
| `full_name` | `string` | `text` | `` |  |
| `avatar_url` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `bio` | `string` | `text` | `` |  |
| `updated_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `designation` | `string` | `text` | `` |  |
| `email` | `string` | `text` | `` |  |
| `is_creator` | `boolean` | `boolean` | `False` |  |
| `following_visibility` | `string` | `text` | `public` |  |
| `is_verified_creator` | `boolean` | `boolean` | `False` |  |
| `verified_role` | `string` | `text` | `` |  |
| `verified_at` | `string` | `timestamp with time zone` | `` |  |
| `verified_by_admin_id` | `string` | `uuid` | `` |  |
| `is_premium` | `boolean` | `boolean` | `False` |  |
| `premium_expiry` | `string` | `timestamp with time zone` | `` |  |
| `plan_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `plans.id`.<fk table='plans' column='id'/> |

## Table: `tests`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `title` | `string` | `text` | `` |  |
| `description` | `string` | `text` | `` |  |
| `created_by` | `string` | `uuid` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `questions` | `` | `jsonb` | `` |  |
| `custom_id` | `string` | `text` | `` |  |
| `duration` | `integer` | `integer` | `` | Duration of the test in minutes |
| `revision_notes` | `string` | `text` | `` |  |
| `is_public` | `boolean` | `boolean` | `` | whether test created by user is public or not |
| `creator_name` | `string` | `text` | `` | name of the test creator |
| `creator_avatar` | `string` | `text` | `` |  |
| `institution_name` | `string` | `text` | `` |  |
| `institution_logo` | `string` | `text` | `` |  |
| `settings` | `` | `jsonb` | `` |  |
| `slug` | `string` | `text` | `` |  |
| `tags` | `array` | `text[]` | `` |  |
| `custom_category` | `string` | `text` | `` |  |
| `enable_section_mode` | `boolean` | `boolean` | `False` | If true, use sections JSONB instead of flat questions list |
| `has_scientific_calculator` | `boolean` | `boolean` | `False` | If true, show scientific calculator in test interface |
| `sections` | `` | `jsonb` | `` | Array of section objects with specific marking schemes |
| `section_marking_model` | `string` | `text` | `section-wise` | Determines if marks are defined at section level (section-wise) or question level (question-wise) when section mode is enabled. |
| `visibility` | `string` | `public.test_visibility` | `public` |  |
| `class_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/> |

## Table: `promo_redemptions`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `promo_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `promo_codes.id`.<fk table='promo_codes' column='id'/> |
| `user_id` | `string` | `uuid` | `` |  |
| `order_id` | `string` | `text` | `` |  |
| `discount_amount` | `number` | `numeric` | `` |  |
| `used_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `admins`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `email` | `string` | `text` | `` | Note:
This is a Primary Key.<pk/> |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `posts`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `author_id` | `string` | `uuid` | `` |  |
| `title` | `string` | `text` | `` |  |
| `slug` | `string` | `text` | `` |  |
| `summary` | `string` | `text` | `` |  |
| `content` | `` | `jsonb` | `` |  |
| `cover_image` | `string` | `text` | `` |  |
| `category` | `string` | `text` | `general` |  |
| `tags` | `array` | `text[]` | `` |  |
| `status` | `string` | `text` | `draft` |  |
| `is_pinned` | `boolean` | `boolean` | `False` |  |
| `view_count` | `integer` | `integer` | `0` |  |
| `like_count` | `integer` | `integer` | `0` |  |
| `published_at` | `string` | `timestamp with time zone` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `updated_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `follows`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `follower_id` | `string` | `uuid` | `` | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `following_id` | `string` | `uuid` | `` | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `post_likes`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `post_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `posts.id`.<fk table='posts' column='id'/> |
| `user_id` | `string` | `uuid` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `feedback`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `test_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `tests.id`.<fk table='tests' column='id'/> |
| `user_id` | `string` | `uuid` | `` |  |
| `rating` | `integer` | `integer` | `` |  |
| `comment` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `sender_name` | `string` | `text` | `` |  |
| `sender_email` | `string` | `text` | `` |  |
| `receiver_name` | `string` | `text` | `` |  |
| `receiver_email` | `string` | `text` | `` |  |
| `custom_test_id` | `string` | `text` | `` |  |

## Table: `user_tests`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` |  |
| `test_id` | `string` | `uuid` | `` |  |
| `answers` | `` | `jsonb` | `` |  |
| `score` | `number` | `numeric` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `snapshot_settings` | `` | `jsonb` | `` |  |
| `violation_log` | `` | `jsonb` | `` |  |
| `metadata` | `` | `jsonb` | `` |  |

## Table: `visitors`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `fingerprint` | `string` | `text` | `` |  |
| `first_seen_at` | `string` | `timestamp with time zone` | `now()` |  |
| `last_seen_at` | `string` | `timestamp with time zone` | `now()` |  |
| `total_visits` | `integer` | `integer` | `1` |  |
| `user_id` | `string` | `uuid` | `` |  |
| `country` | `string` | `text` | `` |  |
| `city` | `string` | `text` | `` |  |
| `device_type` | `string` | `text` | `` |  |
| `browser` | `string` | `text` | `` |  |
| `os` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `updated_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `materials`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `title` | `string` | `text` | `` |  |
| `type` | `string` | `text` | `` |  |
| `url` | `string` | `text` | `` |  |
| `thumbnail_url` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `file_path` | `string` | `text` | `` |  |
| `class_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/> |

## Table: `test_likes`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `extensions.uuid_generate_v4()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` |  |
| `test_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `tests.id`.<fk table='tests' column='id'/> |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `plans`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `name` | `string` | `text` | `` |  |
| `description` | `string` | `text` | `` |  |
| `price` | `integer` | `integer` | `` |  |
| `duration_days` | `integer` | `integer` | `` |  |
| `features` | `` | `jsonb` | `` |  |
| `is_active` | `boolean` | `boolean` | `True` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `support_messages`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `name` | `string` | `text` | `` |  |
| `email` | `string` | `text` | `` |  |
| `phone` | `string` | `text` | `` |  |
| `message` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `status` | `string` | `text` | `pending` |  |
| `user_id` | `string` | `uuid` | `` |  |
| `resolved_at` | `string` | `timestamp with time zone` | `` |  |
| `resolved_by` | `string` | `uuid` | `` |  |

## Table: `daily_stats`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `stat_date` | `string` | `date` | `` |  |
| `total_visitors` | `integer` | `integer` | `0` |  |
| `new_visitors` | `integer` | `integer` | `0` |  |
| `returning_visitors` | `integer` | `integer` | `0` |  |
| `total_sessions` | `integer` | `integer` | `0` |  |
| `total_page_views` | `integer` | `integer` | `0` |  |
| `avg_session_duration` | `number` | `numeric` | `0` |  |
| `bounce_rate` | `number` | `numeric` | `0` |  |
| `top_pages` | `` | `jsonb` | `` |  |
| `top_referrers` | `` | `jsonb` | `` |  |
| `device_breakdown` | `` | `jsonb` | `` |  |
| `country_breakdown` | `` | `jsonb` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
| `updated_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `app_settings`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `unlock_all_premium` | `boolean` | `boolean` | `False` |  |
| `updated_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `updated_by` | `string` | `text` | `` |  |

## Table: `sessions`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `visitor_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `visitors.id`.<fk table='visitors' column='id'/> |
| `session_token` | `string` | `text` | `` |  |
| `started_at` | `string` | `timestamp with time zone` | `now()` |  |
| `ended_at` | `string` | `timestamp with time zone` | `` |  |
| `duration_secs` | `integer` | `integer` | `0` |  |
| `page_count` | `integer` | `integer` | `0` |  |
| `entry_page` | `string` | `text` | `` |  |
| `exit_page` | `string` | `text` | `` |  |
| `referrer` | `string` | `text` | `` |  |
| `utm_source` | `string` | `text` | `` |  |
| `utm_medium` | `string` | `text` | `` |  |
| `utm_campaign` | `string` | `text` | `` |  |
| `is_bounce` | `boolean` | `boolean` | `True` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |

## Table: `categories`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `name` | `string` | `text` | `` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |

## Table: `notifications`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `user_id` | `string` | `uuid` | `` | Note:
This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/> |
| `title` | `string` | `text` | `` |  |
| `message` | `string` | `text` | `` |  |
| `link` | `string` | `text` | `` |  |
| `is_read` | `boolean` | `boolean` | `False` |  |
| `created_at` | `string` | `timestamp with time zone` | `timezone('utc'::text, now())` |  |
| `custom_test_id` | `string` | `text` | `` |  |
| `sender_name` | `string` | `text` | `` |  |
| `sender_email` | `string` | `text` | `` |  |
| `read` | `boolean` | `boolean` | `False` |  |

## Table: `promo_codes`

| Column | Type | Format | Default | Description |
|---|---|---|---|---|
| `id` | `string` | `uuid` | `gen_random_uuid()` | Note:
This is a Primary Key.<pk/> |
| `code` | `string` | `text` | `` |  |
| `type` | `string` | `text` | `` |  |
| `value` | `number` | `numeric` | `` |  |
| `max_discount` | `number` | `numeric` | `` |  |
| `min_order_value` | `number` | `numeric` | `0` |  |
| `max_uses` | `integer` | `integer` | `` |  |
| `used_count` | `integer` | `integer` | `0` |  |
| `valid_from` | `string` | `timestamp with time zone` | `now()` |  |
| `valid_till` | `string` | `timestamp with time zone` | `` |  |
| `is_active` | `boolean` | `boolean` | `True` |  |
| `created_at` | `string` | `timestamp with time zone` | `now()` |  |
