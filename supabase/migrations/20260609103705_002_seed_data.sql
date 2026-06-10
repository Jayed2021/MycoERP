/*
# Seed Data for Mushroom Cultivation ERP

Populates initial reference data so the system is usable immediately.

1. 5 Mushroom species with cultivation parameters
2. 7 Production rooms
3. 16 Common inventory items
4. 7 Process templates with detailed steps for each batch type
*/

-- SPECIES
INSERT INTO species (name, scientific_name, description, default_incubation_days, default_fruiting_days, default_harvest_window_days) VALUES
('Lion''s Mane', 'Hericium erinaceus', 'Prized for its unique texture and cognitive benefits. Prefers cooler fruiting temps around 60-70°F.', 14, 14, 5),
('Oyster Mushroom', 'Pleurotus ostreatus', 'Fast growing, highly adaptable species. Excellent for beginners and commercial production.', 10, 7, 3),
('Pink Oyster', 'Pleurotus djamor', 'Tropical species requiring warm conditions. Vibrant pink color, fast cropper.', 7, 5, 2),
('King Oyster', 'Pleurotus eryngii', 'Dense meaty texture. Slower grower but higher value. Prefers cooler conditions.', 21, 21, 7),
('Reishi', 'Ganoderma lucidum', 'Medicinal mushroom grown for health products. Long cultivation cycle, antler or cap forms.', 30, 30, 14)
ON CONFLICT DO NOTHING;

-- ROOMS
INSERT INTO rooms (name, room_type, capacity, temp_min, temp_max, humidity_min, humidity_max, notes) VALUES
('Lab Room', 'lab', 50, 20, 25, 40, 60, 'Primary lab for agar work and liquid culture preparation'),
('Incubation Room 1', 'incubation', 200, 22, 26, 60, 75, 'Main incubation room for grain spawn and substrate blocks'),
('Fruiting Room 1', 'fruiting', 150, 18, 22, 85, 95, 'Primary fruiting room with automated humidity control'),
('Substrate Preparation Area', 'substrate_prep', 100, 18, 30, 40, 70, 'Area for mixing, hydrating, and bagging substrate'),
('Storage Room', 'storage', 500, 5, 15, 30, 50, 'Cold storage for spawn, cultures, and finished products'),
('Packaging Area', 'packaging', 80, 15, 22, 40, 60, 'Packaging and grading of harvested mushrooms'),
('Waste Area', 'waste', 200, 10, 35, 40, 80, 'Spent substrate and contaminated material disposal')
ON CONFLICT DO NOTHING;

-- INVENTORY ITEMS
INSERT INTO inventory_items (name, category, unit, current_stock, minimum_stock) VALUES
('Sawdust (Hardwood)', 'Substrate', 'kg', 500, 50),
('Wood Chips', 'Substrate', 'kg', 200, 30),
('Wheat Bran', 'Supplement', 'kg', 100, 20),
('Gypsum', 'Supplement', 'kg', 50, 10),
('Calcium Carbonate', 'Supplement', 'kg', 30, 5),
('Coco Coir', 'Substrate', 'kg', 80, 15),
('Straw (Wheat)', 'Substrate', 'kg', 300, 50),
('Grain (Rye)', 'Grain', 'kg', 200, 30),
('Agar (Agar-Agar Powder)', 'Lab Supply', 'g', 5000, 500),
('Dextrose', 'Lab Supply', 'g', 3000, 300),
('Petri Dish (90mm)', 'Lab Supply', 'pcs', 500, 100),
('Spawn Bag (Polypropylene)', 'Packaging', 'pcs', 1000, 200),
('Substrate Bag (Filter Patch)', 'Packaging', 'pcs', 1000, 200),
('Isopropyl Alcohol 70%', 'Cleaning Supply', 'L', 10, 2),
('Nitrile Gloves (Box)', 'Lab Supply', 'box', 20, 5),
('N95 / FFP2 Mask (Box)', 'Lab Supply', 'box', 10, 2)
ON CONFLICT DO NOTHING;

-- PROCESS TEMPLATE: Agar Culture
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Agar Culture Standard', 'agar', 'Standard process for preparing and growing agar culture plates')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req
FROM t, (VALUES
  (1, 'Prepare agar plates', 'Prepare and pour agar media into petri dishes under sterile conditions', 0, 'lab_worker', 'Lab', 'Normal', false, false),
  (2, 'Inoculate agar plates', 'Inoculate plates with source tissue or culture under laminar flow', 0, 'lab_worker', 'Lab', 'High', true, false),
  (3, 'Inspect agar growth', 'Check plates for mycelium growth and early contamination signs', 3, 'lab_worker', 'Lab', 'Normal', true, false),
  (4, 'Contamination check', 'Detailed contamination inspection. Remove and quarantine suspect plates', 5, 'lab_worker', 'Lab', 'High', true, true),
  (5, 'Mark clean plates or transfer', 'Identify clean plates for transfer. Mark contaminated plates for disposal', 7, 'lab_worker', 'Lab', 'High', true, true),
  (6, 'Final agar review', 'Final quality assessment before plates are used for LC or spawn inoculation', 10, 'manager', 'Lab', 'Normal', true, true)
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req);

-- PROCESS TEMPLATE: Liquid Culture
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Liquid Culture Standard', 'liquid_culture', 'Process for preparing and quality-testing liquid culture')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req
FROM t, (VALUES
  (1, 'Prepare LC media', 'Prepare liquid culture media (dextrose + water). Fill jars/bottles', 0, 'lab_worker', 'Lab', 'Normal', false, false),
  (2, 'Sterilize LC jars', 'Autoclave or pressure cook LC jars. Record sterilization time and temp', 0, 'lab_worker', 'Lab', 'High', false, false),
  (3, 'Inoculate LC from agar', 'Under sterile conditions, inoculate LC from clean agar plate', 1, 'lab_worker', 'Lab', 'High', true, false),
  (4, 'Inspect LC growth', 'Check for mycelium growth/cloudiness. Note any contamination signs', 5, 'lab_worker', 'Lab', 'Normal', true, false),
  (5, 'Shake/swirl LC', 'Agitate LC to distribute mycelium and increase growth rate', 7, 'lab_worker', 'Lab', 'Normal', false, false),
  (6, 'Put LC sample to test plate', 'Transfer small LC sample to agar test plate to check for contamination', 10, 'lab_worker', 'Lab', 'High', true, false),
  (7, 'Check LC test plate', 'Inspect test plate for contamination after incubation', 13, 'lab_worker', 'Lab', 'High', true, false),
  (8, 'Mark LC as Tested Clean or Contaminated', 'Final quality decision. Only clean LC should proceed to grain spawn inoculation', 14, 'manager', 'Lab', 'Critical', true, true)
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req);

-- PROCESS TEMPLATE: Grain Spawn
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Grain Spawn Standard', 'grain_spawn', 'Process from grain preparation through colonization to ready-to-use spawn')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req
FROM t, (VALUES
  (1, 'Prepare grain', 'Rinse and hydrate grain. Cook if needed. Check moisture', 0, 'production_worker', 'Spawn', 'Normal', false, false),
  (2, 'Sterilize grain jars/bags', 'Autoclave grain at 15 PSI for 90-120 minutes. Cool before inoculation', 0, 'production_worker', 'Spawn', 'High', false, false),
  (3, 'Inoculate grain spawn', 'Inject or transfer LC/agar to cooled grain jars in sterile environment', 1, 'lab_worker', 'Spawn', 'High', true, false),
  (4, 'Inspect for contamination', 'Early contamination check. Remove and quarantine any suspect jars', 3, 'lab_worker', 'Spawn', 'High', true, true),
  (5, 'Check colonization %', 'Estimate colonization percentage. Note any problem jars', 7, 'lab_worker', 'Spawn', 'Normal', true, false),
  (6, 'Shake spawn', 'Shake jars/bags at 30-40% colonization to distribute mycelium', 10, 'production_worker', 'Spawn', 'Normal', true, false),
  (7, 'Inspect after shake', 'Check jars after shake. Remove contaminated jars', 14, 'lab_worker', 'Spawn', 'Normal', true, false),
  (8, 'Check full colonization', 'Verify full white colonization throughout the grain', 18, 'lab_worker', 'Spawn', 'Normal', true, false),
  (9, 'Mark ready to use', 'Confirm spawn is fully colonized and ready. Label and move to storage', 21, 'manager', 'Spawn', 'Critical', true, true)
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req);

-- PROCESS TEMPLATE: Substrate Preparation
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Substrate Preparation Standard', 'substrate', 'Process for mixing, hydrating, bagging, and pasteurizing substrate')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req
FROM t, (VALUES
  (1, 'Weigh ingredients', 'Weigh all substrate ingredients according to recipe. Record dry weights', 0, 'production_worker', 'Substrate', 'Normal', false, false),
  (2, 'Mix substrate', 'Thoroughly mix all dry ingredients. Ensure even distribution', 0, 'production_worker', 'Substrate', 'Normal', false, false),
  (3, 'Check moisture level', 'Add water to target moisture (60-65%). Field capacity test', 0, 'production_worker', 'Substrate', 'High', true, false),
  (4, 'Fill and seal bags', 'Fill bags to consistent weight. Seal properly', 0, 'production_worker', 'Substrate', 'Normal', true, false),
  (5, 'Pasteurize or sterilize bags', 'Apply pasteurization or sterilization method as per recipe. Record times', 0, 'production_worker', 'Substrate', 'Critical', true, true),
  (6, 'Check cooling status', 'Verify bags have cooled to room temperature before inoculation', 1, 'production_worker', 'Substrate', 'High', false, false),
  (7, 'Mark ready for inoculation', 'Confirm bags are cooled, properly sealed, and ready for spawn inoculation', 1, 'manager', 'Substrate', 'High', false, true)
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req);

-- PROCESS TEMPLATE: Fruiting Block Incubation
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Fruiting Block Incubation', 'fruiting_block', 'Tracks incubation of inoculated substrate blocks through to fruiting readiness')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required, target_stage, target_status)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req, s.target_stage, s.target_status
FROM t, (VALUES
  (1, 'Inoculate substrate bags', 'Inoculate cooled substrate bags with grain spawn in sterile conditions', 0, 'lab_worker', 'Incubation', 'High', true, false, 'Incubation', 'Incubating'),
  (2, 'Inspect incubation bags', 'First contamination check. Remove any clearly contaminated bags', 3, 'production_worker', 'Incubation', 'High', true, false, NULL, NULL),
  (3, 'Inspect colonization progress', 'Check colonization advance. Note % colonization per bag', 7, 'production_worker', 'Incubation', 'Normal', true, false, NULL, NULL),
  (4, 'Contamination inspection', 'Detailed contamination check at mid-colonization', 12, 'lab_worker', 'Incubation', 'High', true, false, NULL, NULL),
  (5, 'Final colonization check', 'Verify full colonization. Identify and remove any remaining contamination', 16, 'lab_worker', 'Incubation', 'High', true, false, NULL, NULL),
  (6, 'Mark ready for fruiting', 'Confirm blocks are fully colonized and ready for fruiting room transfer', 20, 'manager', 'Incubation', 'Critical', true, true, 'Fruiting', 'Ready for Fruiting'),
  (7, 'Move to fruiting room', 'Transfer fully colonized blocks to fruiting room. Assign shelf location', 21, 'production_worker', 'Fruiting', 'High', true, true, 'Fruiting', 'Moved to Fruiting')
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req, target_stage, target_status);

-- PROCESS TEMPLATE: Fruiting Room Care
WITH t AS (
  INSERT INTO process_templates (name, batch_type, description) VALUES
  ('Fruiting Room Care', 'fruiting_block', 'Daily/periodic care tasks for fruiting blocks from pinning through harvest')
  RETURNING id
)
INSERT INTO process_template_steps (template_id, step_order, title, description, day_offset, assigned_role, assigned_department, priority, photo_required, approval_required, target_stage, target_status)
SELECT t.id, s.step_order, s.title, s.description, s.day_offset, s.assigned_role, s.dept, s.priority, s.photo_req, s.approval_req, s.target_stage, s.target_status
FROM t, (VALUES
  (1, 'Place blocks in fruiting room', 'Position blocks on shelves. Ensure adequate spacing for airflow', 0, 'production_worker', 'Fruiting', 'High', false, false, 'Fruiting', 'Fruiting'),
  (2, 'Record temperature and humidity', 'Log room environmental conditions. Adjust if outside target range', 1, 'production_worker', 'Fruiting', 'Normal', false, false, NULL, NULL),
  (3, 'Inspect for pinning', 'Check blocks for early primordia/pin formation', 2, 'production_worker', 'Fruiting', 'Normal', true, false, 'Fruiting', 'Pinning'),
  (4, 'Record room condition', 'Log environmental readings. Note any unusual conditions', 3, 'production_worker', 'Fruiting', 'Normal', false, false, NULL, NULL),
  (5, 'Inspect fruit body growth', 'Assess growth stage of pins. Estimate days to harvest', 5, 'production_worker', 'Fruiting', 'Normal', true, false, NULL, NULL),
  (6, 'Harvest check', 'Determine if mushrooms are ready for harvest based on size and veil', 7, 'production_worker', 'Fruiting', 'High', true, false, 'Fruiting', 'Ready to Harvest'),
  (7, 'Harvest flush 1', 'Harvest all mature mushrooms. Weigh and grade. Record flush 1 data', 8, 'harvest_worker', 'Harvest', 'Critical', true, true, 'Fruiting', 'Harvested Flush 1'),
  (8, 'Resting period check', 'Check blocks during rest. Ensure proper conditions maintained', 11, 'production_worker', 'Fruiting', 'Normal', false, false, 'Fruiting', 'Resting'),
  (9, 'Flush 2 harvest check', 'Check for flush 2 pin formation and readiness', 14, 'production_worker', 'Fruiting', 'Normal', true, false, NULL, NULL),
  (10, 'Mark spent or continue', 'Assess blocks. Mark spent/closed if no more productive flushes expected', 21, 'manager', 'Fruiting', 'Normal', true, true, NULL, 'Spent')
) AS s(step_order, title, description, day_offset, assigned_role, dept, priority, photo_req, approval_req, target_stage, target_status);
