import os
import sys

# Azure Functions loads each function folder as a script root; ensure sibling `sbpubdef` is importable.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from sbpubdef.portal_assignments_mutate import main  # noqa: E402
