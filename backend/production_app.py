"""Production FastAPI entrypoint.

The original Procfile started server:app directly, which meant auxiliary route
modules (including Important Dates and admin recovery) were never imported.
Keep server.py as the core app and explicitly load production route modules here.
"""

from fastapi.middleware.cors import CORSMiddleware

from server import app

# Register auxiliary routes on the same FastAPI app used in production.
import admin_boot  # noqa: F401,E402
import catalogue_audit  # noqa: F401,E402
import important_events  # noqa: F401,E402
import google_reviews_override  # noqa: F401,E402

# Be resilient to Vercel preview/production domains when CORS_ORIGINS has not
# been updated after a frontend deployment. Bearer-token auth does not require
# credentialed cookies, so this does not weaken cookie-based authentication.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://([a-zA-Z0-9-]+\.)*vercel\.app$",
    allow_origins=[origin.strip() for origin in __import__("os").environ.get("CORS_ORIGINS", "*").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"] ,
)
