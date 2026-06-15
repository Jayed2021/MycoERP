# Inventory Management

MycoERP tracks all supplies and consumables used in farm operations. The inventory system helps ensure you never run out of critical materials and provides records of how supplies are consumed.

## What Is Tracked

The inventory system manages items such as:

- **Substrates** -- Sawdust, bran, straw, coco coir, gypsum, grain.
- **Lab Supplies** -- Agar, dextrose, peptone, petri dishes, scalpels.
- **Packaging** -- Spawn bags, substrate bags, filters, impulse sealer bags.
- **Consumables** -- Alcohol, gloves, masks, parafilm.
- **Equipment consumables** -- HEPA filter replacements, autoclave tape, pH strips.

Each item has:
- A name and category.
- A unit of measurement (kg, liters, pieces, rolls, boxes).
- A current stock level.
- A minimum stock threshold (triggers a low-stock warning when current stock drops below this).
- An optional cost per unit and supplier name.

## Viewing Current Stock

Navigate to "Inventory" in the sidebar to see:

- All inventory items with their current stock levels.
- Items below minimum stock are highlighted in amber/red to draw attention.
- Filter by category (substrates, lab supplies, packaging, consumables).
- Search by item name.

## Recording Stock In (Receiving Supplies)

When new supplies arrive:

1. Navigate to Inventory.
2. Find the item that was received, or click it to open its detail.
3. Click "Record Movement" or "Stock In".
4. Select movement type: "Stock In".
5. Enter the quantity received.
6. Optionally add notes (e.g., "PO #4521, Delivered by ABC Supplies").
7. Click "Save".

The current stock is automatically increased by the received quantity.

## Recording Stock Out (Using Supplies)

When supplies are used but not directly linked to a specific batch:

1. Find the item in Inventory.
2. Click "Record Movement" or "Stock Out".
3. Select movement type: "Stock Out".
4. Enter the quantity used.
5. Add notes explaining what it was used for.
6. Click "Save".

## Recording "Used in Batch"

When supplies are consumed in a specific production batch (e.g., 5kg of sawdust used to make substrate batch SB-0012):

1. Find the item in Inventory.
2. Click "Record Movement".
3. Select movement type: "Used in Batch".
4. Enter the quantity consumed.
5. Select the related batch from the dropdown.
6. Click "Save".

This creates a traceable link between the inventory consumption and the specific batch, which is valuable for cost analysis and traceability.

## Recording Adjustments

If physical stock count does not match the system count (stock take discrepancy):

1. Find the item in Inventory.
2. Click "Record Movement".
3. Select movement type: "Adjustment".
4. Enter the quantity to adjust by (positive to add, negative to reduce).
5. Add notes explaining the reason (e.g., "Annual stock count -- found 3 extra boxes", "Correction: 2 bags were miscounted").
6. Click "Save".

## Recording Waste

When supplies are wasted (expired, damaged, spilled):

1. Find the item in Inventory.
2. Click "Record Movement".
3. Select movement type: "Waste".
4. Enter the quantity wasted.
5. Add notes explaining what happened (e.g., "Bag of grain split during handling", "Agar expired past use-by date").
6. Click "Save".

## Low Stock Alerts

When an item's current stock drops below its minimum stock threshold:

- The item is highlighted on the Inventory page.
- The Dashboard may show a low-stock indicator (if configured).
- This is a signal to reorder supplies before you run out.

## Movement History

Each item maintains a complete history of all movements:

- Click an item to see its movement log.
- Each entry shows: date, type, quantity, who recorded it, related batch (if any), and notes.
- This provides an audit trail for every unit of material entering or leaving stock.

## Adding a New Inventory Item

If you need to track a new supply that is not yet in the system:

1. Navigate to Inventory.
2. Click "Add Item".
3. Fill in:
   - **Name** -- What the item is called (e.g., "Wheat Grain").
   - **Category** -- Which group it belongs to (substrate, lab supply, packaging, consumable).
   - **Unit** -- How it is measured (kg, liters, pieces, bags, boxes).
   - **Current Stock** -- How much is currently on hand.
   - **Minimum Stock** -- At what level you should reorder.
   - **Cost Per Unit** -- Optional, for cost tracking.
   - **Supplier** -- Optional, for reordering reference.
4. Click "Save".

## Best Practices

- Record movements as they happen, not at the end of the day. Real-time tracking prevents discrepancies.
- Always use "Used in Batch" when supplies are consumed in production. This enables accurate cost-per-batch calculations.
- Perform physical stock counts monthly and record adjustments to keep the system accurate.
- When you notice stock getting low, inform the person responsible for purchasing.
- Keep notes descriptive. Future you will appreciate knowing why an adjustment was made.
