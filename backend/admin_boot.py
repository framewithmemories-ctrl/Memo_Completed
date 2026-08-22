"""Memories backend entrypoint with secure admin recovery and catalogue tools."""
import os
import secrets
from datetime import datetime, timezone
from fastapi import Form, HTTPException
from fastapi.responses import HTMLResponse
from server import app, db, hash_password

# Register production Google Reviews endpoint after server.py so the legacy
# placeholder route is removed and replaced by the real Places API handler.
import google_reviews_override  # noqa: F401,E402

# Register admin-only catalogue audit/media routes on the same FastAPI app.
import catalogue_audit  # noqa: F401,E402
import important_events  # noqa: F401,E402


def _current_recovery_secret() -> str:
    return os.environ.get("ADMIN_RECOVERY_SECRET", "").strip()


def _check_recovery_secret(value: str) -> bool:
    expected = _current_recovery_secret()
    return bool(expected) and secrets.compare_digest((value or "").strip(), expected)


@app.get("/admin/recover", response_class=HTMLResponse)
async def admin_recovery_page():
    return HTMLResponse("""<!doctype html><html><head><meta charset='utf-8'><title>Memories Admin Recovery</title><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{font-family:Arial,sans-serif;background:#f7f3ef;margin:0;padding:32px;color:#292522}.card{max-width:520px;margin:40px auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 8px 30px #0001}h1{margin-top:0}label{display:block;margin:16px 0 6px;font-weight:600}.field{position:relative}.field input{width:100%;box-sizing:border-box;padding:12px 48px 12px 12px;border:1px solid #ccc;border-radius:8px}.toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;width:34px;height:34px;padding:0;cursor:pointer;color:#555;font-size:18px}.toggle:focus{outline:2px solid #d95f8a;border-radius:6px}button[type=submit]{margin-top:20px;width:100%;padding:13px;border:0;border-radius:8px;background:#d95f8a;color:#fff;font-weight:700;cursor:pointer}.note{font-size:13px;color:#666}</style></head><body><div class='card'><h1>Memories Admin Recovery</h1><p class='note'>Use the recovery secret configured in Render to set a new admin password.</p><form method='post' action='/api/admin/recover'><label>Admin username</label><div class='field'><input name='username' value='admin' autocomplete='username' required></div><label>Recovery secret</label><div class='field'><input id='recovery_secret' name='recovery_secret' type='password' autocomplete='off' required><button class='toggle' type='button' data-target='recovery_secret' aria-label='Show recovery secret'>🎁</button></div><label>New password</label><div class='field'><input id='new_password' name='new_password' type='password' autocomplete='new-password' minlength='12' required><button class='toggle' type='button' data-target='new_password' aria-label='Show new password'>🎁</button></div><label>Confirm new password</label><div class='field'><input id='confirm_password' name='confirm_password' type='password' autocomplete='new-password' minlength='12' required><button class='toggle' type='button' data-target='confirm_password' aria-label='Show confirmed password'>🎁</button></div><button type='submit'>Reset Admin Password</button></form></div><script>document.querySelectorAll('.toggle').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById(b.dataset.target);const show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'📦':'🎁';b.setAttribute('aria-label',show?'Hide value':'Show value')}));</script></body></html>""")


@app.post("/api/admin/recover", response_class=HTMLResponse)
async def admin_recover_form(
    username: str = Form(""),
    recovery_secret: str = Form(""),
    new_password: str = Form(""),
    confirm_password: str = Form(""),
):
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
        raise HTTPException(status_code=404, detail="Admin account not found")
    await db.admins.update_one({"_id": admin["_id"]},{"$set":{"password_hash":hash_password(new_password),"updated_at":datetime.now(timezone.utc).isoformat()}})
    return HTMLResponse("""<!doctype html><html><head><meta charset='utf-8'><title>Recovery Complete</title></head><body style='font-family:Arial,sans-serif;background:#f7f3ef;padding:40px'><div style='max-width:520px;margin:auto;background:#fff;padding:28px;border-radius:16px'><h1>Admin password updated</h1><p>Your password has been changed successfully.</p><p>Return to the Memories Admin login and sign in with your new password.</p></div></body></html>""")
