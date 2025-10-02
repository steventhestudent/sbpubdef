# sbpubdef todo  
- they currently use */sites/PD-Internal/SitePages/<role>.aspx*  
    - [ ] create /sites/<role>  
- **SPFx extension:**  
    - *ApplicationCustomizer*:  
        - [x] landing-redirect-ext  
        - [ ] HR-landing-redirect-ext (can ***landing-redirect-ext*** be modified???)  
- **SPFx forms**  
    - there's a LOT of forms we can turn into SPFx webparts:  
        - [ ] **see if webpart is ok?**  
        - [x] pages were scraped (available on [GitHub](http://github.com/steventhestudent/sbpubdef), see: ***resource/Attorney/Forms***, or ***resource/PD-Internal***, etc.))  
    - convert forms (todo):  
        * Attorney:   
            - [ ] Court Contacts  
            - [ ] Credo-47  
            - [ ] Forms  
            - [ ] Interpreter Forms  
            - [ ] Memos  
            - [ ] Procedures  
            - [ ] Resources  
            - [ ] SB1810  
            - [ ] Specialty Court Forms  
        * Community-Defender-Division:   
            - [ ] Documents and Forms  
            - [ ] Resource Guides  
            - [ ] Service partner ROI's  
        * Fiscal-Division:   
            - [ ] Employee Reinbursement Form  
            - [ ] Travel Reimbursement Form  
            - [ ] Vendor Forms  
        * Investigators:   
            - [ ] Additional Forms  
            - [ ] Policies and Procedures  
        * LOP:   
            - [ ] 827 Petitions to Access Juvenile Case Files  
            - [ ] Box Links  
            - [ ] Case Opening  
            - [ ] Case Updates  
            - [ ] Chart  
            - [ ] Civil Cases  
            - [ ] Contacts  
            - [ ] Court Procedures  
            - [ ] Discovery  
            - [ ] Diversion  
            - [ ] Documents  
            - [ ] e-Defender  
            - [ ] Forms  
            - [ ] Immigration  
            - [ ] In Court Assistance  
            - [ ] Incoming Mail  
            - [ ] InterpreterTranslation Requests  
            - [ ] Interpreting Resources  
            - [ ] Mental Health Diversion  
            - [ ] Miscellaneous Consult Cases  
            - [ ] OneNote for Court Events  
            - [ ] Policies  
            - [ ] Post-Conviction  
            - [ ] Rapid Diversion  
            - [ ] READY Cases  
            - [ ] Reception  
            - [ ] Records Requests  
            - [ ] Tasks  
            - [ ] Transcription Requests  
        * Misc.-Forms-and-Guides:   
            - [ ] County Guides  
            - [ ] Court Forms  
            - [ ] Memos  
            - [ ] Office Forms  
            - [ ] Other Dept  
        - [ ] PD-Internal  
- **other: **calendar, chatbot  
  
  
  
# landing-redirect-ext todo  
- [x] create groups on Entra (on my .[sharepoint.com](http://sharepoint.com))  
    - [x] attorney  
    - [x] hr  
- [x] copy group id's (from entra id (no access??? can (at least) grab logged in user groups in spfx w/ graph api))    —into landing-redirect-ext manifest.json ***redirectRules*** property  
- [x] graph api:  redirectTarget now points to  /sites/x based on groups (w/ my .[sharepoint.com](http://sharepoint.com))  
        * **currently it just logs: ** redirectRules, logged in user groups, redirectionTarget (and it works)  
- [ ] figure out deploying on my .[sharepoint.com](http://sharepoint.com)  
    - [ ] Ask for Graph permissions (once, at deploy time)  
    - [ ] ![In config/package-solution.json, request Microsoft Graph group read:](Attachments/Pasted%20Graphic.tiff)  
    - [ ] If you only want it on /sites/pd-internal, deploy tenant-wide but **only associate** the extension to that site (via a tenant-wide list entry or feature association), or keep skipFeatureDeployment: false and activate the feature only on that site.  
- [ ] verify that it works on [countyofsb.sharepoint.com](http://countyofsb.sharepoint.com): (**++can't++** until they create security groups & share the object id's from Entra)  
    - [ ] deploy: upload app/solution, bundle to AppCatalog/ClientSideAssets, etc.  
  
hint: see *docs/laptop notes.md *for group ids/names  
