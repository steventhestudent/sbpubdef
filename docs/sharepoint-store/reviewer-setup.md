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

## Test Steps
- Add OfficeHoteling web part
- Create reservation
- Confirm:
    - Calendar event created
    - Email sent