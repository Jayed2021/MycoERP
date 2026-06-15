# Species, Strains, and Recipes

MycoERP maintains a catalog of mushroom species, their specific strains, and the substrate recipes used for production. This reference data is used throughout the system when creating batches, recording harvests, and defining process templates.

## Species

A species represents a type of mushroom that the farm cultivates. Each species record includes:

- **Name** -- The common name (e.g., Lion's Mane, Oyster, Pink Oyster, King Oyster, Reishi).
- **Scientific Name** -- The Latin binomial (e.g., Pleurotus ostreatus).
- **Description** -- General notes about the species.
- **Default Incubation Days** -- How long this species typically takes to fully colonize (used for estimated ready dates).
- **Default Fruiting Days** -- How long fruiting conditions typically last before harvest.
- **Default Harvest Window Days** -- How many days the harvest window stays open once pins form.

These default values help the system calculate expected ready dates when batches are created.

## Viewing Species

1. Navigate to "Species/Strains" in the sidebar.
2. The species list shows all mushroom types the farm grows.
3. Click a species to see its details, including all strains registered under it.

## Strains

A strain is a specific genetic line within a species. Different strains of the same species may perform differently (faster colonization, higher yield, different temperature preferences).

Each strain record includes:

- **Strain Code** -- A unique identifier (e.g., PO-01, LM-03, RE-02).
- **Strain Name** -- A descriptive name (e.g., "Blue Italian Oyster", "Florida White").
- **Source** -- Where the strain was obtained (vendor, another farm, wild collection).
- **Date Acquired** -- When the farm first received this strain.
- **Storage Method** -- How master cultures are preserved (slant, plate, liquid nitrogen, dried).
- **Expected Colonization Days** -- Strain-specific colonization time (overrides species default).
- **Expected Fruiting Days** -- Strain-specific fruiting time.
- **Expected Yield Notes** -- Typical yield information (e.g., "300-400g per 2.5kg block").
- **Notes** -- Any other relevant information about working with this strain.

## Creating a New Strain

If the farm acquires a new strain:

1. Navigate to Species/Strains.
2. Click on the relevant species.
3. Click "Add Strain".
4. Fill in the strain details.
5. Click "Save".

The new strain will then be available for selection when creating batches of that species.

## Recipes (Substrate Formulas)

A recipe defines the formula for preparing substrate. Different mushroom species and batch types may use different substrate compositions.

Each recipe includes:

- **Name** -- A descriptive name (e.g., "Hardwood Sawdust + Bran", "Straw Pasteurized").
- **Suitable Species** -- Which mushroom species this recipe is designed for.
- **Substrate Type** -- The primary material category (sawdust, straw, grain, etc.).
- **Process Method** -- How the substrate is prepared (sterilized, pasteurized, cold pasteurized).
- **Target Moisture Percent** -- The ideal moisture content for the prepared substrate.
- **Expected Colonization Days** -- How long substrate made with this recipe typically takes to colonize.
- **Expected Yield Notes** -- Typical production expectations.
- **Ingredients** -- The full list of components with quantities and percentages.

## Recipe Ingredients

Each recipe contains a list of ingredients with:

- **Ingredient Name** -- What material is used (e.g., "Oak Sawdust", "Wheat Bran", "Gypsum").
- **Quantity** -- How much per batch unit (e.g., 2.0 kg, 500 g).
- **Unit** -- Measurement unit (kg, g, liters, ml).
- **Percentage** -- What proportion of the total mix this ingredient represents (e.g., 80%, 15%, 5%).

## How Species/Strains/Recipes Are Used

When you create a new batch:

- You select a species and optionally a strain. This automatically suggests appropriate cultivation parameters.
- For substrate and fruiting block batches, you can select a recipe. This documents which formula was used.
- The system uses species/strain colonization and fruiting day estimates to calculate the expected ready date.
- Process templates can be linked to specific species, so the correct SOP is applied when batches of that species are created.

When you record a harvest:

- The species and strain from the parent batch are carried through, enabling yield-per-strain analytics.

## Managing Species and Strains

If you have edit permissions:

- **Adding a species** -- Click "Add Species" on the Species/Strains page. Fill in name, scientific name, and default cultivation parameters.
- **Editing a species** -- Click a species to view its detail, then click "Edit" to modify parameters.
- **Adding a strain** -- Navigate to the parent species and click "Add Strain".
- **Deactivating** -- If a species or strain is no longer cultivated, mark it as inactive rather than deleting it. This preserves historical batch records that reference it.

## Best Practices

- Keep strain notes up to date as you learn more about how each strain performs on your farm.
- When a new strain is acquired, start with a small test batch before committing to large-scale production.
- Update colonization and fruiting day estimates based on actual farm performance, not just vendor specifications.
- Document any recipe modifications in the notes field so you can track what works best.
- If you develop a new recipe variation, create it as a separate recipe rather than modifying the existing one -- this preserves historical records of what was used in past batches.
