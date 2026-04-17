-- Allow 'html_composition' in the videos.video_type CHECK constraint.
--
-- Context: migration 20260128155718 added a CHECK constraint that only
-- permits ('youtube','direct','external'). Migration 20260417170000 added
-- the composition_json column and documented the html_composition media
-- mode, but did NOT update the existing CHECK — so inserts/updates with
-- video_type='html_composition' are rejected at the DB layer.
--
-- This migration drops the stale constraint and recreates it including
-- 'html_composition'. Safe for existing rows: all current values are a
-- subset of the new allowlist.

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_video_type_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_video_type_check
  CHECK (video_type IN ('youtube', 'direct', 'external', 'html_composition'));

COMMENT ON COLUMN public.videos.video_type IS
  'Type of lesson media: youtube, direct (uploaded MP4), external (HeyGen/Vimeo/etc), or html_composition (scene-based lesson).';
