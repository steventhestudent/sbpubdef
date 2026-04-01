1. Add `ROLE_` entry to `.env.public.dev`. ROLE_="Entra group name"

2. if it's a department:
   - include it in the`ROLESELECT_ORDER` used by `<PDRoleBasedSelect>`
   - this should mirror:
   - [ Site Settings : Site Columns : Edit Column (PDDepartment) ](https://csproject25.sharepoint.com/sites/PD-Intranet/_layouts/15/fldedit.aspx?field=PD%5Fx0020%5FDepartment&Source=%2Fsites%2FPD%2DIntranet%2F%5Flayouts%2F15%2Fmngfield%2Easpx%3FFilter%3DAll%2520Groups)
     - newline with the ENV key for the role: COMPLIANCEOFFICER