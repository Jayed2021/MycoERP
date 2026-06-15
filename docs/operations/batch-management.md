# Batch Management

Batches are the core unit of production in MycoERP. A batch represents a group of items moving through the cultivation pipeline together -- from a petri dish of agar all the way to harvested mushrooms.

## What Is a Batch?

A batch tracks a specific production run. Each batch has:

- A unique batch code (e.g., AP-0012, LC-0003, GS-0045).
- A batch type that describes what stage of the pipeline it represents.
- A species and strain identifying what mushroom is being grown.
- A current status showing where it is in its lifecycle.
- A health status indicating its condition.
- A physical location (room, rack, and shelf).
- A responsible person overseeing it.

## Batch Types

There are seven batch types, each representing a different stage of the cultivation pipeline:

- **Agar Culture (AP)** -- Petri dishes with mycelium growing on agar medium. Created in the lab for isolation, expansion, or transfer.
- **Liquid Culture (LC)** -- Liquid nutrient solution inoculated with mycelium. Used to produce large volumes of inoculant.
- **Grain Spawn (GS)** -- Sterilized grain colonized by mycelium. Acts as the "seed" for substrate production.
- **Substrate (SB)** -- Prepared growing medium (sawdust, straw, coco coir, etc.) that has been sterilized or pasteurized and is ready for inoculation.
- **Fruiting Block (FB)** -- Inoculated substrate bags or containers that are colonizing or actively fruiting mushrooms.
- **Harvest (HV)** -- A batch representing harvested product for tracking post-harvest handling.
- **Other (OT)** -- For any batch that does not fit the standard types.

## Creating a New Batch

1. Navigate to "Batches" in the sidebar.
2. Click the "New Batch" button in the top-right.
3. Fill in the required fields:
   - **Batch Type** -- Select the appropriate type from the dropdown.
   - **Species** -- Select the mushroom species.
   - **Strain** -- Select the specific strain (optional but recommended).
   - **Quantity** -- How many units are in this batch (e.g., 12 plates, 5 bags).
   - **Unit** -- The unit of measurement (plates, jars, bags, blocks, kg).
   - **Room** -- Where this batch is physically located.
   - **Start Date** -- When production began (defaults to today).
   - **Expected Ready Date** -- When you expect this batch to be ready for the next stage.
4. Optionally fill in:
   - **Recipe** -- The substrate formula used (for substrate and fruiting block batches).
   - **Rack and Shelf** -- Specific storage location within the room.
   - **Responsible Person** -- Who is overseeing this batch.
   - **Notes** -- Any relevant information.
   - **Source Batches** -- Link to parent batches (e.g., which grain spawn was used to inoculate this substrate).
5. Click "Create Batch".

When a batch is created:
- A unique batch code is automatically generated (e.g., AP-0001).
- A QR code is automatically generated and a download dialog appears (if auto-QR is enabled in settings).
- If a matching SOP template exists for this batch type and species, tasks are automatically generated.
- A "Batch Created" event is logged in the batch timeline.

## Batch Statuses

A batch moves through these statuses during its lifecycle:

- **Planned** -- The batch has been created but work has not started.
- **In Progress** -- Active production work is underway.
- **Incubating** -- The batch is colonizing and being monitored passively.
- **Fruiting** -- The batch is in fruiting conditions and producing mushrooms.
- **Pinning** -- Initial pin formation has been observed.
- **Ready** -- The batch is ready for the next stage or for harvest.
- **Ready to Harvest** -- Mushrooms are at harvest size.
- **Colonized** -- Mycelium has fully colonized the substrate.
- **Tested Clean** -- Lab testing confirms no contamination.
- **Closed** -- Production is complete and batch is archived.
- **Spent** -- The batch has been fully harvested and is no longer productive.
- **Contaminated** -- The batch has been compromised by contamination.
- **Discarded** -- The batch has been removed from production.
- **Failed** -- The batch did not succeed.

## Health Statuses

Independent of the production status, each batch has a health indicator:

- **Healthy** -- Normal growth, no issues observed.
- **Needs Inspection** -- Something requires a closer look.
- **Delayed** -- Growth is slower than expected.
- **Partially Contaminated** -- Some contamination is present but the batch may be salvageable.
- **Contaminated** -- Significant contamination detected.
- **Discarded** -- Removed from production due to issues.

## Viewing Batch Details

Click any batch in the list to open its detail page. The detail page has multiple tabs:

- **Info** -- The main batch information (type, species, strain, status, location, dates, notes).
- **Events** -- A chronological timeline of everything that has happened to this batch (creation, status changes, task completions, movements).
- **Photos** -- Images uploaded during production (inspection photos, contamination evidence, growth progress).
- **Tasks** -- All tasks linked to this batch, showing their completion status.
- **QR Codes** -- QR codes associated with this batch, with options to print or download.
- **Genealogy** -- Parent and child batch links showing the production lineage.
- **Contamination** -- Any contamination reports filed against this batch.
- **Harvest** -- Harvest records if this is a fruiting block batch.

## Editing a Batch

1. Open the batch detail page.
2. Click the "Edit" button.
3. Modify any fields as needed.
4. Click "Save" to apply changes.

Common edits include updating the status, changing the room location, updating health status, or adding notes.

## Moving a Batch

When a batch physically moves to a different room or rack:

1. Open the batch detail page.
2. Click "Move" (or edit the room/rack/shelf fields).
3. Select the new room, rack, and shelf.
4. The system logs a batch movement event with the previous and new locations.
5. If QR scanning is required for moves, you will be prompted to scan the batch QR and the destination location QR.

## Linking Source Batches (Genealogy)

To record which parent batch was used to create a new batch:

1. Open the child batch detail page.
2. Go to the "Genealogy" tab.
3. Click "Add Source Batch".
4. Search for and select the parent batch.
5. Choose the relationship type (e.g., "inoculation source", "transfer from").

This creates a traceable lineage from culture through to harvest.

## Closing a Batch

When a batch has completed its useful life:

1. Open the batch detail page.
2. Change the status to "Closed" or "Spent".
3. The batch remains in the system for records but is no longer shown in active batch counts.

## Filtering and Searching Batches

On the Batches list page:

- Use the batch type tabs at the top to filter by type (Agar, LC, Grain Spawn, Substrate, Fruiting Block).
- Use the search bar to find batches by batch code.
- Use the status filter to show only active, completed, or contaminated batches.

## Auto-Generated QR Codes

When a batch is created (and auto-QR is enabled in settings), the system:

1. Generates a unique QR code text (e.g., QR-BATCH-AP-0012).
2. Stores the QR code record linked to the batch.
3. Shows a dialog with the QR code, allowing you to download or print the label immediately.

The QR code encodes batch information that can be read even without network access. See the [QR Code System](./qr-codes.md) guide for details.

## Auto-Generated Tasks from Templates

If a process template (SOP) exists that matches the batch type and species:

- Tasks are automatically created based on the template steps.
- Each task is assigned a due date calculated from the batch start date plus the step's day offset.
- Tasks are assigned to the role or department specified in the template.
- This ensures that standard operating procedures are followed consistently for every batch.

See [Process Templates](./process-templates.md) for how templates work.
