-- Add moderation fields to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add subcategories support
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create skill suggestions table for autocomplete
CREATE TABLE IF NOT EXISTS skill_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  search_terms TEXT[],
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert expanded categories with colors and icons
INSERT INTO categories (name, description, icon, color_hex, sort_order) VALUES
('Programming', 'Software development and coding', 'code', '#10B981', 1),
('Web Development', 'Frontend and backend web technologies', 'globe', '#3B82F6', 2),
('Mobile Development', 'iOS, Android, and cross-platform apps', 'smartphone', '#8B5CF6', 3),
('Data Science', 'Analytics, machine learning, and AI', 'bar-chart-3', '#F59E0B', 4),
('Creative Arts', 'Visual arts, design, and multimedia', 'palette', '#EF4444', 5),
('Music & Audio', 'Instruments, production, and sound', 'music', '#EC4899', 6),
('Languages', 'Foreign languages and communication', 'globe-2', '#06B6D4', 7),
('Business Skills', 'Marketing, finance, and entrepreneurship', 'briefcase', '#84CC16', 8),
('Health & Fitness', 'Physical wellness and mental health', 'heart', '#F97316', 9),
('Crafts & Hobbies', 'DIY, crafting, and recreational skills', 'scissors', '#6366F1', 10)
ON CONFLICT (name) DO UPDATE SET 
  color_hex = EXCLUDED.color_hex,
  sort_order = EXCLUDED.sort_order;

-- Insert comprehensive skill list (100+ skills)
INSERT INTO skills (name, description, category_id, is_approved) 
SELECT skill_name, skill_desc, c.id, true
FROM (
  VALUES 
    -- Programming (20 skills)
    ('JavaScript', 'Modern JavaScript and ES6+ features', 'Programming'),
    ('Python', 'Python programming for various applications', 'Programming'),
    ('Java', 'Object-oriented programming with Java', 'Programming'),
    ('C++', 'Systems programming and performance optimization', 'Programming'),
    ('C#', 'Microsoft .NET development', 'Programming'),
    ('Go', 'Google''s programming language for scalable systems', 'Programming'),
    ('Rust', 'Systems programming with memory safety', 'Programming'),
    ('Swift', 'Apple''s programming language for iOS/macOS', 'Programming'),
    ('Kotlin', 'Modern programming for Android and JVM', 'Programming'),
    ('TypeScript', 'Typed superset of JavaScript', 'Programming'),
    ('PHP', 'Server-side web development', 'Programming'),
    ('Ruby', 'Dynamic programming language', 'Programming'),
    ('Scala', 'Functional and object-oriented programming', 'Programming'),
    ('R', 'Statistical computing and data analysis', 'Programming'),
    ('MATLAB', 'Technical computing and algorithm development', 'Programming'),
    ('Assembly', 'Low-level programming and computer architecture', 'Programming'),
    ('Shell Scripting', 'Bash and command-line automation', 'Programming'),
    ('SQL', 'Database queries and management', 'Programming'),
    ('NoSQL', 'Non-relational database technologies', 'Programming'),
    ('Git', 'Version control and collaboration', 'Programming'),
    
    -- Web Development (15 skills)
    ('React', 'Component-based UI library', 'Web Development'),
    ('Vue.js', 'Progressive JavaScript framework', 'Web Development'),
    ('Angular', 'Full-featured web application framework', 'Web Development'),
    ('Node.js', 'Server-side JavaScript runtime', 'Web Development'),
    ('Express.js', 'Web application framework for Node.js', 'Web Development'),
    ('Next.js', 'React framework for production', 'Web Development'),
    ('Nuxt.js', 'Vue.js framework for universal applications', 'Web Development'),
    ('Django', 'Python web framework', 'Web Development'),
    ('Flask', 'Lightweight Python web framework', 'Web Development'),
    ('Ruby on Rails', 'Web application framework', 'Web Development'),
    ('Laravel', 'PHP web application framework', 'Web Development'),
    ('WordPress', 'Content management system', 'Web Development'),
    ('Shopify', 'E-commerce platform development', 'Web Development'),
    ('GraphQL', 'Query language for APIs', 'Web Development'),
    ('REST APIs', 'RESTful web service design', 'Web Development'),
    
    -- Mobile Development (10 skills)
    ('iOS Development', 'Native iPhone and iPad apps', 'Mobile Development'),
    ('Android Development', 'Native Android applications', 'Mobile Development'),
    ('React Native', 'Cross-platform mobile development', 'Mobile Development'),
    ('Flutter', 'Google''s UI toolkit for mobile', 'Mobile Development'),
    ('Xamarin', 'Microsoft''s cross-platform framework', 'Mobile Development'),
    ('Ionic', 'Hybrid mobile app development', 'Mobile Development'),
    ('SwiftUI', 'Apple''s declarative UI framework', 'Mobile Development'),
    ('Jetpack Compose', 'Android''s modern UI toolkit', 'Mobile Development'),
    ('Mobile UI/UX', 'Mobile user interface design', 'Mobile Development'),
    ('App Store Optimization', 'Mobile app marketing', 'Mobile Development'),
    
    -- Data Science (12 skills)
    ('Machine Learning', 'ML algorithms and model training', 'Data Science'),
    ('Deep Learning', 'Neural networks and AI', 'Data Science'),
    ('Data Analysis', 'Statistical analysis and insights', 'Data Science'),
    ('Data Visualization', 'Charts, graphs, and dashboards', 'Data Science'),
    ('Pandas', 'Python data manipulation library', 'Data Science'),
    ('NumPy', 'Numerical computing with Python', 'Data Science'),
    ('TensorFlow', 'Machine learning framework', 'Data Science'),
    ('PyTorch', 'Deep learning framework', 'Data Science'),
    ('Tableau', 'Business intelligence and analytics', 'Data Science'),
    ('Power BI', 'Microsoft business analytics', 'Data Science'),
    ('Excel', 'Spreadsheet analysis and modeling', 'Data Science'),
    ('Statistics', 'Statistical methods and analysis', 'Data Science'),
    
    -- Creative Arts (15 skills)
    ('Photoshop', 'Photo editing and digital art', 'Creative Arts'),
    ('Illustrator', 'Vector graphics and illustration', 'Creative Arts'),
    ('Figma', 'UI/UX design and prototyping', 'Creative Arts'),
    ('Sketch', 'Digital design for Mac', 'Creative Arts'),
    ('InDesign', 'Layout and publishing design', 'Creative Arts'),
    ('After Effects', 'Motion graphics and visual effects', 'Creative Arts'),
    ('Premiere Pro', 'Video editing and production', 'Creative Arts'),
    ('Final Cut Pro', 'Professional video editing', 'Creative Arts'),
    ('Blender', '3D modeling and animation', 'Creative Arts'),
    ('Maya', 'Professional 3D animation', 'Creative Arts'),
    ('Cinema 4D', '3D modeling and rendering', 'Creative Arts'),
    ('Photography', 'Digital and film photography', 'Creative Arts'),
    ('Drawing', 'Traditional and digital illustration', 'Creative Arts'),
    ('Painting', 'Traditional and digital painting', 'Creative Arts'),
    ('Logo Design', 'Brand identity and logo creation', 'Creative Arts'),
    
    -- Music & Audio (10 skills)
    ('Guitar', 'Acoustic and electric guitar', 'Music & Audio'),
    ('Piano', 'Classical and modern piano', 'Music & Audio'),
    ('Drums', 'Acoustic and electronic drums', 'Music & Audio'),
    ('Violin', 'Classical and contemporary violin', 'Music & Audio'),
    ('Singing', 'Vocal techniques and performance', 'Music & Audio'),
    ('Music Production', 'Recording and mixing', 'Music & Audio'),
    ('Logic Pro', 'Digital audio workstation', 'Music & Audio'),
    ('Ableton Live', 'Music production software', 'Music & Audio'),
    ('Sound Design', 'Audio effects and soundscapes', 'Music & Audio'),
    ('Music Theory', 'Harmony, rhythm, and composition', 'Music & Audio'),
    
    -- Languages (8 skills)
    ('English', 'English language and communication', 'Languages'),
    ('Spanish', 'Spanish language and culture', 'Languages'),
    ('French', 'French language and culture', 'Languages'),
    ('German', 'German language and culture', 'Languages'),
    ('Chinese', 'Mandarin Chinese language', 'Languages'),
    ('Arabic', 'Arabic language and culture', 'Languages'),
    ('Japanese', 'Japanese language and culture', 'Languages'),
    ('Korean', 'Korean language and culture', 'Languages'),
    
    -- Business Skills (12 skills)
    ('Digital Marketing', 'Online marketing strategies', 'Business Skills'),
    ('Social Media Marketing', 'Social platform marketing', 'Business Skills'),
    ('SEO', 'Search engine optimization', 'Business Skills'),
    ('Content Marketing', 'Content strategy and creation', 'Business Skills'),
    ('Email Marketing', 'Email campaign management', 'Business Skills'),
    ('Project Management', 'Planning and execution', 'Business Skills'),
    ('Sales', 'Sales techniques and strategy', 'Business Skills'),
    ('Public Speaking', 'Presentation and communication', 'Business Skills'),
    ('Leadership', 'Team management and motivation', 'Business Skills'),
    ('Entrepreneurship', 'Starting and running businesses', 'Business Skills'),
    ('Financial Planning', 'Personal and business finance', 'Business Skills'),
    ('Accounting', 'Financial record keeping', 'Business Skills'),
    
    -- Health & Fitness (8 skills)
    ('Yoga', 'Physical and mental wellness', 'Health & Fitness'),
    ('Personal Training', 'Fitness coaching and exercise', 'Health & Fitness'),
    ('Nutrition', 'Diet and healthy eating', 'Health & Fitness'),
    ('Meditation', 'Mindfulness and mental health', 'Health & Fitness'),
    ('Pilates', 'Core strength and flexibility', 'Health & Fitness'),
    ('Running', 'Endurance and cardiovascular fitness', 'Health & Fitness'),
    ('Weight Training', 'Strength and muscle building', 'Health & Fitness'),
    ('Mental Health', 'Psychological wellness and therapy', 'Health & Fitness'),
    
    -- Crafts & Hobbies (10 skills)
    ('Cooking', 'Culinary arts and recipes', 'Crafts & Hobbies'),
    ('Baking', 'Bread, pastries, and desserts', 'Crafts & Hobbies'),
    ('Gardening', 'Plant care and landscaping', 'Crafts & Hobbies'),
    ('Knitting', 'Yarn crafts and patterns', 'Crafts & Hobbies'),
    ('Woodworking', 'Furniture and wood crafts', 'Crafts & Hobbies'),
    ('Pottery', 'Ceramics and clay work', 'Crafts & Hobbies'),
    ('Jewelry Making', 'Handmade jewelry and accessories', 'Crafts & Hobbies'),
    ('Sewing', 'Clothing and textile crafts', 'Crafts & Hobbies'),
    ('Home Improvement', 'DIY repairs and renovation', 'Crafts & Hobbies'),
    ('Car Maintenance', 'Automotive repair and care', 'Crafts & Hobbies')
) AS skills_data(skill_name, skill_desc, category_name)
JOIN categories c ON c.name = skills_data.category_name
ON CONFLICT (name, category_id) DO NOTHING;

-- Create search terms for autocomplete
INSERT INTO skill_suggestions (skill_id, search_terms, popularity_score)
SELECT 
  s.id,
  ARRAY[LOWER(s.name), LOWER(c.name)] || 
  CASE 
    WHEN s.name ILIKE '%script%' THEN ARRAY['coding', 'programming']
    WHEN s.name ILIKE '%design%' THEN ARRAY['creative', 'visual', 'ui', 'ux']
    WHEN s.name ILIKE '%development%' THEN ARRAY['coding', 'programming', 'dev']
    WHEN s.name ILIKE '%marketing%' THEN ARRAY['business', 'promotion', 'advertising']
    ELSE ARRAY[]::TEXT[]
  END,
  CASE 
    WHEN s.name IN ('JavaScript', 'Python', 'React', 'Photoshop', 'Guitar', 'English') THEN 100
    WHEN s.name IN ('Java', 'Node.js', 'Figma', 'Piano', 'Spanish') THEN 80
    ELSE 50
  END
FROM skills s
JOIN categories c ON s.category_id = c.id
ON CONFLICT DO NOTHING;

-- Enable RLS for new tables
ALTER TABLE skill_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies for skill suggestions
CREATE POLICY "Anyone can read skill suggestions" ON skill_suggestions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert skill suggestions" ON skill_suggestions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
