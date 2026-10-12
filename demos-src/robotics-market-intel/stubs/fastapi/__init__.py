"""Minimal FastAPI stand-in so route functions can be called directly (PyPI is unreachable here)."""
from starlette import status  # noqa: F401
from starlette.requests import Request  # noqa: F401

class HTTPException(Exception):
    def __init__(self, status_code, detail=None):
        super().__init__(detail); self.status_code = status_code; self.detail = detail

def Query(default=None, **_):
    return default

class APIRouter:
    def __init__(self, prefix="", **_):
        self.prefix = prefix; self.routes = []
    def _add(self, method):
        def deco_factory(path, **_):
            def deco(fn):
                self.routes.append((method, self.prefix + path, fn)); return fn
            return deco
        return deco_factory
    def __getattr__(self, name):
        if name in ("get", "post", "put", "patch", "delete"):
            return self._add(name.upper())
        raise AttributeError(name)
class FastAPI:
    def __init__(self, **_): pass
