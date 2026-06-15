# Task Management

Tasks are work assignments that need to be completed as part of farm operations. They can be created manually or generated automatically from process templates when a batch is created.

## What Is a Task?

A task represents a specific piece of work. Each task has:

- A title describing what needs to be done.
- An optional description with detailed instructions.
- A linked batch (if the task relates to a specific production run).
- An assignee (a specific person or role group).
- A due date and time.
- A priority level (Low, Normal, High, or Critical).
- A status tracking its progress through the workflow.

## Task Statuses

Tasks move through these statuses:

- **Pending** -- The task has been created but no one has started it yet.
- **In Progress** -- Someone is actively working on the task.
- **Submitted for Approval** -- The worker has finished and submitted the task for manager review.
- **Approved** -- A manager has verified the work is satisfactory.
- **Rejected** -- A manager has sent the task back for correction.
- **Completed** -- The task is done (either auto-completed or approved).
- **Overdue** -- The due date has passed without completion.
- **Missed** -- Significantly past due with no progress.
- **Cancelled** -- The task is no longer needed.

## Priority Levels

- **Low** -- Can be done when convenient, no urgency.
- **Normal** -- Standard priority, should be completed by the due date.
- **High** -- Important task that should be prioritized over normal work.
- **Critical** -- Requires immediate attention. Appears highlighted on the Dashboard.

## Viewing Your Tasks

Navigate to "Tasks" in the sidebar to see all tasks. You can filter by:

- **Status** -- Show only pending, in progress, submitted, or completed tasks.
- **Priority** -- Filter by urgency level.
- **Assigned to** -- Show tasks for a specific person.
- **Batch** -- Show all tasks linked to a particular batch.
- **Due date** -- Filter by date range.

Tasks assigned to you or your role group appear on your Dashboard under "Today's Tasks" and "Overdue Tasks".

## Completing a Task (Worker Workflow)

When you are ready to work on a task:

1. Click the task to open its detail page.
2. Read the description and instructions carefully.
3. If the task is in "Pending" status, click "Start" to mark it as "In Progress".
4. Do the physical work described in the task.
5. If a photo is required, upload a photo showing the completed work.
6. If QR scanning is required (see below), complete all required scans.
7. Add any notes about the work performed.
8. Click "Submit" to submit the task.

If the task requires approval, it moves to "Submitted for Approval" and waits for a manager to review it. If no approval is required, it moves directly to "Completed".

## Photo Requirements

Some tasks require photographic evidence of completion:

- The task detail page will show "Photo Required" if this applies.
- You must upload at least one photo before you can submit the task.
- Take a clear photo showing the completed work (e.g., an inoculated plate, a colonized bag, a contamination observation).
- The photo is stored and linked to both the task and the associated batch.

## QR Scanning Requirements

Tasks may require one or more QR code scans to verify correct procedures:

- **Batch QR** -- Scan the batch QR code to confirm you are working with the correct batch.
- **Location QR** -- Scan the room or rack QR code to confirm you are in the correct location.
- **Checkpoint QR** -- Scan a checkpoint QR to verify a procedural step was performed at the right station.
- **Crate QR** -- Scan a harvest crate QR to confirm proper labeling.

When QR scanning is required:

1. The task detail page shows which scans are needed.
2. Click "Scan QR" for each requirement.
3. The camera scanner opens. Hold the QR code in view of the camera.
4. The system verifies the scanned code matches what is expected.
5. A green checkmark appears if the scan is successful.
6. If the wrong QR code is scanned, you will see an error and can retry.
7. Once all required scans are verified, you can submit the task.

If the camera is not available, you can type the QR code text manually.

## Manager Override for QR Requirements

If QR scanning cannot be completed (damaged code, lost label, etc.), a farm manager can override the requirement:

- The manager opens the task detail page.
- They click "Override QR Requirement".
- The override is logged for audit purposes.
- The task can then be submitted without the scan.

## Approving Tasks (Manager Workflow)

If you are a Farm Manager or Admin:

1. Navigate to Tasks and filter by "Submitted for Approval" status.
2. Click a submitted task to review it.
3. Check the work description, uploaded photos, and QR verifications.
4. If satisfactory, click "Approve". The task moves to "Approved" (and then "Completed").
5. If not satisfactory, click "Reject", provide a reason, and click confirm. The task moves to "Rejected" and the worker is notified.

When a task is rejected, the worker must:
- Review the rejection reason.
- Make corrections.
- Resubmit the task for another review.

## Tasks That Auto-Advance Batches

Some tasks are configured (via process templates) to automatically update the batch status when completed. For example:

- A "Transfer to Fruiting Room" task might automatically change the batch status from "Incubating" to "Fruiting".
- An "Initial Inspection" task might change the batch stage to "Colonizing".

This happens automatically when the task is approved or completed. You do not need to separately update the batch.

## Creating a Task Manually

If you have permission to create tasks:

1. Navigate to Tasks and click "New Task".
2. Fill in:
   - **Title** -- A clear description of what needs to be done.
   - **Description** -- Detailed instructions (optional but helpful).
   - **Batch** -- Link to a batch if applicable.
   - **Assign To** -- A specific person, or leave blank to assign to a role group.
   - **Assigned Role** -- If not assigning to a specific person, select which role group should see this task.
   - **Due Date** -- When this should be completed.
   - **Priority** -- How urgent this is.
   - **Photo Required** -- Toggle on if you need photographic evidence.
   - **Approval Required** -- Toggle on if a manager must review before completion.
3. Click "Create Task".

The assigned person (or role group) will receive a notification about the new task.

## Task Notifications

You will receive notifications when:

- A new task is assigned to you or your role group.
- Your task submission is approved.
- Your task submission is rejected (with the rejection reason).
- A task you manage has been submitted for approval.
- A task assigned to you is approaching its due date.
