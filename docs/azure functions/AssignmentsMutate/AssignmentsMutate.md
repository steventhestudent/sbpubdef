- add missing environment variables to azure function
  - FUNCTION_API_APP_ID, HUB_NAME, ...

via import ```py scripts/py/azure_function_env_export_as_json.py >> azure_function_app.env.json```
# WARNING: DONT REPLACE BLINDLY. YOU COULD LOSE AZURE AUTO-GENERATED ENVIRONMENT VARIABLES
