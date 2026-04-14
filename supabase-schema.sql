-- PROJECTS Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  original_idea TEXT NOT NULL
);

-- DRAFTS Table (Updated with project_id)
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  prompt_context TEXT,
  iteration INTEGER NOT NULL,
  content TEXT NOT NULL,
  critic_score INTEGER,
  critic_notes TEXT
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert projects" ON projects FOR INSERT WITH CHECK (true);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read drafts" ON drafts FOR SELECT USING (true);
CREATE POLICY "Allow public insert drafts" ON drafts FOR INSERT WITH CHECK (true);
