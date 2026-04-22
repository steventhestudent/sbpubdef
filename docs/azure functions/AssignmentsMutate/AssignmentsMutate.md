- add missing environment variables to azure function
  - FUNCTION_API_APP_ID, HUB_NAME, ...

via import ```py scripts/py/patch_azure_function_environment.py azure_function_app.env.json```
# WARNING: DONT REPLACE BLINDLY. YOU COULD LOSE AZURE AUTO-GENERATED ENVIRONMENT VARIABLES
