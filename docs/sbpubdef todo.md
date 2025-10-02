# sbpubdef todo  
- they currently use */sites/PD-Internal/SitePages/<role>.aspx*  
    - [ ] create /sites/<role>  
- **SPFx extension:**  
    - *ApplicationCustomizer*:  
        - [x] landing-redirect-ext  
        - [ ] HR-landing-redirect-ext (can ***landing-redirect-ext*** be modified???)  
- **SPFx forms**  
    - there's a LOT of forms we can turn into SPFx webparts:  
        - [ ] **webpart should be ok?**  
        - [ ] they will be made available on [GitHub](http://github.com/steventhestudent/sbpubdef) @ *resource* folder (i.e.: Attorney forms in *resource/Attorney/forms*)  
    - convert forms (todo):  
            - [ ] Attorney:   
            - [ ] LOP:   
            - [ ] Investigator:   
            - [ ] CDD:   
            - [ ] Fiscal-Division:   
            - [ ] HR:   
- **other: **calendar, chatbot  
  
  
  
# landing-redirect-ext todo  
- [x] create groups on Entra (on my .[sharepoint.com](http://sharepoint.com))  
    - [x] attorney  
    - [x] hr  
- [x] copy group id's (from entra id (no access??? can (at least) grab logged in user groups in spfx w/ graph api))    —into landing-redirect-ext manifest.json ***redirectRules*** property  
- [x] graph api:  redirectTarget now points to  /sites/x based on groups (w/ my .[sharepoint.com](http://sharepoint.com))  
        * **currently it just logs: ** redirectRules, logged in user groups, redirectionTarget (and it works)  
- [ ] figure out deploying on my .[sharepoint.com](http://sharepoint.com)  
    - [ ] ...  
- [ ] verify that it works on [countyofsb.sharepoint.com](http://countyofsb.sharepoint.com): (**++can't++** until they create security groups & share the object id's from Entra)  
    - [ ] deploy: upload app/solution, bundle to AppCatalog/ClientSideAssets, etc.  
  
hint: see *docs/laptop notes.md *for group ids/names  
