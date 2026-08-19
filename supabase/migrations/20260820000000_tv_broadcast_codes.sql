-- Create table for Smart TV Broadcast pairing codes
CREATE TABLE IF NOT EXISTS public.tv_broadcast_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Smart TV Display',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_connected_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.tv_broadcast_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read for active TV codes" ON public.tv_broadcast_codes;
DROP POLICY IF EXISTS "Allow admin full access to TV codes" ON public.tv_broadcast_codes;

-- Policy: Allow public read of active broadcast codes (for TV validation without login)
CREATE POLICY "Allow public read for active TV codes"
    ON public.tv_broadcast_codes
    FOR SELECT
    USING (is_active = true);

-- Policy: Admin full management
CREATE POLICY "Allow admin full access to TV codes"
    ON public.tv_broadcast_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );
