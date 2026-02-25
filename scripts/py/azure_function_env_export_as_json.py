"""
scripts/py/azure_function_env_export_as_json.py    .env.public.dev + .env.dev -> {key: val}[]
for easy import via:  py azure_function_env_export_as_json.py >> azure_function_app.env.json
"""

import json
from pathlib import Path

# config
ENV = 'dev' # dev/prod

def azure_function_env_export_as_json(env_file):
    with open(env_file, 'r') as file:
        lines = file.readlines()

    env_list = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            # Remove surrounding quotes and comments
            value = value.split('#', 1)[0].strip().strip('"').strip("'")
            env_list.append({"name": key, "value": value})

    return env_list

json_dicts = [azure_function_env_export_as_json(Path(__file__).resolve().parents[2] / f"config/{env}") for env in [f".env.public.{ENV}", f".env.{ENV}"]]
json_dicts_concat = [*json_dicts[0], *json_dicts[1]]

print("||WARNING:|| DONT REPLACE BLINDLY. YOU COULD LOSE AZURE AUTO-GENERATED ENVIRONMENT VARIABLES")
print(json.dumps(json_dicts_concat, indent=2))
print("||WARNING:|| DONT REPLACE BLINDLY. YOU COULD LOSE AZURE AUTO-GENERATED ENVIRONMENT VARIABLES")
