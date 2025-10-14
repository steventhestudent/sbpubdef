# power automate flow — **Add Embed Page (List item) -> New Page-Embed.aspx**  
  
## Before we make a hundred forms in SPFx,  —use a SharePoint List + ***++Power Automate++*: when an item is created (list)-> make page.**  
## make it easy to dump a pdf file into Document Library: Documents/Intranet Form Database + keep track of all embed/form pages  
**list 'Embed Pages'**  

| column label | notes  |
| ------------ | ------ |
| site_slug    |        |
| page_slug    | unique |
| embed_url    |        |
| title        |        |
  
**so:** ['Attorney', 'Attorney-Tutorial', '[https://youtube.com/embed/xxxxxx', 'Attorney-Tutorial](https://youtube.com/embed/xxxxxx',%20'Attorney-Tutorial)']  
would create this endpoint:  
[https://xyz.sharepoint.com/sites/Attorney/SitePages/Attorney-Tutorial.aspx](https://xyz.sharepoint.com/sites/Attorney/SitePages/Attorney-Tutorial.aspx)  
w/ embed webpart containing yt video + sets the title  
## Alternative Method ($$$)  
### **[Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) requires Admin consent (via premium http request action)... (also... not an admin)**  
![Need admin approval](Attachments/Pasted%20Graphic%202.tiff)  
- **$15/m to get 'premium' http action (required for graph api requests (sharepoint & other direct http requests are free...))**  
- **[http sharepoint (free)](https://sharepointcass.com/2021/04/01/sharepoint-online-rest-apis-part-iii-pages/)**  
  
# **Create a new page from a template**  
  
create template in PD-Intranet (SitePages/Templates): *Page-Embed.aspx*  
- *Add embed webpart: <iframe src="https://www.youtube.com" width="100" height="100"></iframe>*  
  
### Copy Page Cross-Site via Copy File (SharePoint action)  
  
### Send an HTTP request to SharePoint:  
  
**Site Address: **[https://csproject25.sharepoint.com/sites/<site_slug>](https://csproject25.sharepoint.com/sites/%3Csite_slug%3E)  
  
**POST URI:**  
_api/web/GetFileByServerRelativePath(decodedurl='/sites/PD-Intranet/SitePages/Templates/Page-Embed.aspx')/copyTo(strNewUrl='/sites/@{outputs('Create_item')?['body/site_slug']}/SitePages/@{outputs('Create_item')?['body/page_slug']}.aspx',boverwrite=true)  
  
then Fix Title + Patch CanvasContent1 + Publish Page (...see in power automate for full flow)  
  
**~~note: ~~**~~embed only works on sites that edited Site Contents -> Site Settings -> **HTML Field Security**~~**  <--  (optional) edit allowed hosts (i.e.: localhost, YouTube, etc. already included)**  
  
**caveats: **subfolder paths in page_slug (...not possible?) ...and page_slug needs to be urlencoded already (**todo: fix flow to urlencode title if bad (or no) page_slug was given).**  
