"""Memories backend entrypoint with a secure admin recovery endpoint."""
import os
import secrets
from datetime import datetime, timezone
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from server import app, db, hash_password

_RECOVERY_SECRET = os.environ.get("ADMIN_RECOVERY_SECRET", "").strip()

def _check_recovery_secret(value: str) -> bool:
    return bool(_RECOVERY_SECRET) and secrets.compare_digest((value or "").strip(), _RECOVERY_SECRET)

@app.get("/admin/recover", response_class=HTMLResponse)
async def admin_recovery_page():
    return HTMLResponse("""<!doctype html><html><head><meta charset='utf-8'><title>Memories Admin Recovery</title><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{font-family:Arial,sans-serif;background:#f7f3ef;margin:0;padding:32px;color:#292522}.card{max-width:520px;margin:40px auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 8px 30px #0001}h1{margin-top:0}label{display:block;margin:16px 0 6px;font-weight:600}.pw{position:relative}.pw input{padding-right:52px}.pw button{position:absolute;right:8px;top:50%;transform:translateY(-50%);margin:0;width:36px;height:36px;padding:0;border:0;background:transparent;color:#555;font-size:18px;cursor:pointer}.pw button:focus{outline:2px solid #d95f8a;border-radius:6px}.pw input,.text{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccc;border-radius:8px}button.submit{margin-top:20px;width:100%;padding:13px;border:0;border-radius:8px;background:#d95f8a;color:#fff;font-weight:700;cursor:pointer}.note{font-size:13px;color:#666}</style></head><body><div class='card'><h1>Memories Admin Recovery</h1><p class='note'>Use the recovery secret configured in Render to set a new admin password. Use the eye buttons to verify what you typed before submitting.</p><form method='post' action='/api/admin/recover'><label>Admin username</label><input class='text' name='username' value='admin' autocomplete='username' required><label>Recovery secret</label><div class='pw'><input name='recovery_secret' type='password' autocomplete='off' required><button type='button' onclick='toggle(this)' aria-label='Show recovery secret' title='Show recovery secret'>◉</button></div><label>New password</label><div class='pw'><input name='new_password' type='password' autocomplete='new-password' minlength='12' required><button type='button' onclick='toggle(this)' aria-label='Show password' title='Show password'>◉</button></div><label>Confirm new password</label><div class='pw'><input name='confirm_password' type='password' autocomplete='new-password' minlength='12' required><button type='button' onclick='toggle(this)' aria-label='Show password confirmation' title='Show password confirmation'>◉</button></div><button class='submit' type='submit'>Reset Admin Password</button></form></div><script>function toggle(btn){const input=btn.parentElement.querySelector('input');const showing=input.type==='text';input.type=showing?'password':'text';btn.textContent=showing?'◉':'●';btn.setAttribute('aria-label',showing?'Show password':'Hide password');btn.setAttribute('title',showing?'Show password':'Hide password');}</script></body></html>""")

@app.post("/api/admin/recover", response_class=HTMLResponse)
async def admin_recover_form(username: str = "", recovery_secret: str = "", new_password: str = "", confirm_password: str = ""):
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
