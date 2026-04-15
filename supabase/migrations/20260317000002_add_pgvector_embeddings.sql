-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store transcript chunk embeddings for RAG
CREATE TABLE IF NOT EXISTS public.transcript_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_transcript_embeddings_video ON public.transcript_embeddings(video_id);
CREATE INDEX IF NOT EXISTS idx_transcript_embeddings_vector ON public.transcript_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE public.transcript_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read embeddings
CREATE POLICY "Authenticated users can read embeddings"
  ON public.transcript_embeddings FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Service role can manage embeddings"
  ON public.transcript_embeddings FOR ALL
  TO service_role
  USING (true);

-- Function to search transcript by similarity
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  query_embedding vector(1536),
  match_video_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_index integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.chunk_text,
    te.chunk_index,
    1 - (te.embedding <=> query_embedding) AS similarity
  FROM public.transcript_embeddings te
  WHERE te.video_id = match_video_id
    AND 1 - (te.embedding <=> query_embedding) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
