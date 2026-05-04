# transfer of work

  
1. Choose m365 business premium (has **feature complete** Entra ID  —needed in order to define *role groups* for Azure Function's), (not yet configured, see: [Securing Azure Functions.md](../azure%20functions/securing%20azure%20functions.md)  
2. optional _CSLA Dev Project_ teams group:  add in **Active teams and groups** [https://admin.cloud.microsoft/?trysignin=0#/groups](https://admin.cloud.microsoft/?trysignin=0#/groups)  
3. Create New Communication Site: PD Intranet
   1. **Site Settings:** /sites/PD-Intranet/_layouts/15/settings.aspx  
      1. ...  
   2. **optional:**  make it a hub (if you want extra top bar of nav links / site collection associations), **note:** after installing solution, _ThemeInjector_  hides it)

- update config/
    - .env.public.prod
    - .env.prod
    - package-solution.json
        - webApiPermissionRequests from app registration: Application (client) ID + scope name
    - scripts/py/azure_function
        - set AZURE_FUNCTIONS_ENVIRONMENT to any value to ensure they use production
    - scripts/js (gen-env)
        - ensure that process.env.NODE_ENV === "production"

  
# Entra ID -> Groups -> Security Groups  

| displayName | id | groupType | membershipType | mail | source | mailEnabled | onPremisesSyncEnabled |
| ----------------- | ------------------------------------ | --------- | -------------- | ---- | ------ | ----------- | --------------------- |
| Attorney | f9e66388-efe6-4b94-811c-a0890a51ea73 | Security | assigned |  | Cloud | False |  |
| CDD | f16e8da5-04df-4d3e-93f2-400752a4ab14 | Security | assigned |  | Cloud | False |  |
| ComplianceOfficer | f7262977-8900-4b64-99e1-378db87fcf35 | Security | assigned |  | Cloud | False |  |
| HR | 26a2d26f-8019-4285-b682-90e491d77049 | Security | assigned |  | Cloud | False |  |
| IT | bb27ef32-d7fe-4ed5-81b8-b6237098d6aa | Security | assigned |  | Cloud | False |  |
| LOP | cc440ce9-6b0d-4ee0-bc18-1e8f65d498f9 | Security | assigned |  | Cloud | False |  |
| PDIntranet | 1a4bac58-bfe9-4ca5-9ed5-50b5d77c572c | Security | assigned |  | Cloud | False |  |
| TrialSupervisor | 8d69c597-971c-4c64-b7cb-a8078ab78d9f | Security | assigned |  | Cloud | False |  |
  
Security Groups csv export. Recreate these with (onPremisesSyncEnabled) or update *.public.env.dev* ROLE_ keys with equivalent on-prem group  (displayName)  
  
# invited users: Entra ID change guest to Microsoft Fabric (free) then optionally: after they access site once, change back to guest  
  
PortalCalendar uses 1 SharePoint calendar (and it reads from outlook calendar as well)  
****to add an entire SharePoint calendar to outlook: Site Contents ->  Events -> Calendar (top ribbon bar)****  
![Connect to Office or Connect to](Attachments/A1BEA429-2E40-4A57-85BF-1C1179BB9DE6.tiff)  
troubleshoot  
... you may want additional calendars so the user can choose which to subscribe to.  e.g.: 1 per department, + an Assignments calendar, etc.
