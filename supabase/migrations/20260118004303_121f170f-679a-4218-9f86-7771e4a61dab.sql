-- Create storage bucket for template reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-references', 'template-references', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to template reference images
CREATE POLICY "Public read access for template references"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-references');

-- Allow authenticated users to upload template reference files
CREATE POLICY "Authenticated users can upload template references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'template-references');

-- Allow authenticated users to delete template reference files
CREATE POLICY "Authenticated users can delete template references"
ON storage.objects FOR DELETE
USING (bucket_id = 'template-references');