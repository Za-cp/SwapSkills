-- Insert initial categories
INSERT INTO categories (name, description, icon) VALUES
('Technology', 'Programming, web development, software engineering', 'code'),
('Design', 'Graphic design, UI/UX, illustration', 'palette'),
('Business', 'Marketing, finance, entrepreneurship', 'briefcase'),
('Languages', 'Foreign languages, communication', 'globe'),
('Music', 'Instruments, composition, production', 'music'),
('Sports', 'Fitness, athletics, outdoor activities', 'activity'),
('Cooking', 'Culinary arts, baking, nutrition', 'chef-hat'),
('Arts & Crafts', 'Painting, sculpture, handmade crafts', 'brush'),
('Education', 'Teaching, tutoring, academic subjects', 'book'),
('Health & Wellness', 'Yoga, meditation, healthcare', 'heart')
ON CONFLICT (name) DO NOTHING;

-- Insert initial skills for Technology category
INSERT INTO skills (name, description, category_id) 
SELECT 
  skill_name,
  skill_desc,
  c.id
FROM (
  VALUES 
    ('JavaScript', 'Modern JavaScript programming and frameworks'),
    ('Python', 'Python programming for web development and data science'),
    ('React', 'React.js library for building user interfaces'),
    ('Node.js', 'Server-side JavaScript development'),
    ('SQL', 'Database design and query optimization'),
    ('Git', 'Version control and collaboration'),
    ('Docker', 'Containerization and deployment'),
    ('AWS', 'Amazon Web Services cloud platform'),
    ('Machine Learning', 'AI and machine learning algorithms'),
    ('Mobile Development', 'iOS and Android app development')
) AS skills_data(skill_name, skill_desc)
CROSS JOIN categories c
WHERE c.name = 'Technology'
ON CONFLICT (name, category_id) DO NOTHING;

-- Insert initial skills for Design category
INSERT INTO skills (name, description, category_id)
SELECT 
  skill_name,
  skill_desc,
  c.id
FROM (
  VALUES 
    ('Photoshop', 'Adobe Photoshop for photo editing and design'),
    ('Figma', 'UI/UX design and prototyping'),
    ('Illustrator', 'Vector graphics and illustration'),
    ('UI Design', 'User interface design principles'),
    ('UX Research', 'User experience research and testing'),
    ('Branding', 'Brand identity and logo design'),
    ('Typography', 'Font selection and text design'),
    ('Color Theory', 'Color psychology and application'),
    ('Web Design', 'Website layout and visual design'),
    ('Animation', '2D and 3D animation techniques')
) AS skills_data(skill_name, skill_desc)
CROSS JOIN categories c
WHERE c.name = 'Design'
ON CONFLICT (name, category_id) DO NOTHING;
