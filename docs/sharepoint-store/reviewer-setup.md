# SBPubDef Reviewer Setup Guide

## Prerequisites
- SharePoint Online tenant
- Admin access to App Catalog
- Ability to approve API permissions

## Deployment Steps
1. Upload sbpubdef-sol.sppkg to App Catalog
2. Enable solution
3. Approve API permissions in SharePoint Admin Center:
    - Calendars.ReadWrite
    - Custom API (ID: ...)

## Required Setup
- Create or verify the following lists:
    - StaffDirectory
    - Assignments
    - HotelingReservations
      ...

- Ensure Entra groups exist:
    - Attorney
    - CDD
      ...

## Azure Function (Optional for full functionality)
- Deploy Azure Function
- Enable Easy Auth
- Configure App Registration
- Set FUNCTION_BASE_URL

### Azure Function permissions (required for CMS-created assignment calendar events)
The SPFx UI can create Outlook events in the signed-in user's calendar using delegated Graph.
However, **creating Outlook events in other users' calendars** (e.g. when an admin creates assignments for staff in CMS) requires an Azure Function using **application** Microsoft Graph permissions.

- **Function endpoint**: `POST /api/CreateAssignmentCalendarEvent`
- **Microsoft Graph application permissions** (grant admin consent):
  - `Calendars.ReadWrite` (create events in assignees' calendars)
  - (and any other permissions already required by your function deployment, e.g. SharePoint list mutation permissions used by PortalAssignmentsMutate)

## Test Steps
- Add OfficeHoteling web part
- Create reservation
- Confirm:
    - Calendar event created
    - Email sent

- CMS Assignments:
  - Create an assignment for an individual user with **Create Calendar Event?** checked
  - Confirm an Outlook event is created in the assignee's calendar