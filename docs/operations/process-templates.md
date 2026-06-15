# Process Templates (SOPs)

Process Templates are Standard Operating Procedures defined in MycoERP. They describe the sequence of tasks that should be performed for each type of batch. When a matching batch is created, the system automatically generates tasks from the template, ensuring consistent procedures.

## What Is a Process Template?

A process template is a blueprint for a series of tasks. Each template:

- Is linked to a specific batch type (agar, liquid culture, grain spawn, substrate, fruiting block).
- Can optionally be linked to a specific species.
- Contains an ordered list of steps, each of which becomes a task when the template is applied.
- Defines the timing, assignment, priority, and requirements for each step.

## How Templates Work

When a new batch is created:

1. The system looks for an active process template that matches the batch type (and optionally the species).
2. If a matching template is found, tasks are automatically generated from the template steps.
3. Each task's due date is calculated by adding the step's "day offset" to the batch start date.
4. Tasks are assigned to the role or department specified in each step.
5. Photo requirements, approval requirements, and QR requirements are carried from the template step to the task.
6. If a step has a "target stage" or "target status", completing that task will automatically advance the batch to that stage/status.

Workers do not need to do anything special -- when they create a batch, the appropriate tasks appear automatically in their task list.

## Viewing Templates

1. Navigate to "SOP Templates" in the sidebar.
2. You see a list of all templates, grouped by batch type.
3. Each template shows its name, batch type, species (if applicable), number of steps, and whether it is active.
4. Click a template to view its full step list.

## Template Steps

Each step in a template defines:

- **Step Order** -- The sequence position (1, 2, 3, etc.).
- **Title** -- What the task will be called (e.g., "Check for contamination", "Transfer to fruiting room").
- **Description** -- Detailed instructions for the worker.
- **Day Offset** -- How many days after the batch start date this task is due. For example, day offset 0 means due on the batch start date, day offset 7 means due one week after.
- **Due Time** -- Optional specific time of day when the task should be completed.
- **Assigned Role** -- Which role group receives this task (lab_worker, production_worker, harvest_worker, manager).
- **Assigned Department** -- Optional department assignment.
- **Priority** -- The urgency level (Low, Normal, High, Critical).
- **Photo Required** -- Whether the worker must upload a photo when completing this task.
- **Approval Required** -- Whether a manager must approve the completed task.
- **Target Stage** -- If set, the batch stage changes to this value when the task is completed.
- **Target Status** -- If set, the batch status changes to this value when the task is completed.

## Example: Grain Spawn Standard Template

A typical grain spawn template might have steps like:

1. Day 0: "Prepare and sterilize grain jars" (assigned to lab_worker, Normal priority)
2. Day 1: "Inoculate grain jars from liquid culture" (assigned to lab_worker, High priority, photo required, QR scan required)
3. Day 3: "First contamination check" (assigned to lab_worker, Normal priority)
4. Day 7: "Weekly shake and inspection" (assigned to lab_worker, Normal priority, photo required)
5. Day 14: "Second weekly shake and inspection" (assigned to lab_worker, Normal priority)
6. Day 14: "Check colonization progress" (assigned to lab_worker, Normal priority, photo required)
7. Day 21: "Assess full colonization" (assigned to lab_worker, High priority, approval required, target_status: "Colonized")
8. Day 22: "Transfer to storage or use in production" (assigned to production_worker, Normal priority, target_stage: "Ready to Use")
9. Day 28: "Final quality check before distribution" (assigned to manager, High priority, approval required)

## Creating a New Template (Managers/Admins)

1. Navigate to SOP Templates.
2. Click "New Template".
3. Fill in:
   - **Name** -- A clear name (e.g., "Oyster Substrate Preparation v2").
   - **Batch Type** -- Which batch type this template applies to.
   - **Species** -- Optional. If set, this template only applies to batches of this specific species.
   - **Description** -- Overview of what this template covers.
4. Click "Create".
5. Add steps one by one:
   - Click "Add Step".
   - Fill in all step fields (title, day offset, role, priority, requirements).
   - Click "Save Step".
   - Repeat for each step in the procedure.
6. When all steps are defined, ensure the template is marked as "Active".

## Editing a Template

1. Open the template detail page.
2. Click "Edit" to modify the template name, description, or settings.
3. Click on individual steps to edit them.
4. You can reorder steps by changing their step order number.
5. You can add new steps or remove existing ones.

Changes to a template only affect future batches. Batches already created will keep the tasks that were generated from the old template version.

## Activating and Deactivating Templates

- Only active templates are used when batches are created.
- If you have multiple templates for the same batch type, only the active one is applied.
- Deactivate old templates rather than deleting them, so you have a record of past procedures.
- To switch to a new version of an SOP, deactivate the old template and activate the new one.

## Multiple Templates for the Same Batch Type

If you have different procedures for different species within the same batch type:

- Create one template with the species set (e.g., "Liquid Culture - Lion's Mane" linked to Lion's Mane species).
- Create another template without a species set (e.g., "Liquid Culture - Standard" as a generic default).
- When a batch is created, the system first looks for a species-specific template. If none is found, it falls back to the generic template.

## Best Practices

- Start with the pre-loaded default templates and customize them based on your farm's actual procedures.
- Review templates quarterly to incorporate improvements learned from production experience.
- Use photo requirements for critical steps where visual verification is valuable (inoculation, contamination checks, harvest readiness).
- Use approval requirements for decisions that have significant consequences (marking a batch as colonized, clearing for harvest).
- Set appropriate day offsets based on actual cultivation timelines observed on your farm, not just textbook values.
- Include descriptive instructions in each step so new workers can follow the procedure without additional training.
