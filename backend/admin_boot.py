"""Memories backend entrypoint with a secure admin recovery endpoint.

This wrapper imports the existing FastAPI app without rewriting server.py, then adds
an admin-only recovery flow protected by ADMIN_RECOVERY_SECRET. The secret and new
password are never stored in GitHub.
"""
import os
import secrets
from fastapi import HTTPException
from fastapi.responses import HTMLResponse

from server import app, db, hash_password


_RECOVERY_SECRET = os.environ.get("ADMIN_RECOVERY_SECRET", "").strip()


def _check_recovery_secret(value: str) -> bool:
    return bool(_RECOVERY_SECRET) and secrets.compare_digest(value or "", _RECOVERY_SECRET)


@app.get("/admin/recover", response_class=HTMLResponse)
async def admin_recovery_page():
    """Small browser-based recovery page; no secret is embedded in HTML."""
    return HTMLResponse("""<!doctype html>
<html><head><meta charset='utf-8'><title>Memories Admin Recovery</title>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<style>body{font-family:Arial,sans-serif;background:#f7f3ef;margin:0;padding:32px;color:#292522}.card{max-width:520px;margin:40px auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 8px 30px #0001}h1{margin-top:0}label{display:block;margin:16px 0 6px;font-weight:600}input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccc;border-radius:8px}button{margin-top:20px;width:100%;padding:13px;border:0;border-radius:8px;background:#d95f8a;color:#fff;font-weight:700;cursor:pointer}.note{font-size:13px;color:#666}.ok{color:#087f5b}.err{color:#b42318}</style></head>
<body><div class='card'><h1>Memories Admin Recovery</h1>
<p class='note'>Use the recovery secret configured in Render to set a new admin password. The secret is never stored by this page.</p>
<form method='post' action='/api/admin/recover'>
<label>Admin username</label><input name='username' value='admin' autocomplete='username' required>
<label>Recovery secret</label><input name='recovery_secret' type='password' autocomplete='off' required>
<label>New password</label><input name='new_password' type='password' autocomplete='new-password' minlength='12' required>
<label>Confirm new password</label><input name='confirm_password' type='password' autocomplete='new-password' minlength='12' required>
<button type='submit'>Reset Admin Password</button></form></div></body></html>""")


@app.post("/api/admin/recover", response_class=HTMLResponse)
async def admin_recover_form(username: str = "", recovery_secret: str = "", new_password: str = "", confirm_password: str = ""):
    """Reset an admin password using the server-side recovery secret.

    The recovery secret must be supplied by the operator; it is compared in constant
    time and is never logged or returned. Password is stored only as a bcrypt hash.
    """
    if not _check_recovery_secret(recovery_secret):
        raise HTTPException(status_code=403, detail="Recovery verification failed")
    username = (username or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(new_password) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")
    if len(new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")

    admin = await db.admins.find_one({"username": username})
    if not admin:
        # Do not create an arbitrary admin through recovery.
        raise HTTPException(status_code=404, detail="Admin account not found")

    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {
            "password_hash": hash_password(new_password),
            "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        }},
    )

    return HTMLResponse("""<!doctype html><html><head><meta charset='utf-8'><title>Recovery Complete</title></head>
<body style='font-family:Arial,sans-serif;background:#f7f3ef;padding:40px'><div style='max-width:520px;margin:auto;background:#fff;padding:28px;border-radius:16px'><h1>Admin password updated</h1><p class='ok'>Your password has been changed successfully.</p><p>Return to the Memories Admin login and sign in with your new password.</p><p><a href='/admin/recover'>Back to recovery</a></p></div></body></html>""")
