# Troubleshooting

This guide covers common problems you may encounter when using MycoERP and how to resolve them.

## Login Issues

### Cannot Log In -- Wrong Credentials

**Symptom**: You enter your email and password but get an "Invalid credentials" error.

**Resolution**:
- Double-check that you are using the correct email address (check for typos).
- Ensure Caps Lock is not on -- passwords are case-sensitive.
- If you have forgotten your password, contact your administrator to reset it.
- Make sure you are using the correct application URL.

### Cannot Log In -- Account Inactive

**Symptom**: You enter correct credentials but get an "Account is inactive" message or are immediately signed out.

**Resolution**:
- Your account has been deactivated by an administrator.
- Contact your farm administrator to reactivate your account.
- This may happen if you were on extended leave and your account was disabled for security.

## Permission Issues

### Cannot See a Page or Menu Item

**Symptom**: A sidebar menu item is missing, or you navigate to a page and see "Access Denied".

**Resolution**:
- Your role does not have "View" permission for that module.
- This is by design -- different roles have access to different areas.
- If you believe you need access, ask your administrator to check your role assignment or modify permissions.

### Cannot Create, Edit, or Delete Something

**Symptom**: You can see a page but the "New", "Edit", or "Delete" buttons are missing or disabled.

**Resolution**:
- Your role has "View" permission but not "Create", "Edit", or "Delete" permission for that module.
- Ask your administrator to grant the appropriate permission if this is needed for your work.

### Cannot Approve Tasks

**Symptom**: Tasks are submitted for approval but you do not see an "Approve" or "Reject" button.

**Resolution**:
- Only roles with "Approve" permission for the Tasks module can approve tasks.
- Typically only Managers and Admins have this permission.
- If your role requires approval authority, ask your administrator.

## QR Scanner Issues

### Camera Not Working

**Symptom**: The QR scanner page shows a blank camera area or an error message.

**Resolution**:
1. Your browser needs permission to access the camera. Look for a camera icon in the browser's address bar and click "Allow".
2. If you previously blocked camera access, go to your browser's site settings and change the camera permission to "Allow".
3. Make sure no other application is using the camera (video calls, other browser tabs).
4. On mobile devices, ensure the browser app has camera permission in your phone's system settings.
5. Try closing and reopening the browser.

### QR Code Not Being Detected

**Symptom**: You hold a QR code in front of the camera but nothing happens.

**Resolution**:
- Ensure adequate lighting -- the camera needs to see the QR code clearly.
- Hold the code flat and steady, avoid tilting or bending.
- Move closer or farther until the QR code fills about 50-70% of the camera view.
- Make sure the label is not dirty, wet, or severely damaged.
- If the code is printed very small, you may need to get closer.
- As a fallback, use "Manual Entry" and type the code text printed below the QR image.

### "Invalid Code" After Scanning

**Symptom**: The scanner reads the code but reports "Invalid code".

**Resolution**:
- The scanned text does not match any QR code in the system.
- This may happen if you scan a QR code from a different system or a generic barcode.
- Check that the label is from MycoERP (text should start with QR-BATCH-, QR-LOC-, QR-RACK-, etc.).
- If the label text looks correct but the system does not recognize it, the QR code record may have been deleted or the code may belong to a different farm instance.

### "Inactive Code" After Scanning

**Symptom**: The scanner reads the code but reports "Inactive code".

**Resolution**:
- This QR code has been deactivated or replaced.
- Look for a newer replacement label on the batch or location.
- If no replacement exists, ask your manager to generate a new QR code for this entity.

### Offline Scanning Mode

**Symptom**: You scan a code and see an "Offline" indicator.

**Resolution**:
- Your device does not currently have network access.
- The basic batch information is still shown (read from the QR code data itself).
- Your scan will be logged locally and synced to the server when you regain connectivity.
- To get full details (current status, linked tasks, etc.), move to an area with network access and scan again.

## Task Issues

### Task Cannot Be Submitted

**Symptom**: The "Submit" button is grayed out or clicking it shows an error.

**Resolution**:
- Check if a photo is required and has not been uploaded yet.
- Check if QR scanning is required and scans have not been completed.
- Look for error messages indicating what is missing.
- Ensure all required fields are filled in.

### Task Was Rejected

**Symptom**: A task you submitted has been rejected and returned to you.

**Resolution**:
- Open the task detail page.
- Read the rejection reason provided by the manager.
- Make the requested corrections (retake photo, redo the work, add missing information).
- Submit the task again.

### Tasks Not Appearing on Dashboard

**Symptom**: You know you have tasks assigned but they do not show on your Dashboard.

**Resolution**:
- Tasks may be assigned to your role group rather than you specifically. Check the Tasks page with no filters.
- Tasks may be for a future date and not yet due.
- Filter the task list to "All statuses" to see completed and cancelled tasks too.
- If tasks are assigned to a different role than yours, you will not see them.

## Environmental Monitoring Issues

### IoT Device Showing Offline

**Symptom**: A sensor device shows "Offline" (red indicator) on the Devices page.

**Resolution**:
1. Physically check the device -- is it powered on? Is the LED blinking?
2. Check if the farm WiFi is working (can other devices connect?).
3. Verify the device has not been moved out of WiFi range.
4. Power cycle the device (unplug and replug).
5. If the device was recently re-registered, make sure the firmware has been updated with the new API key.
6. Check the "Last Seen" timestamp to know when it last reported successfully.

### Environmental Alert Keeps Firing

**Symptom**: You keep receiving alerts for the same room and condition.

**Resolution**:
- The system has deduplication (1 hour between identical alerts), but if conditions remain out of range for hours, new alerts will eventually be created.
- Resolve the underlying issue -- adjust the environment (turn on fans, adjust thermostat, fix humidifier).
- If the thresholds are too tight for actual conditions, ask your administrator to adjust the room thresholds.
- Acknowledge existing alerts so the team knows someone is aware.

### Manual Reading Not Saving

**Symptom**: You fill in the environmental log form and click Save, but it does not appear.

**Resolution**:
- Check your network connection.
- Make sure all required fields are filled (room, temperature, humidity).
- Try refreshing the page and entering the reading again.
- If the problem persists, ask your administrator to check database connectivity.

## Batch Issues

### Batch Appears Stuck in a Status

**Symptom**: A batch has been in the same status for longer than expected and will not advance.

**Resolution**:
- Check the batch's Tasks tab -- there may be incomplete tasks that need to be finished before the batch can advance.
- Some tasks have "target stage" or "target status" settings that auto-advance the batch when completed. If those tasks are not done, the batch stays put.
- A manager can manually change the batch status by editing the batch if the auto-advance tasks are not relevant.

### Cannot Find a Batch

**Symptom**: You know a batch exists but cannot find it in the Batches list.

**Resolution**:
- Check your batch type filter -- make sure you are looking under the correct tab (Agar, LC, Spawn, Substrate, Fruiting Block).
- Try searching by batch code in the search bar.
- The batch may have been closed or archived. Remove any status filters to see all batches.

## General Issues

### Page Shows "Loading" Indefinitely

**Symptom**: A page shows a loading spinner that never completes.

**Resolution**:
- Check your internet connection.
- Try refreshing the page (F5 or pull-to-refresh on mobile).
- Clear your browser cache and try again.
- If the issue persists, the database service may be temporarily unavailable. Wait a few minutes and retry.

### Changes Not Saving

**Symptom**: You edit something and click Save, but the changes do not persist after refresh.

**Resolution**:
- Check your internet connection.
- Look for error messages that appeared briefly after clicking Save.
- Verify you have "Edit" permission for the module you are trying to modify.
- Try the action again. If it continues to fail, report the issue to your administrator.

### Application Looks Different or Broken

**Symptom**: The interface looks strange, buttons are missing, or layout is wrong.

**Resolution**:
- Try a hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac).
- Clear your browser cache.
- Try a different browser.
- If using a very old browser, update to the latest version of Chrome, Firefox, Safari, or Edge.

## Getting Help

If none of the troubleshooting steps above resolve your issue:

1. Note exactly what you were trying to do.
2. Note any error messages you saw (take a screenshot if possible).
3. Note which page you were on and what you clicked.
4. Report the issue to your farm administrator with these details.
