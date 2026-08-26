from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import re
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import bcrypt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import secrets
import string
import hashlib
import hmac
import math
from gemini_helper import gemini_generate, gemini_available
import base64
import io
from PIL import Image


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="Memories API",
    description="Backend API for Memories - Photo Frames & Customized Gift Shop",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


@app.get("/")
async def app_root():
    return {
        "status": "running",
        "message": "Memories API",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============================ Auth helpers (defined early so routes can use them) ============================
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
security = HTTPBearer(auto_error=False)

# ============================ Payment (Razorpay) config ============================
PAYMENT_MODE = os.environ.get("PAYMENT_MODE", "mock")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "mock")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "mock")


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(sub: str, role: str, extra: dict = None) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    if extra:
        payload.update(extra)
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("role") != "user":
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("_id", None)
    return user


async def require_admin(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    payload = decode_token(creds.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


async def record_ai_usage(feature: str, status: str):
    """Lightweight, non-blocking AI usage tracking. status: 'live' | 'cache_hit' | 'error'."""
    try:
        now = datetime.now(timezone.utc)
        await db.ai_usage_log.insert_one({
            "feature": feature,
            "status": status,
            "date": now.strftime("%Y-%m-%d"),
            "created_at": now.isoformat(),
        })
    except Exception:
        pass  # never let analytics break a user-facing flow


async def verify_user_access(user_id: str, creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Ensure the caller is the owner of user_id (used to protect wallet/photo routes)."""
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("role") != "user" or payload.get("sub") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this account")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("_id", None)
    return user


# Models
class Admin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: str = "admin"  # admin, super_admin
    permissions: List[str] = []  # products, reviews, users, orders, analytics
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: float
    pending_reviews: int
    total_products: int
    recent_orders: List[dict]
    top_products: List[dict]

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    photos: Optional[List[str]] = []
    product_id: Optional[str] = None
    approved: bool = False
    pinned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    photos: Optional[List[str]] = []
    product_id: Optional[str] = None

class ProductVariant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str                      # e.g. "8x10 / Wood"
    price_delta: float = 0.0       # added to base_price
    sku: Optional[str] = None
    in_stock: bool = True


class ProductCustomization(BaseModel):
    enabled: bool = False
    photo_upload: bool = False
    min_photos: int = 0
    max_photos: int = 1
    name: bool = False
    date: bool = False
    message: bool = False
    quote: bool = False
    logo_upload: bool = False
    preview: bool = False


class ProductMedia(BaseModel):
    primary_image: Optional[str] = None
    gallery: List[str] = []
    video_url: Optional[str] = None


class ProductFulfilment(BaseModel):
    production_days: int = 3
    pickup_available: bool = True
    delivery_available: bool = True


class ProductMarketing(BaseModel):
    featured: bool = False
    bestseller: bool = False
    new_arrival: bool = False
    trending: bool = False


class ProductSEO(BaseModel):
    title: Optional[str] = None
    meta_description: Optional[str] = None


class ProductStatus(BaseModel):
    active: bool = True
    published: bool = True


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # identity
    name: str
    description: str
    sku: Optional[str] = None
    slug: Optional[str] = None
    short_description: Optional[str] = ""
    # classification
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    occasions: List[str] = []
    recipients: List[str] = []
    # pricing
    base_price: float
    compare_at_price: Optional[float] = None
    variants: List[ProductVariant] = []
    # legacy option arrays (kept for backward compatibility)
    sizes: List[dict] = []
    materials: List[dict] = []
    colors: List[dict] = []
    image_url: str
    # grouped V2 fields (all defaulted -> old docs load fine)
    customization: ProductCustomization = Field(default_factory=ProductCustomization)
    media: ProductMedia = Field(default_factory=ProductMedia)
    fulfilment: ProductFulfilment = Field(default_factory=ProductFulfilment)
    marketing: ProductMarketing = Field(default_factory=ProductMarketing)
    seo: ProductSEO = Field(default_factory=ProductSEO)
    status: ProductStatus = Field(default_factory=ProductStatus)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    base_price: float
    image_url: str
    # optional V2 fields (all backward-compatible)
    sku: Optional[str] = None
    slug: Optional[str] = None
    short_description: Optional[str] = ""
    subcategory: Optional[str] = None
    tags: List[str] = []
    occasions: List[str] = []
    recipients: List[str] = []
    compare_at_price: Optional[float] = None
    variants: List[ProductVariant] = []
    sizes: List[dict] = []
    materials: List[dict] = []
    colors: List[dict] = []
    customization: Optional[ProductCustomization] = None
    media: Optional[ProductMedia] = None
    fulfilment: Optional[ProductFulfilment] = None
    marketing: Optional[ProductMarketing] = None
    seo: Optional[ProductSEO] = None
    status: Optional[ProductStatus] = None

class CustomDesign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    image_data: str
    customizations: dict
    preview_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomDesignCreate(BaseModel):
    user_id: str
    product_id: str
    image_data: str
    customizations: dict

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    preferences: Optional[str] = None
    points: int = 0
    tier: str = "Silver"
    wallet_balance: float = 0.0
    store_credits: float = 0.0
    total_spent: float = 0.0
    role: str = "user"
    must_change_password: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    preferences: Optional[str] = None

class SavedPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    image_data: str
    image_url: Optional[str] = None
    dimensions: dict
    size: float  # in MB
    tags: List[str] = []
    notes: Optional[str] = None
    favorite: bool = False
    usage_count: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SavedPhotoCreate(BaseModel):
    user_id: str
    name: str
    image_data: str
    image_url: Optional[str] = None
    dimensions: dict
    size: float
    tags: List[str] = []
    notes: Optional[str] = None

class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # 'credit', 'debit', 'conversion'
    amount: float
    description: str
    category: str  # 'topup', 'purchase', 'rewards', 'conversion'
    order_id: Optional[str] = None
    status: str = "completed"
    balance_after: float
    is_points: bool = False
    credit_earned: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WalletTransactionCreate(BaseModel):
    user_id: str
    type: str
    amount: float
    description: str
    category: str
    order_id: Optional[str] = None
    balance_after: float
    is_points: bool = False
    credit_earned: Optional[float] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[dict]
    total_amount: float
    status: str = "pending"
    # V2 status architecture (backward-compatible defaults for old orders)
    payment_status: str = "pending"      # pending | paid | failed | refunded
    order_status: str = "pending"        # pending | confirmed | processing | completed | cancelled | refunded
    production_status: str = "not_started"  # not_started | design_pending | production | ready
    shipping_status: str = "not_required"   # not_required | pending | shipped | delivered
    delivery_type: str  # "pickup" or "delivery"
    delivery_address: Optional[dict] = None
    pickup_slot: Optional[str] = None
    points_earned: int = 0
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    store_credit_applied: float = 0.0
    payment_attempts: int = 0
    payment_updated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    user_id: str
    items: List[dict]
    total_amount: float
    delivery_type: str
    delivery_address: Optional[dict] = None
    pickup_slot: Optional[str] = None

class GiftQuizResponse(BaseModel):
    recipient: str
    occasion: str
    age_group: str
    interests: List[str] = []
    budget: str
    relationship: str

class EnhancedGiftRequest(BaseModel):
    answers: Optional[dict] = None
    contextual: Optional[bool] = False
    aiEnhanced: Optional[bool] = False
    previewPhoto: Optional[dict] = None
    # Support legacy format
    recipient: Optional[str] = None
    occasion: Optional[str] = None
    age_group: Optional[str] = None
    interests: Optional[List[str]] = []
    budget: Optional[str] = None
    relationship: Optional[str] = None

# Initialize sample products for Memories
sample_products = [
    {
        "name": "Premium Wooden Photo Frame",
        "description": "Handcrafted wooden frame perfect for your precious memories",
        "category": "frames",
        "base_price": 899.0,
        "sizes": [
            {"name": "8x10", "price_add": 0},
            {"name": "12x16", "price_add": 300},
            {"name": "16x20", "price_add": 600},
            {"name": "20x24", "price_add": 1000}
        ],
        "materials": [
            {"name": "Teak Wood", "price_add": 0},
            {"name": "Mahogany", "price_add": 200},
            {"name": "Oak Wood", "price_add": 150}
        ],
        "colors": [
            {"name": "Natural Wood", "price_add": 0},
            {"name": "Dark Brown", "price_add": 50},
            {"name": "Black Finish", "price_add": 75}
        ],
        "image_url": "https://images.unsplash.com/photo-1465161191540-aac346fcbaff"
    },
    {
        "name": "Crystal Clear Acrylic Frame",
        "description": "Modern acrylic frame with crystal-clear transparency",
        "category": "acrylic",
        "base_price": 1299.0,
        "sizes": [
            {"name": "8x10", "price_add": 0},
            {"name": "12x16", "price_add": 400},
            {"name": "16x20", "price_add": 700},
            {"name": "20x24", "price_add": 1100}
        ],
        "materials": [
            {"name": "Premium Acrylic", "price_add": 0},
            {"name": "UV Protected", "price_add": 300}
        ],
        "colors": [
            {"name": "Crystal Clear", "price_add": 0},
            {"name": "Frosted", "price_add": 150}
        ],
        "image_url": "https://images.unsplash.com/photo-1505841468529-d99f8d82ef8f"
    },
    {
        "name": "Personalized Photo Mug",
        "description": "Custom ceramic mug with sublimation printing - perfect gift",
        "category": "mugs",
        "base_price": 299.0,
        "sizes": [
            {"name": "11oz Standard", "price_add": 0},
            {"name": "15oz Large", "price_add": 100},
            {"name": "Magic Color Changing", "price_add": 200}
        ],
        "materials": [
            {"name": "Ceramic", "price_add": 0},
            {"name": "Premium Ceramic", "price_add": 100}
        ],
        "colors": [
            {"name": "White", "price_add": 0},
            {"name": "Black", "price_add": 50},
            {"name": "Colored Handle", "price_add": 75}
        ],
        "image_url": "https://images.unsplash.com/photo-1628313388777-9b9a751dfc6a"
    },
    {
        "name": "Custom T-Shirt Printing",
        "description": "High-quality sublimation printed t-shirts with your design",
        "category": "t-shirts",
        "base_price": 399.0,
        "sizes": [
            {"name": "S", "price_add": 0},
            {"name": "M", "price_add": 0},
            {"name": "L", "price_add": 50},
            {"name": "XL", "price_add": 100},
            {"name": "XXL", "price_add": 150}
        ],
        "materials": [
            {"name": "100% Cotton", "price_add": 0},
            {"name": "Cotton Blend", "price_add": 50},
            {"name": "Premium Cotton", "price_add": 150}
        ],
        "colors": [
            {"name": "White", "price_add": 0},
            {"name": "Black", "price_add": 25},
            {"name": "Colored", "price_add": 50}
        ],
        "image_url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27"
    },
    {
        "name": "Corporate Gift Package",
        "description": "Professional corporate gifts with custom branding solutions",
        "category": "corporate",
        "base_price": 999.0,
        "sizes": [
            {"name": "Basic Package", "price_add": 0},
            {"name": "Standard Package", "price_add": 500},
            {"name": "Premium Package", "price_add": 1000}
        ],
        "materials": [
            {"name": "Standard Quality", "price_add": 0},
            {"name": "Premium Quality", "price_add": 300}
        ],
        "colors": [
            {"name": "Corporate Theme", "price_add": 0},
            {"name": "Custom Branding", "price_add": 200}
        ],
        "image_url": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a"
    }
]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Memories - Photo Frames & Customized Gift Shop API Ready! 📸🎁"}

@api_router.get("/version")
async def version_info():
    """TEMPORARY deploy-verification endpoint. Remove after verification."""
    commit = (
        os.environ.get("RENDER_GIT_COMMIT")
        or os.environ.get("GIT_COMMIT")
        or ""
    )
    if not commit:
        try:
            import subprocess
            commit = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=str(ROOT_DIR), stderr=subprocess.DEVNULL
            ).decode().strip()
        except Exception:
            commit = "unknown"
    return {
        "git_commit": commit,
        "app_version": app.version,
        "docs_url": app.docs_url,
        "openapi_url": app.openapi_url,
        "registered_routes": len(app.routes),
    }

def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return slug or uuid.uuid4().hex[:8]


def _normalize_product(doc: dict) -> Product:
    """Fill V2 defaults for legacy product docs so old products keep working.
    Backfills slug and media.primary_image from legacy fields without requiring a migration."""
    if not doc.get("slug"):
        doc["slug"] = _slugify(doc.get("name", ""))
    media = doc.get("media") or {}
    if not media.get("primary_image"):
        media["primary_image"] = doc.get("image_url")
    doc["media"] = media
    return Product(**doc)


@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {}
    if category and category != 'All':
        query["category"] = category.lower()
    
    products = await db.products.find(query).to_list(100)
    if not products:
        # Initialize with sample products if empty
        for product_data in sample_products:
            product = Product(**product_data)
            await db.products.insert_one(product.dict())
        products = await db.products.find(query).to_list(100)
    
    return [_normalize_product(product) for product in products]

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, admin=Depends(require_admin)):
    data = {k: v for k, v in product.dict().items() if v is not None}
    if not data.get("slug"):
        data["slug"] = _slugify(data.get("name", ""))
    product_obj = Product(**data)
    if not product_obj.media.primary_image:
        product_obj.media.primary_image = product_obj.image_url
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    # Look up by id first, then by slug (supports future product detail pages)
    product = await db.products.find_one({"id": product_id}) or await db.products.find_one({"slug": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _normalize_product(product)

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate, admin=Depends(require_admin)):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        return User(**existing_user)
    
    user_obj = User(**user.dict())
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, owner=Depends(verify_user_access)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.post("/designs", response_model=CustomDesign)
async def create_design(design: CustomDesignCreate):
    design_obj = CustomDesign(**design.dict())
    await db.designs.insert_one(design_obj.dict())
    return design_obj

@api_router.get("/designs/{user_id}")
async def get_user_designs(user_id: str, owner=Depends(verify_user_access)):
    designs = await db.designs.find({"user_id": user_id}).to_list(50)
    return [CustomDesign(**design) for design in designs]

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image (JPG, PNG, HEIC)")

    # Read and enforce a maximum upload size (15 MB) to protect the server
    MAX_UPLOAD_BYTES = 15 * 1024 * 1024
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 15 MB)")

    # Verify the bytes are a real, supported image (guards against decompression bombs
    # and non-image files disguised with an image content-type)
    ALLOWED_FORMATS = {"JPEG", "PNG", "HEIF", "HEIC", "MPO"}
    try:
        Image.MAX_IMAGE_PIXELS = 40_000_000  # ~40MP cap (decompression-bomb guard)
        verify_img = Image.open(io.BytesIO(contents))
        verify_img.verify()  # structural check
        image = Image.open(io.BytesIO(contents))  # reopen (verify() consumes the file)
        if image.format not in ALLOWED_FORMATS:
            raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG or HEIC.")
        width, height = image.size
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file. Please upload JPG, PNG, or HEIC format.")

    # Convert to base64 for storage/preview
    image_base64 = base64.b64encode(contents).decode('utf-8')

    # Quality warning with specific recommendations
    quality_warning = width < 1500 or height < 1500

    if quality_warning:
        message = f"⚠️ Image resolution is {width}x{height}px. For best print quality, we recommend minimum 2000x2000px. Current image is suitable for smaller sizes (8x10 or 12x16)."
    else:
        message = f"✅ Excellent quality image ({width}x{height}px) - Perfect for all frame sizes!"

    return {
        "success": True,
        "image_data": image_base64,
        "dimensions": {"width": width, "height": height},
        "quality_warning": quality_warning,
        "message": message,
        "recommended_sizes": ["8x10", "12x16"] if quality_warning else ["8x10", "12x16", "16x20", "20x24"]
    }

@api_router.post("/gift-suggestions")
async def get_gift_suggestions(request: EnhancedGiftRequest):
    try:
        # Handle both legacy and enhanced formats
        if request.answers:
            # Enhanced format - extract data from answers
            quiz_data = GiftQuizResponse(
                recipient=request.answers.get('recipient', 'Friend'),
                occasion=request.answers.get('occasion', 'birthday'),
                age_group=request.answers.get('age_group', 'Adult (31-50)'),
                interests=request.answers.get('interests', []),
                budget=request.answers.get('budget', 'mid_range'),
                relationship=request.answers.get('relationship', 'friend')
            )
            
            # Enhanced AI processing with photo analysis
            enhanced_processing = request.aiEnhanced
            photo_data = request.previewPhoto
            
        else:
            # Legacy format - use direct fields
            quiz_data = GiftQuizResponse(
                recipient=request.recipient or 'Friend',
                occasion=request.occasion or 'birthday',
                age_group=request.age_group or 'Adult (31-50)',
                interests=request.interests or [],
                budget=request.budget or 'mid_range',
                relationship=request.relationship or 'friend'
            )
            enhanced_processing = False
            photo_data = None
        
        # Enhanced system message for contextual AI
        system_message = """You are a gifting expert for "Memories - Photo Frames & Customized Gift Shop" located in Coimbatore. 
        We specialize in:
        - Premium Photo Frames (wooden, acrylic, LED)
        - Sublimation Printing (mugs, t-shirts)
        - Corporate Gifts & Bulk Orders
        - Personalized Memory Products
        
        Based on the user's preferences, suggest 3-4 specific gift recommendations with:
        1. Product name with personalization ideas
        2. Why it's perfect for this recipient/occasion (detailed reasoning)
        3. Estimated price range
        4. Customization suggestions
        5. Confidence score (1-100) for each recommendation
        
        Keep suggestions warm, personal, and focused on creating lasting memories. Always mention we're located in Keeranatham Road, Coimbatore and offer free home delivery."""
        
        if enhanced_processing and photo_data:
            system_message += f"""
            
            PHOTO ANALYSIS CONTEXT:
            The user has uploaded a preview photo with dimensions {photo_data.get('dimensions', {})} and analysis: {photo_data.get('analysis', 'No analysis available')}.
            Consider the photo's aspect ratio and style when making frame recommendations.
            """
        
        # Enhanced quiz text with photo context
        quiz_text = f"""
        Gift recipient: {quiz_data.recipient}
        Occasion: {quiz_data.occasion}
        Age group: {quiz_data.age_group}
        Interests: {', '.join(quiz_data.interests) if quiz_data.interests else 'Not specified'}
        Budget: {quiz_data.budget}
        Relationship: {quiz_data.relationship}
        """
        
        if enhanced_processing and photo_data:
            quiz_text += f"""
            Photo Context: User uploaded a preview photo ({photo_data.get('dimensions', {}).get('width', 'unknown')}x{photo_data.get('dimensions', {}).get('height', 'unknown')}px)
            Photo Analysis: {photo_data.get('analysis', 'No analysis available')}
            """
        
        if enhanced_processing:
            quiz_text += "\nPlease provide enhanced recommendations with confidence scores and detailed reasoning for each suggestion."
        
        # Ground recommendations with our real catalog (with images so we can show real products)
        product_docs = await db.products.find({}).limit(40).to_list(40)
        catalog = [
            {
                "id": p.get("id"),
                "name": p.get("name", ""),
                "category": p.get("category", ""),
                "base_price": p.get("base_price", 0),
                "image_url": p.get("image_url", ""),
                "description": p.get("description", ""),
            }
            for p in product_docs if p.get("name")
        ]
        catalog_text = "\n".join(
            f"- {c['name']} | category={c['category']} | from Rs.{c['base_price']}" for c in catalog
        ) or "Photo frames (wooden/acrylic/LED), photo mugs, custom t-shirts, acrylic prints."

        gift_prompt = f"""Customer preferences:{quiz_text}

Our product catalog (choose ONLY exact product names from this list):
{catalog_text}

Recommend the 3 best-matching products for this recipient and occasion. Return STRICT JSON only:
{{"recommendations":[{{"product_name":"<exact catalog name>","reason":"<1-2 warm sentences on why it fits this recipient/occasion>","price_range":"<e.g. Rs.899-1599>","customization":"<one personalization idea>","confidence":<integer 60-99>}}]}}
Pick product_name values that exactly match the catalog. Output JSON and nothing else."""

        raw = await gemini_generate(
            gift_prompt, system=system_message, json_mode=True, max_tokens=900, temperature=0.6
        )
        if not raw:
            await record_ai_usage("gift_finder", "error")
            raise Exception("Gemini unavailable - using fallback recommendations")

        parsed = json.loads(raw)
        recs = parsed.get("recommendations", []) if isinstance(parsed, dict) else []
        if not recs:
            raise Exception("Empty AI recommendations")

        def _match_product(name: str):
            n = (name or "").strip().lower()
            for c in catalog:
                if c["name"].strip().lower() == n:
                    return c
            for c in catalog:
                if n and (n in c["name"].lower() or c["name"].lower() in n):
                    return c
            return None

        suggestions = []
        used = set()
        for r in recs[:4]:
            prod = _match_product(r.get("product_name", ""))
            if not prod or prod["id"] in used:
                prod = next((c for c in catalog if c["id"] not in used), prod)
            if not prod:
                continue
            used.add(prod["id"])
            try:
                conf = int(r.get("confidence", 85))
            except (TypeError, ValueError):
                conf = 85
            suggestions.append({
                "product": {
                    "id": prod["id"],
                    "name": prod["name"],
                    "description": prod.get("description") or r.get("reason", ""),
                    "base_price": prod.get("base_price", 0),
                    "image_url": prod.get("image_url", ""),
                    "category": prod.get("category", ""),
                },
                "reasoning": r.get("reason", ""),
                "confidence": max(60, min(99, conf)),
                "price_range": r.get("price_range", ""),
                "customization": r.get("customization", ""),
                "aiTag": "✨ AI Pick",
            })

        if not suggestions:
            raise Exception("No catalog products matched")

        await record_ai_usage("gift_finder", "live")
        return {
            "suggestions": suggestions,
            "quiz_data": quiz_data.dict(),
            "enhanced": enhanced_processing,
            "photo_analyzed": photo_data is not None,
            "shop_info": {
                "name": "Memories - Photo Frames & Customized Gift Shop",
                "phone": "+91 81480 40148",
                "address": "19B Kani Illam, Keeranatham Road, Coimbatore",
                "specialties": ["Photo Frames", "Sublimation Printing", "Corporate Gifts"]
            }
        }

        
    except HTTPException:
        raise
    except Exception:
        # Let the frontend render its own varied structured fallback (different images per card)
        raise HTTPException(status_code=502, detail="AI recommendations are temporarily unavailable. Please try again.")


class ChatRequest(BaseModel):
    session_id: str
    message: str


@api_router.post("/chat")
async def chat_assistant(req: ChatRequest, authorization: Optional[str] = Header(default=None)):
    """Customer support / shopping assistant chat (Gemini), grounded in the shop catalog.
    Multi-turn via session_id; recent history is persisted in chat_sessions.
    If a valid user Bearer token is present, the session is tied to that user for history."""
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    if len(message) > 1000:
        message = message[:1000]

    # Optional auth: associate the session with a logged-in user (for persistent history)
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_token(authorization[7:])
            if payload.get("role") == "user":
                user_id = payload.get("sub")
        except Exception:
            user_id = None

    wa_fallback = ("Our AI assistant is taking a quick break. Please WhatsApp us at +91 81480 40148 "
                   "or call us and our team will help you right away! 🎁")

    if not gemini_available():
        return {"reply": wa_fallback, "session_id": req.session_id, "ai": False}

    session = await db.chat_sessions.find_one({"session_id": req.session_id})
    history = session.get("messages", []) if session else []

    product_docs = await db.products.find({}).limit(30).to_list(30)
    catalog_text = "\n".join(
        f"- {p.get('name')} ({p.get('category')}, from Rs.{p.get('base_price')})"
        for p in product_docs if p.get("name")
    ) or "Photo frames (wooden/acrylic/LED), photo mugs, custom t-shirts, acrylic prints, corporate gifts."

    # Google Maps links built from the public Place ID (no API key required)
    place_id = os.environ.get("GOOGLE_PLACE_ID", "").strip()
    if place_id:
        maps_link = f"https://www.google.com/maps/search/?api=1&query=Memories%20Photo%20Frames%20Coimbatore&query_place_id={place_id}"
        directions_link = f"https://www.google.com/maps/dir/?api=1&destination=Memories%20Photo%20Frames%20Keeranatham%20Coimbatore&destination_place_id={place_id}"
    else:
        maps_link = "https://www.google.com/maps/search/Memories+Photo+Frames+Coimbatore"
        directions_link = maps_link

    system = (
        "You are 'Memo', the warm, helpful shopping assistant for 'Memories - Photo Frames & Customized "
        "Gift Shop' in Coimbatore. Help customers pick gifts/frames, answer about products, pricing, "
        "customization and delivery. Keep replies concise (2-4 sentences), friendly and specific.\n"
        "Business details:\n"
        "- Address: 19B Kani Illam, Keeranatham Road, Coimbatore, Tamil Nadu.\n"
        "- Phone / WhatsApp: +91 81480 40148.\n"
        "- Hours: Monday to Saturday, 9:30 AM to 9:00 PM (closed Sunday).\n"
        "- Free home delivery available.\n"
        f"- Google Maps location: {maps_link}\n"
        f"- Get directions: {directions_link}\n"
        "When a customer asks where the shop is, your opening hours, or how to reach you, share the details "
        "above and include the 'Get directions' link so they can navigate in Google Maps.\n"
        f"Products you can recommend (do NOT invent items outside this list):\n{catalog_text}\n"
        "For bulk/corporate or complex custom orders, suggest WhatsApp or a call. "
        "Reply in plain text only (no markdown headings or asterisks)."
    )

    convo = ""
    for m in history[-8:]:
        role = "User" if m.get("role") == "user" else "Assistant"
        convo += f"{role}: {m.get('content', '')}\n"
    convo += f"User: {message}\nAssistant:"

    # Chat is pinned to the fastest stable flash tier (Flash-Lite) to minimise latency.
    reply = await gemini_generate(convo, system=system, max_tokens=400, temperature=0.7,
                                  model="gemini-flash-lite-latest")
    if not reply:
        await record_ai_usage("chat", "error")
        return {"reply": wa_fallback, "session_id": req.session_id, "ai": False}

    await record_ai_usage("chat", "live")
    now_iso = datetime.now(timezone.utc).isoformat()
    new_messages = history + [
        {"role": "user", "content": message, "ts": now_iso},
        {"role": "assistant", "content": reply, "ts": now_iso},
    ]
    set_doc = {"session_id": req.session_id, "messages": new_messages[-40:], "updated_at": now_iso}
    if user_id:
        set_doc["user_id"] = user_id
    await db.chat_sessions.update_one(
        {"session_id": req.session_id},
        {"$set": set_doc},
        upsert=True,
    )
    return {"reply": reply, "session_id": req.session_id, "ai": True}


@api_router.get("/chat/history")
async def get_user_chat_history(current=Depends(get_current_user)):
    """Authenticated: return the logged-in user's saved chat messages (most recent sessions)."""
    sessions = await db.chat_sessions.find({"user_id": current["id"]}).sort("updated_at", -1).to_list(20)
    messages = []
    for s in reversed(sessions):
        for m in s.get("messages", []):
            messages.append({"role": m.get("role"), "content": m.get("content")})
    return {"messages": messages}


@api_router.get("/chat/{session_id}")
async def get_chat_history(session_id: str):
    session = await db.chat_sessions.find_one({"session_id": session_id})
    msgs = session.get("messages", []) if session else []
    return {"session_id": session_id, "messages": [{"role": m.get("role"), "content": m.get("content")} for m in msgs]}



@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate, current=Depends(get_current_user)):
    if order.user_id != current["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to create an order for another account")
    # --- Financial integrity: never blindly trust client totals ---
    if not order.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    computed_subtotal = 0.0
    for item in order.items:
        try:
            qty = int(item.get("quantity", 0))
            price = float(item.get("price", 0))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid item price or quantity")
        if qty <= 0 or qty > 100:
            raise HTTPException(status_code=400, detail="Invalid item quantity")
        if not math.isfinite(price) or price < 0 or price > 1_000_000:
            raise HTTPException(status_code=400, detail="Invalid item price")
        product_id = item.get("productId") or item.get("product_id")
        if not product_id:
            raise HTTPException(status_code=400, detail="Product reference is required for order")
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
        status = product.get("status") or {}
        if status.get("active") is False or status.get("published") is False:
            raise HTTPException(status_code=400, detail="Product is not available for purchase")
        expected_price = float(product.get("base_price", 0))
        variant_id = item.get("variantId") or item.get("variant_id")
        variants = product.get("variants", []) or []
        if variants:
            if not variant_id:
                raise HTTPException(status_code=400, detail="A product option must be selected")
            variant = next((v for v in variants if v.get("id") == variant_id), None)
            if not variant:
                raise HTTPException(status_code=400, detail="Invalid product variant")
            if variant.get("in_stock") is False:
                raise HTTPException(status_code=400, detail="Selected product option is out of stock")
            expected_price += float(variant.get("price_delta", 0))
        elif variant_id:
            raise HTTPException(status_code=400, detail="Invalid product variant")
        expected_price = round(expected_price, 2)
        if abs(price - expected_price) > 0.01:
            raise HTTPException(status_code=400, detail="Item price does not match the catalog price")
        item["productId"] = product_id
        item["variantId"] = variant_id
        item["price"] = expected_price
        computed_subtotal += expected_price * qty

    total = order.total_amount
    if total is None or not math.isfinite(total) or total <= 0 or total > 5_000_000:
        raise HTTPException(status_code=400, detail="Invalid order total")
    # Reject grossly manipulated totals (client legitimately adds tax/delivery or subtracts discounts)
    if total < computed_subtotal * 0.4:
        raise HTTPException(status_code=400, detail="Order total does not match items")

    # Points earned from validated subtotal (server-side), not client total
    points_earned = int(computed_subtotal * 0.03)

    order_dict = order.dict()
    order_dict["points_earned"] = points_earned
    order_obj = Order(**order_dict)
    
    await db.orders.insert_one(order_obj.dict())
    
    # Update user points
    if order.user_id:
        user = await db.users.find_one({"id": order.user_id})
        if user:
            new_points = user.get("points", 0) + points_earned
            # Update tier based on total points
            new_tier = "Platinum" if new_points >= 5000 else "Gold" if new_points >= 2000 else "Silver"
            
            await db.users.update_one(
                {"id": order.user_id},
                {"$set": {"points": new_points, "tier": new_tier}}
            )
    
    return order_obj

class PaymentVerifyRequest(BaseModel):
    order_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class PaymentCreateRequest(BaseModel):
    user_id: str
    items: List[dict]
    delivery_type: str
    delivery_address: Optional[dict] = None
    pickup_slot: Optional[str] = None
    use_store_credit: bool = False


# Razorpay single-transaction ceiling (₹5,00,000). Reject anything above before calling the API.
RAZORPAY_MAX_AMOUNT = 500000.0


async def _compute_order_pricing(items: list, delivery_type: str, use_store_credit: bool, user: Optional[dict]):
    """Server-authoritative pricing. Returns validated line items + totals.
    Reuses Sprint 1 validation and the existing business rules (GST 18%, free delivery >= Rs.1000)."""
    if not items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    subtotal = 0.0
    for item in items:
        try:
            qty = int(item.get("quantity", 0))
            price = float(item.get("price", 0))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid item price or quantity")
        if qty <= 0 or qty > 100:
            raise HTTPException(status_code=400, detail="Invalid item quantity")
        if not math.isfinite(price) or price < 0 or price > 1_000_000:
            raise HTTPException(status_code=400, detail="Invalid item price")
        product_id = item.get("productId") or item.get("product_id")
        if not product_id:
            raise HTTPException(status_code=400, detail="Product reference is required for payment")
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
        status = product.get("status") or {}
        if status.get("active") is False or status.get("published") is False:
            raise HTTPException(status_code=400, detail="Product is not available for purchase")

        expected_price = float(product.get("base_price", 0))
        variant_id = item.get("variantId") or item.get("variant_id")
        variants = product.get("variants", []) or []
        if variants:
            if not variant_id:
                raise HTTPException(status_code=400, detail="A product option must be selected")
            variant = next((v for v in variants if v.get("id") == variant_id), None)
            if not variant:
                raise HTTPException(status_code=400, detail="Invalid product variant")
            if variant.get("in_stock") is False:
                raise HTTPException(status_code=400, detail="Selected product option is out of stock")
            expected_price += float(variant.get("price_delta", 0))
        elif variant_id:
            raise HTTPException(status_code=400, detail="Invalid product variant")

        expected_price = round(expected_price, 2)
        if abs(price - expected_price) > 0.01:
            raise HTTPException(status_code=400, detail="Item price does not match the catalog price")

        # Normalize the stored order line to the server price so admin/order history cannot contain a forged price.
        item["productId"] = product_id
        item["variantId"] = variant_id
        item["price"] = expected_price
        subtotal += expected_price * qty

    delivery = 0.0 if (delivery_type == "pickup" or subtotal >= 1000) else 50.0
    tax = round(subtotal * 0.18)
    # Store credit applied server-side (never trusts a client amount); capped at pre-credit total
    store_credit_applied = 0.0
    if use_store_credit and user:
        available = float(user.get("store_credits", 0.0) or 0.0)
        store_credit_applied = max(0.0, min(available, subtotal + delivery + tax))
    final_amount = max(0.0, subtotal + delivery + tax - store_credit_applied)
    return {
        "subtotal": subtotal, "delivery": delivery, "tax": tax,
        "store_credit_applied": round(store_credit_applied, 2),
        "final_amount": round(final_amount, 2),
        "points_earned": int(subtotal * 0.03),
    }


async def _create_razorpay_order(amount_rupees: float):
    """Create a Razorpay order server-side (production). Returns the razorpay order id.
    Mock mode returns a synthetic id and never calls the network."""
    if amount_rupees <= 0 or amount_rupees > RAZORPAY_MAX_AMOUNT:
        raise HTTPException(status_code=400, detail="Payment amount out of allowed range")
    amount_paise = round(amount_rupees * 100)
    if PAYMENT_MODE != "production":
        return f"order_mock_{uuid.uuid4().hex[:14]}"
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or RAZORPAY_KEY_SECRET == "mock":
        raise HTTPException(status_code=500, detail="Payment gateway is not configured")
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.post(
                "https://api.razorpay.com/v1/orders",
                auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
                json={"amount": amount_paise, "currency": "INR", "payment_capture": 1},
            )
        if resp.status_code >= 400:
            logger.error(f"Razorpay order creation failed: HTTP {resp.status_code}")
            raise HTTPException(status_code=502, detail="Could not create payment order")
        return resp.json()["id"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Razorpay order creation error: {type(e).__name__}")
        raise HTTPException(status_code=502, detail="Could not create payment order")


@api_router.get("/payments/config")
async def get_payment_config():
    """Expose non-sensitive payment config for the frontend checkout (never the secret)."""
    return {"mode": PAYMENT_MODE, "razorpay_key_id": RAZORPAY_KEY_ID if PAYMENT_MODE == "production" else ""}


@api_router.post("/payments/create-order")
async def create_payment_order(payload: PaymentCreateRequest, current=Depends(get_current_user)):
    if payload.user_id != current["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to create a payment order for another account")
    """Validate cart, compute the server-authoritative amount, create a pending Memories order
    and a matching Razorpay order, then return payment info for the frontend checkout."""
    user = await db.users.find_one({"id": payload.user_id}) if payload.user_id else None
    pricing = await _compute_order_pricing(payload.items, payload.delivery_type, payload.use_store_credit, user)

    order_obj = Order(
        user_id=payload.user_id,
        items=payload.items,
        total_amount=pricing["final_amount"],
        delivery_type=payload.delivery_type,
        delivery_address=payload.delivery_address,
        pickup_slot=payload.pickup_slot,
        points_earned=pricing["points_earned"],
        store_credit_applied=pricing["store_credit_applied"],
        payment_status="pending",
        order_status="pending",
    )
    rzp_order_id = await _create_razorpay_order(pricing["final_amount"])
    order_obj.razorpay_order_id = rzp_order_id
    order_obj.payment_attempts = 1
    await db.orders.insert_one(order_obj.dict())

    return {
        "memories_order_id": order_obj.id,
        "razorpay_order_id": rzp_order_id,
        "amount": round(pricing["final_amount"] * 100),  # paise
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID if PAYMENT_MODE == "production" else "",
        "mode": PAYMENT_MODE,
        "pricing": pricing,
    }


@api_router.post("/payments/verify")
async def verify_payment(payload: PaymentVerifyRequest, current=Depends(get_current_user)):
    """Verify a Razorpay payment using the SERVER-STORED razorpay_order_id, then mark paid.
    mock mode bypasses signature; production verifies HMAC-SHA256(stored_order|payment_id)."""
    order = await db.orders.find_one({"id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("user_id") != current["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to verify payment for this order")

    # Idempotency: already paid -> safe success, but reject a DIFFERENT payment_id
    if order.get("payment_status") == "paid":
        if payload.razorpay_payment_id and order.get("razorpay_payment_id") and \
           payload.razorpay_payment_id != order.get("razorpay_payment_id"):
            raise HTTPException(status_code=409, detail="Order already paid with a different payment")
        return {"success": True, "order_id": payload.order_id,
                "status": order.get("status", "processing"), "mode": PAYMENT_MODE, "already_paid": True}

    stored_rzp_order = order.get("razorpay_order_id")

    if PAYMENT_MODE == "production":
        if not RAZORPAY_KEY_SECRET or RAZORPAY_KEY_SECRET == "mock":
            raise HTTPException(status_code=500, detail="Payment gateway is not configured")
        if not (payload.razorpay_payment_id and payload.razorpay_signature):
            raise HTTPException(status_code=400, detail="Missing Razorpay payment fields")
        if not stored_rzp_order:
            raise HTTPException(status_code=400, detail="No Razorpay order associated with this order")
        # Never trust a browser-supplied order id: if provided it MUST match the stored one
        if payload.razorpay_order_id and payload.razorpay_order_id != stored_rzp_order:
            raise HTTPException(status_code=400, detail="Razorpay order mismatch")

        message = f"{stored_rzp_order}|{payload.razorpay_payment_id}"
        expected_signature = hmac.new(
            bytes(RAZORPAY_KEY_SECRET, "utf-8"),
            bytes(message, "utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
            await db.orders.update_one({"id": payload.order_id},
                                       {"$set": {"payment_status": "failed", "payment_updated_at": datetime.now(timezone.utc)}})
            raise HTTPException(status_code=400, detail="Payment signature verification failed")

        # --- Payment verified: atomically transition pending -> paid exactly once ---
    # Only the request that wins this conditional update may continue to deduct
    # store credit and award purchase points. Concurrent verification requests
    # become idempotent responses instead of double-processing the order.
    transition = await db.orders.update_one(
        {
            "id": payload.order_id,
            "payment_status": {"$ne": "paid"},
        },
        {
            "$set": {
                "status": "processing",
                "payment_status": "paid",
                "order_status": "confirmed",
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
                "payment_updated_at": datetime.now(timezone.utc),
            }
        },
    )

    if transition.modified_count != 1:
        latest = await db.orders.find_one({"id": payload.order_id})

        if latest and latest.get("payment_status") == "paid":
            if (
                payload.razorpay_payment_id
                and latest.get("razorpay_payment_id")
                and payload.razorpay_payment_id
                != latest.get("razorpay_payment_id")
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Order already paid with a different payment",
                )

            return {
                "success": True,
                "order_id": payload.order_id,
                "status": latest.get("status", "processing"),
                "mode": PAYMENT_MODE,
                "already_paid": True,
            }

        raise HTTPException(
            status_code=409,
            detail="Payment state changed; please retry",
        )

    # Commit store-credit deduction now (only after successful payment); guard double-commit
    sc = float(order.get("store_credit_applied", 0.0) or 0.0)
    if sc > 0 and order.get("user_id"):
        existing_txn = await db.wallet_transactions.find_one(
            {"order_id": payload.order_id, "type": "debit"})
        if not existing_txn:
            u = await db.users.find_one({"id": order["user_id"]})
            if u:
                new_credit = max(0.0, float(u.get("store_credits", 0.0) or 0.0) - sc)
                await db.users.update_one({"id": order["user_id"]}, {"$set": {"store_credits": new_credit}})
                await db.wallet_transactions.insert_one(WalletTransaction(
                    user_id=order["user_id"], type="debit", amount=sc,
                    description=f"Store credit for order #{payload.order_id[:8]}",
                    category="purchase", order_id=payload.order_id, balance_after=new_credit,
                ).dict())

    # Award purchase points once (idempotent via payment_status transition above)
    pts = int(order.get("points_earned", 0) or 0)
    if pts > 0 and order.get("user_id"):
        u = await db.users.find_one({"id": order["user_id"]})
        if u:
            new_points = int(u.get("points", 0) or 0) + pts
            new_tier = "Platinum" if new_points >= 5000 else "Gold" if new_points >= 2000 else "Silver"
            await db.users.update_one({"id": order["user_id"]}, {"$set": {"points": new_points, "tier": new_tier}})

    # TODO(webhook-sprint): a future Razorpay webhook should reconcile captured/failed/refund
    # events against these fields (payment_status, razorpay_payment_id) for out-of-band updates.
    return {"success": True, "order_id": payload.order_id, "status": "processing", "mode": PAYMENT_MODE}


@api_router.get("/orders/{user_id}")
async def get_user_orders(user_id: str, owner=Depends(verify_user_access)):
    orders = await db.orders.find({"user_id": user_id}).to_list(50)
    return [Order(**order) for order in orders]

# Review Management Endpoints
@api_router.post("/reviews", response_model=Review)
async def create_review(review: ReviewCreate):
    """Create a new customer review (starts unapproved; admin moderates before it goes public)"""
    try:
        review_obj = Review(**review.dict())
        # Reviews require admin approval before appearing publicly (approved defaults to False)
        await db.reviews.insert_one(review_obj.dict())
        return review_obj
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create review")

@api_router.get("/reviews")
async def get_reviews(
    limit: int = 10,
    offset: int = 0,
    rating_filter: Optional[int] = None,
    product_id: Optional[str] = None,
    approved_only: bool = True
):
    """Get reviews with pagination and filtering"""
    try:
        # Build filter query
        filter_query = {}
        if approved_only:
            filter_query["approved"] = True
        if rating_filter:
            filter_query["rating"] = rating_filter
        if product_id:
            filter_query["product_id"] = product_id
        
        # Get total count
        total_count = await db.reviews.count_documents(filter_query)
        
        # Get reviews with pagination, pinned first then newest
        reviews = await db.reviews.find(filter_query).sort([("pinned", -1), ("created_at", -1)]).skip(offset).limit(limit).to_list(limit)
        
        # Calculate rating statistics
        all_reviews = await db.reviews.find({"approved": True}).to_list(1000)
        rating_stats = {
            "total_reviews": len(all_reviews),
            "average_rating": sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0,
            "rating_distribution": {
                "5": len([r for r in all_reviews if r["rating"] == 5]),
                "4": len([r for r in all_reviews if r["rating"] == 4]),
                "3": len([r for r in all_reviews if r["rating"] == 3]),
                "2": len([r for r in all_reviews if r["rating"] == 2]),
                "1": len([r for r in all_reviews if r["rating"] == 1]),
            }
        }
        
        return {
            "reviews": [Review(**review) for review in reviews],
            "total_count": total_count,
            "has_more": (offset + limit) < total_count,
            "rating_stats": rating_stats
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@api_router.get("/reviews/highlights")
async def review_highlights():
    """Cached 'what customers love' summary (Gemini). Regenerates ~daily or when review count changes."""
    total = await db.reviews.count_documents({"approved": True})
    cache = await db.ai_cache.find_one({"key": "review_highlights"})
    now = datetime.now(timezone.utc)
    if cache:
        try:
            updated = datetime.fromisoformat(cache.get("updated_at", ""))
        except Exception:
            updated = None
        fresh = updated and (now - updated).total_seconds() < 86400
        if fresh and cache.get("review_count") == total and cache.get("text"):
            await record_ai_usage("review_highlights", "cache_hit")
            return {"highlights": cache["text"], "cached": True}
    if total < 3 or not gemini_available():
        return {"highlights": cache.get("text", "") if cache else "", "cached": bool(cache)}
    reviews = await db.reviews.find({"approved": True}).sort("created_at", -1).limit(40).to_list(40)
    snippets = []
    for r in reviews:
        c = r.get("comment") or r.get("text") or ""
        if c:
            snippets.append(f"- ({r.get('rating', '?')} stars) {c[:300]}")
    if not snippets:
        return {"highlights": cache.get("text", "") if cache else "", "cached": bool(cache)}
    prompt = (
        "Summarize what customers love about this photo-frame & gift shop into exactly 3 short "
        "bullet highlights (max 12 words each), positive and specific, based ONLY on these reviews. "
        "Return plain bullets starting with '- ', no preamble:\n\n" + "\n".join(snippets)
    )
    text = await gemini_generate(prompt, max_tokens=200, temperature=0.5)
    if not text:
        await record_ai_usage("review_highlights", "error")
        return {"highlights": cache.get("text", "") if cache else "", "cached": bool(cache)}
    await db.ai_cache.update_one(
        {"key": "review_highlights"},
        {"$set": {"key": "review_highlights", "text": text, "review_count": total, "updated_at": now.isoformat()}},
        upsert=True,
    )
    await record_ai_usage("review_highlights", "live")
    return {"highlights": text, "cached": False}



@api_router.get("/config")
async def get_public_config():
    """Public, non-secret config for the frontend (e.g. shop WhatsApp number)."""
    return {
        "shop_whatsapp": os.environ.get("SHOP_WHATSAPP_NUMBER", "918148040148"),
        "business_name": "Memories",
    }


@api_router.get("/google-reviews")
async def google_reviews():
    """Live Google reviews (top ~5) via Places API, with graceful mock fallback when not configured."""
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    place_id = os.environ.get("GOOGLE_PLACE_ID", "").strip()
    google_url = os.environ.get("GOOGLE_REVIEWS_URL", "").strip()
    if not google_url:
        google_url = (
            f"https://search.google.com/local/reviews?placeid={place_id}"
            if place_id else "https://www.google.com/maps/search/Memories+Photo+Frames+Coimbatore"
        )

    mock = {
        "configured": False,
        "rating": 4.9,
        "total": 263,
        "google_url": google_url,
        "reviews": [
            {"author_name": "Anitha R", "rating": 5, "text": "Beautiful photo frames and excellent service. Highly recommend Memories for gifts!", "relative_time": "2 weeks ago", "profile_photo_url": ""},
            {"author_name": "Karthik S", "rating": 5, "text": "Got customized acrylic frames for my parents' anniversary. The quality is top notch.", "relative_time": "1 month ago", "profile_photo_url": ""},
            {"author_name": "Deepa M", "rating": 5, "text": "Friendly staff and quick delivery. The LED frame looks stunning at home.", "relative_time": "1 month ago", "profile_photo_url": ""},
        ],
    }

    if not api_key or not place_id:
        return mock

    try:
        async with httpx.AsyncClient(timeout=10) as http_client:
            resp = await http_client.get(
                "https://maps.googleapis.com/maps/api/place/details/json",
                params={
                    "place_id": place_id,
                    "fields": "rating,user_ratings_total,reviews,url",
                    "reviews_sort": "newest",
                    "key": api_key,
                },
            )
        data = resp.json()
        if data.get("status") != "OK":
            logger.error(f"Google Places API status: {data.get('status')} {data.get('error_message','')}")
            return {**mock, "error": data.get("status")}
        result = data.get("result", {})
        reviews = [
            {
                "author_name": r.get("author_name"),
                "rating": r.get("rating"),
                "text": r.get("text"),
                "relative_time": r.get("relative_time_description"),
                "profile_photo_url": r.get("profile_photo_url", ""),
            }
            for r in result.get("reviews", [])
        ]
        return {
            "configured": True,
            "rating": result.get("rating", 0),
            "total": result.get("user_ratings_total", 0),
            "google_url": result.get("url", google_url),
            "reviews": reviews,
        }
    except Exception as e:
        logger.error(f"Google reviews fetch error: {e}")
        return {**mock, "error": "fetch_failed"}


@api_router.put("/admin/reviews/{review_id}/pin")
async def pin_review(review_id: str, pinned: bool, admin=Depends(require_admin)):
    """Pin/unpin a review so it appears first (admin-curated)."""
    result = await db.reviews.update_one({"id": review_id}, {"$set": {"pinned": pinned}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "pinned": pinned}


@api_router.get("/reviews/stats")
async def get_review_stats():
    try:
        all_reviews = await db.reviews.find({"approved": True}).to_list(1000)
        
        if not all_reviews:
            return {
                "total_reviews": 0,
                "average_rating": 0,
                "rating_distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
            }
        
        average_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        
        return {
            "total_reviews": len(all_reviews),
            "average_rating": round(average_rating, 1),
            "rating_distribution": {
                "5": len([r for r in all_reviews if r["rating"] == 5]),
                "4": len([r for r in all_reviews if r["rating"] == 4]),
                "3": len([r for r in all_reviews if r["rating"] == 3]),
                "2": len([r for r in all_reviews if r["rating"] == 2]),
                "1": len([r for r in all_reviews if r["rating"] == 1]),
            }
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch review statistics")

@api_router.get("/store-info")
async def get_store_info():
    return {
        "name": "Memories - Photo Frames & Customized Gift Shop",
        "tagline": "Creating Beautiful Memories Since 2020",
        "address": {
            "street": "19B Kani Illam, Keeranatham Road",
            "area": "Near Ruby School, Saravanampatti",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641035",
            "landmark": "Near Ruby School"
        },
        "contact": {
            "phone": "+91 81480 40148",
            "whatsapp": "+91 81480 40148",
            "email": "memories@photogifthub.com"
        },
        "hours": {
            "monday_saturday": "9:30 AM - 9:00 PM",
            "sunday": "Closed",
            "note": "Extended hours during festive seasons"
        },
        "services": [
            "Premium Photo Frames",
            "Sublimation Printing",
            "Custom Photo Mugs",
            "Personalized T-Shirts",
            "Corporate Gifts",
            "Bulk Orders",
            "Free Home Delivery"
        ],
        "specialties": [
            "Handcrafted wooden frames",
            "Crystal clear acrylic frames", 
            "High-quality sublimation printing",
            "Same-day printing services",
            "Corporate branding solutions"
        ],
        "google_rating": "4.9/5",
        "total_reviews": 263,
        "established": 2020,
        "google_maps": "https://maps.google.com/?q=19B+Kani+Illam+Keeranatham+Road+Coimbatore"
    }

# Enhanced User Profile Endpoints
@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, owner=Depends(verify_user_access)):
    await db.users.update_one(
        {"id": user_id},
        {"$set": user_data}
    )
    updated_user = await db.users.find_one({"id": user_id})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**updated_user)

# Photo Storage Endpoints
@api_router.post("/users/{user_id}/photos", response_model=SavedPhoto)
async def save_user_photo(user_id: str, photo: SavedPhotoCreate, owner=Depends(verify_user_access)):
    photo_obj = SavedPhoto(**photo.dict())
    await db.user_photos.insert_one(photo_obj.dict())
    return photo_obj

@api_router.get("/users/{user_id}/photos")
async def get_user_photos(user_id: str, owner=Depends(verify_user_access)):
    photos = await db.user_photos.find({"user_id": user_id}).to_list(100)
    return [SavedPhoto(**photo) for photo in photos]

@api_router.delete("/users/{user_id}/photos/{photo_id}")
async def delete_user_photo(user_id: str, photo_id: str, owner=Depends(verify_user_access)):
    result = await db.user_photos.delete_one({"id": photo_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"message": "Photo deleted successfully"}

@api_router.put("/users/{user_id}/photos/{photo_id}/favorite")
async def toggle_photo_favorite(user_id: str, photo_id: str, owner=Depends(verify_user_access)):
    photo = await db.user_photos.find_one({"id": photo_id, "user_id": user_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    new_favorite_status = not photo.get("favorite", False)
    await db.user_photos.update_one(
        {"id": photo_id, "user_id": user_id},
        {"$set": {"favorite": new_favorite_status}}
    )
    return {"favorite": new_favorite_status}

@api_router.put("/users/{user_id}/photos/{photo_id}/use")
async def use_photo_for_order(user_id: str, photo_id: str, owner=Depends(verify_user_access)):
    await db.user_photos.update_one(
        {"id": photo_id, "user_id": user_id},
        {
            "$inc": {"usage_count": 1},
            "$set": {"last_used": datetime.now(timezone.utc)}
        }
    )
    return {"message": "Photo usage recorded"}

# Wallet Endpoints
@api_router.get("/users/{user_id}/wallet")
async def get_user_wallet(user_id: str, owner=Depends(verify_user_access)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "balance": user.get("wallet_balance", 0.0),
        "reward_points": user.get("points", 0),
        "store_credits": user.get("store_credits", 0.0),
        "tier": user.get("tier", "Silver"),
        "total_spent": user.get("total_spent", 0.0)
    }

@api_router.post("/users/{user_id}/wallet/add-money")
async def add_money_to_wallet(user_id: str, amount: float, owner=Depends(verify_user_access)):
    # SECURITY: direct wallet top-up is disabled — a user must never be able to increase
    # their own balance without a verified payment. Reward-point conversion (store credit)
    # remains available via /wallet/convert-points.
    # TODO(payment-sprint): re-enable top-up only after a verified Razorpay payment.
    raise HTTPException(
        status_code=403,
        detail="Wallet top-up requires a verified payment and is currently disabled. Convert reward points to store credit instead.",
    )

@api_router.post("/users/{user_id}/wallet/convert-points")
async def convert_points_to_credits(user_id: str, points: int, owner=Depends(verify_user_access)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_points = user.get("points", 0)
    if points <= 0:
        raise HTTPException(status_code=400, detail="Points must be a positive number")
    if points > current_points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # 100 points = ₹10 store credit
    credit_value = (points / 100) * 10
    new_points = current_points - points
    new_store_credits = user.get("store_credits", 0.0) + credit_value
    
    # Atomically spend the points so two concurrent requests cannot convert the same points twice.
    result = await db.users.update_one(
        {"id": user_id, "points": {"$gte": points}},
        {
            "$inc": {"points": -points, "store_credits": credit_value}
        }
    )
    if result.matched_count != 1:
        raise HTTPException(status_code=409, detail="Reward points changed. Please refresh and try again.")

    updated_user = await db.users.find_one({"id": user_id})
    new_points = int(updated_user.get("points", 0) or 0)
    new_store_credits = float(updated_user.get("store_credits", 0.0) or 0.0)

    # Record transaction
    transaction = WalletTransaction(
        user_id=user_id,
        type="conversion",
        amount=points,
        description=f"Converted {points} points to ₹{credit_value} store credit",
        category="conversion",
        balance_after=user.get("wallet_balance", 0.0),
        is_points=True,
        credit_earned=credit_value
    )
    await db.wallet_transactions.insert_one(transaction.dict())
    
    return {
        "points_remaining": new_points,
        "store_credits": new_store_credits,
        "credit_earned": credit_value
    }

@api_router.get("/users/{user_id}/wallet/transactions")
async def get_wallet_transactions(user_id: str, limit: int = 50, owner=Depends(verify_user_access)):
    transactions = await db.wallet_transactions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(limit)
    
    return [WalletTransaction(**txn) for txn in transactions]

@api_router.post("/users/{user_id}/wallet/pay")
async def pay_with_wallet(user_id: str, amount: float, order_id: str, owner=Depends(verify_user_access)):
    # SECURITY: this endpoint is intentionally disabled until wallet debit, order ownership,
    # exact server-side order amount, and payment-state changes are committed atomically.
    raise HTTPException(
        status_code=403,
        detail="Wallet payments are temporarily disabled until secure checkout integration is enabled.",
    )

# ============================ Authentication endpoints ============================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_obj = User(name=req.name.strip(), email=email, phone=req.phone, role="user")
    doc = user_obj.dict()
    doc["password_hash"] = hash_password(req.password)
    await db.users.insert_one(doc)
    token = create_token(user_obj.id, "user")
    return {"token": token, "user": user_obj.dict()}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], "user")
    return {"token": token, "user": User(**user).dict()}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    token: str


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Create a short-lived hashed reset token without revealing account existence.
    The raw token is never logged or returned; a verified email/SMS delivery channel
    must deliver it before production self-service recovery is enabled."""
    email = (req.email or "").strip().lower()
    generic = {
        "success": True,
        "message": "If an account exists for that email, a password reset option will be available.",
    }
    user = await db.users.find_one({"email": email})
    if user:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_reset_tokens.insert_one({
            "user_id": user["id"],
            "email": email,
            "token_hash": _hash_token(raw_token),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
        })
    return generic


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Reset password using a one-time reset token only.
    Phone-number knowledge is deliberately not accepted as proof of identity."""
    email = (req.email or "").strip().lower()
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(req.new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")
    if not req.token or len(req.token) > 512:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    token_doc = await db.password_reset_tokens.find_one({
        "email": email,
        "token_hash": _hash_token(req.token),
        "used": False,
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    exp_dt = token_doc.get("expires_at")
    if not isinstance(exp_dt, datetime):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    if exp_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    consumed = await db.password_reset_tokens.update_one(
        {"_id": token_doc["_id"], "used": False},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    if consumed.modified_count != 1:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(req.new_password), "must_change_password": False}},
    )
    await db.password_reset_tokens.update_many(
        {"email": email, "used": False},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    return {"success": True, "message": "Password updated. You can now log in with your new password."}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, current=Depends(get_current_user)):
    """Authenticated user changes their own password. Clears any admin-set
    must_change_password flag on success."""
    if not verify_password(req.current_password, current.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(req.new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")
    if verify_password(req.new_password, current.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="New password must be different from the current one")
    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"password_hash": hash_password(req.new_password), "must_change_password": False}},
    )
    updated = await db.users.find_one({"id": current["id"]})
    updated.pop("_id", None)
    return {"success": True, "user": User(**updated).dict()}


@api_router.get("/auth/me")
async def auth_me(current=Depends(get_current_user)):
    return {"user": User(**current).dict()}


async def enrich_orders(orders: List[dict]) -> List[dict]:
    user_ids = list({o.get("user_id") for o in orders if o.get("user_id")})
    users = await db.users.find({"id": {"$in": user_ids}}).to_list(1000) if user_ids else []
    name_map = {u["id"]: u.get("name", "Guest") for u in users}
    email_map = {u["id"]: u.get("email", "") for u in users}
    phone_map = {u["id"]: u.get("phone", "") for u in users}
    result = []
    for o in orders:
        oo = Order(**o).dict()
        oo["total"] = oo.get("total_amount", 0)
        addr = oo.get("delivery_address") or {}
        oo["customer"] = {
            "name": addr.get("name") or name_map.get(o.get("user_id"), "Guest"),
            "email": addr.get("email") or email_map.get(o.get("user_id"), ""),
            "phone": addr.get("phone") or phone_map.get(o.get("user_id"), ""),
        }
        result.append(oo)
    return result


# Admin Management Endpoints
@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login - verifies against seeded admin with bcrypt-hashed password, returns JWT."""
    admin = await db.admins.find_one({"username": credentials.username.strip()})
    if not admin or not verify_password(credentials.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(admin["username"], "admin")
    admin_data = {
        "id": admin.get("id", "admin_001"),
        "username": admin["username"],
        "email": admin.get("email", "admin@memories.com"),
        "role": admin.get("role", "super_admin"),
        "permissions": ["products", "reviews", "users", "orders", "analytics"],
        "last_login": datetime.now(timezone.utc).isoformat(),
    }
    return {"success": True, "admin": admin_data, "token": token}


@api_router.get("/admin/stats")
async def get_admin_stats(admin=Depends(require_admin)):
    """Get comprehensive admin dashboard statistics"""
    try:
        # Get counts from database
        total_users = await db.users.count_documents({})
        total_orders = await db.orders.count_documents({})
        pending_reviews = await db.reviews.count_documents({"approved": False})
        total_products = await db.products.count_documents({})
        
        # Calculate total revenue
        orders = await db.orders.find({}).to_list(1000)
        total_revenue = sum(order.get("total_amount", 0) for order in orders)
        
        # Get recent orders (last 10)
        recent_orders_docs = await db.orders.find({}).sort("created_at", -1).limit(10).to_list(10)
        recent_orders = await enrich_orders(recent_orders_docs)
        
        # Top products by real sales (aggregated from order items)
        product_agg = {}
        for order in orders:
            for item in order.get("items", []):
                name = item.get("name", "Unknown")
                qty = item.get("quantity", 1) or 1
                price = item.get("price", 0) or 0
                if name not in product_agg:
                    product_agg[name] = {"name": name, "sales": 0, "revenue": 0}
                product_agg[name]["sales"] += qty
                product_agg[name]["revenue"] += price * qty
        top_products = sorted(product_agg.values(), key=lambda p: p["revenue"], reverse=True)[:5]
        
        return {
            "total_users": total_users,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "pending_reviews": pending_reviews,
            "total_products": total_products,
            "recent_orders": recent_orders,
            "top_products": top_products
        }
    except Exception as e:
        logger.error(f"Admin stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch admin statistics")

@api_router.get("/admin/reviews")
async def get_admin_reviews(status: str = "all", limit: int = 50, admin=Depends(require_admin)):
    """Get reviews for admin management"""
    try:
        filter_query = {}
        if status == "pending":
            filter_query["approved"] = False
        elif status == "approved":
            filter_query["approved"] = True
        
        reviews = await db.reviews.find(filter_query).sort("created_at", -1).limit(limit).to_list(limit)
        return {"reviews": [Review(**review) for review in reviews]}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@api_router.put("/admin/reviews/{review_id}/approve")
async def approve_review(review_id: str, approved: bool, admin=Depends(require_admin)):
    """Approve or reject a review"""
    try:
        result = await db.reviews.update_one(
            {"id": review_id},
            {"$set": {"approved": approved}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"success": True, "approved": approved}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin review approve error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update review")

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, admin=Depends(require_admin)):
    """Delete a review"""
    try:
        result = await db.reviews.delete_one({"id": review_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"success": True, "deleted": True}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete review")

@api_router.get("/admin/orders")
async def get_admin_orders(status: str = "all", limit: int = 100, admin=Depends(require_admin)):
    """Get orders for admin management"""
    try:
        filter_query = {}
        if status != "all":
            filter_query["status"] = status
        
        orders = await db.orders.find(filter_query).sort("created_at", -1).limit(limit).to_list(limit)
        return {"orders": await enrich_orders(orders)}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch orders")

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, admin=Depends(require_admin)):
    """Update order status"""
    valid_statuses = ["pending", "processing", "completed", "cancelled", "refunded"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        result = await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"success": True, "status": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin order status update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update order status")

@api_router.get("/admin/users")
async def get_admin_users(limit: int = 100, admin=Depends(require_admin)):
    """Get users for admin management"""
    try:
        users = await db.users.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        return {"users": [User(**user) for user in users]}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch users")

class WalletAdjustRequest(BaseModel):
    amount: float
    type: str  # 'credit' or 'debit'
    reason: str


@api_router.post("/admin/users/{user_id}/wallet/adjust")
async def admin_adjust_wallet(user_id: str, req: WalletAdjustRequest, admin=Depends(require_admin)):
    """Admin manually credits or deducts a user's wallet. Reason is mandatory (audit trail)."""
    if req.type not in ("credit", "debit"):
        raise HTTPException(status_code=400, detail="type must be 'credit' or 'debit'")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be greater than 0")
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=400, detail="A reason/note is required for every adjustment")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    current_balance = user.get("wallet_balance", 0.0)
    if req.type == "debit" and req.amount > current_balance:
        raise HTTPException(status_code=400, detail="Cannot deduct more than the current balance")
    new_balance = current_balance + req.amount if req.type == "credit" else current_balance - req.amount
    await db.users.update_one({"id": user_id}, {"$set": {"wallet_balance": new_balance}})
    transaction = WalletTransaction(
        user_id=user_id,
        type=req.type,
        amount=req.amount,
        description=f"Admin {req.type}: {req.reason.strip()}",
        category="admin_adjustment",
        balance_after=new_balance,
    )
    await db.wallet_transactions.insert_one(transaction.dict())
    return {"success": True, "new_balance": new_balance, "transaction_id": transaction.id}


class AdminPasswordResetRequest(BaseModel):
    new_password: Optional[str] = None  # if omitted, a secure temporary password is generated
    reason: Optional[str] = None
    force_change: bool = False  # require the user to set a new password on next login


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, req: AdminPasswordResetRequest, admin=Depends(require_admin)):
    """Admin-initiated password reset (no email channel).
    If new_password is provided it is set directly; otherwise a secure temporary
    password is generated and returned to the admin to share with the user.
    When force_change is true, the user must change their password on next login.
    Every reset is recorded in admin_audit_log."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    generated = False
    if req.new_password:
        new_password = req.new_password
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        if len(new_password.encode("utf-8")) > 72:
            raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")
    else:
        new_password = _generate_temp_password()
        generated = True

    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": hash_password(new_password),
            "password_reset_at": datetime.now(timezone.utc).isoformat(),
            "must_change_password": bool(req.force_change),
        }},
    )

    audit_entry = {
        "id": str(uuid.uuid4()),
        "action": "password_reset",
        "actor": admin.get("sub") or admin.get("username") or "admin",
        "target_user_id": user_id,
        "target_user_email": user.get("email", ""),
        "generated": generated,
        "force_change": bool(req.force_change),
        "reason": (req.reason or "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_audit_log.insert_one(audit_entry)

    return {
        "success": True,
        "generated": generated,
        "force_change": bool(req.force_change),
        # temporary password is only returned when auto-generated, so the admin can relay it
        "temporary_password": new_password if generated else None,
        "message": "Password reset successfully. Share the temporary password with the user." if generated
        else "Password updated successfully.",
    }


@api_router.get("/admin/audit-log")
async def get_admin_audit_log(limit: int = 50, admin=Depends(require_admin)):
    """Recent admin audit entries (most recent first)."""
    entries = await db.admin_audit_log.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"entries": entries}


@api_router.get("/admin/ai-usage")
async def get_ai_usage(admin=Depends(require_admin)):
    """Gemini AI usage stats: today's calls, cache-hit rate, totals and per-feature breakdown."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    async def counts(match: dict) -> dict:
        pipeline = [{"$match": match}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
        rows = await db.ai_usage_log.aggregate(pipeline).to_list(100)
        d = {r["_id"]: r["n"] for r in rows}
        return {"live": d.get("live", 0), "cache_hit": d.get("cache_hit", 0), "error": d.get("error", 0)}

    today_counts = await counts({"date": today})
    total_counts = await counts({})

    # per-feature breakdown for today
    feat_pipeline = [
        {"$match": {"date": today}},
        {"$group": {"_id": {"feature": "$feature", "status": "$status"}, "n": {"$sum": 1}}},
    ]
    feat_rows = await db.ai_usage_log.aggregate(feat_pipeline).to_list(200)
    by_feature: dict = {}
    for r in feat_rows:
        f = r["_id"]["feature"]
        s = r["_id"]["status"]
        by_feature.setdefault(f, {"live": 0, "cache_hit": 0, "error": 0})[s] = r["n"]

    # 7-day daily trend (oldest -> newest), zero-filled
    now_dt = datetime.now(timezone.utc)
    last7 = [(now_dt - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    daily_pipeline = [
        {"$match": {"date": {"$in": last7}}},
        {"$group": {"_id": {"date": "$date", "status": "$status"}, "n": {"$sum": 1}}},
    ]
    daily_rows = await db.ai_usage_log.aggregate(daily_pipeline).to_list(500)
    daily_map = {d: {"live": 0, "cache_hit": 0, "error": 0} for d in last7}
    for r in daily_rows:
        d = r["_id"]["date"]
        s = r["_id"]["status"]
        if d in daily_map:
            daily_map[d][s] = r["n"]
    daily_7d = [
        {
            "date": d,
            "live": daily_map[d]["live"],
            "cache_hit": daily_map[d]["cache_hit"],
            "error": daily_map[d]["error"],
            "total": daily_map[d]["live"] + daily_map[d]["cache_hit"],
        }
        for d in last7
    ]

    def cache_rate(c: dict) -> float:
        served = c["live"] + c["cache_hit"]
        return round(100 * c["cache_hit"] / served, 1) if served else 0.0

    return {
        "ai_configured": gemini_available(),
        "today": {
            **today_counts,
            "total_calls": today_counts["live"] + today_counts["cache_hit"],
            "cache_hit_rate": cache_rate(today_counts),
        },
        "all_time": {
            **total_counts,
            "total_calls": total_counts["live"] + total_counts["cache_hit"],
            "cache_hit_rate": cache_rate(total_counts),
        },
        "by_feature_today": by_feature,
        "daily_7d": daily_7d,
    }


@api_router.post("/admin/products", response_model=Product)
async def create_product_admin(product: ProductCreate, admin=Depends(require_admin)):
    """Create a new product (admin only)."""
    data = {k: v for k, v in product.dict().items() if v is not None}
    if not data.get("slug"):
        data["slug"] = _slugify(data.get("name", ""))
    product_obj = Product(**data)
    if not product_obj.media.primary_image:
        product_obj.media.primary_image = product_obj.image_url
    await db.products.insert_one(product_obj.dict())
    return product_obj


class GenerateDescriptionRequest(BaseModel):
    name: str
    category: Optional[str] = "gift"


@api_router.post("/admin/products/generate-description")
async def generate_product_description(req: GenerateDescriptionRequest, admin=Depends(require_admin)):
    """Generate an SEO-friendly product description with Gemini (admin only)."""
    if not gemini_available():
        raise HTTPException(status_code=503, detail="AI is not configured. Add GEMINI_API_KEY to enable this feature.")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Product name is required")
    prompt = (
        "Write an SEO-friendly e-commerce product description (60-90 words) for a product at "
        "Memories Photo Frames & Custom Gift Shop (Coimbatore, India).\n"
        f"Product name: {req.name}\nCategory: {req.category}\n"
        "Tone: warm, premium, gift-focused. Mention personalization/customization and quality "
        "craftsmanship. Plain text only — no markdown headings, no surrounding quotes."
    )
    text = await gemini_generate(prompt, max_tokens=300, temperature=0.8)
    if not text:
        await record_ai_usage("product_description", "error")
        raise HTTPException(status_code=502, detail="Could not generate a description right now. Please try again.")
    await record_ai_usage("product_description", "live")
    return {"description": text}


@api_router.put("/admin/products/{product_id}")
async def update_product_admin(product_id: str, product_update: dict, admin=Depends(require_admin)):
    """Update product (admin only)"""
    try:
        product_update.pop("id", None)
        # Keep slug in sync when the name changes and no explicit slug provided
        if product_update.get("name") and not product_update.get("slug"):
            product_update["slug"] = _slugify(product_update["name"])
        result = await db.products.update_one(
            {"id": product_id},
            {"$set": product_update}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"success": True, "updated": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update product")

@api_router.delete("/admin/products/{product_id}")
async def delete_product_admin(product_id: str, admin=Depends(require_admin)):
    """Delete product (admin only)"""
    try:
        result = await db.products.delete_one({"id": product_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"success": True, "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin product delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete product")


# ============================ CMS Content Management Endpoints ============================
CMS_DEFAULT_HOME = {"hero_title": "", "hero_subtitle": "", "hero_image_url": ""}
CMS_DEFAULT_ANNOUNCEMENT = {"announcement_text": "", "popup_description": "", "popup_image_url": "", "popup_enabled": True}


def _cms_clean(data: dict, allowed: set) -> dict:
    return {k: data.get(k) for k in allowed if k in data}


@api_router.get("/admin/cms")
async def admin_get_cms(admin=Depends(require_admin)):
    offers = await db.cms_offers.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


@api_router.post("/admin/cms/offers")
async def admin_create_cms_offer(payload: dict, admin=Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    title = str(payload.get("title", "")).strip()
    if not title:
        raise HTTPException(status_code=400, detail="Offer title is required")
    offer = {"id": str(uuid.uuid4()), **_cms_clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"}), "created_at": now, "updated_at": now}
    await db.cms_offers.insert_one(offer)
    offer.pop("_id", None)
    return {"success": True, "offer": offer}


@api_router.put("/admin/cms/offers/{offer_id}")
async def admin_update_cms_offer(offer_id: str, payload: dict, admin=Depends(require_admin)):
    update = _cms_clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"})
    if "title" in update and not str(update["title"]).strip():
        raise HTTPException(status_code=400, detail="Offer title is required")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.cms_offers.update_one({"id": offer_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


@api_router.delete("/admin/cms/offers/{offer_id}")
async def admin_delete_cms_offer(offer_id: str, admin=Depends(require_admin)):
    result = await db.cms_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


@api_router.put("/admin/cms/homepage")
async def admin_save_cms_homepage(payload: dict, admin=Depends(require_admin)):
    data = _cms_clean(payload, set(CMS_DEFAULT_HOME))
    data.update({"key": "homepage", "updated_at": datetime.now(timezone.utc).isoformat()})
    await db.cms_content.update_one({"key": "homepage"}, {"$set": data}, upsert=True)
    return {"success": True, "homepage": data}


@api_router.put("/admin/cms/announcement")
async def admin_save_cms_announcement(payload: dict, admin=Depends(require_admin)):
    data = _cms_clean(payload, set(CMS_DEFAULT_ANNOUNCEMENT))
    data.update({"key": "announcement", "updated_at": datetime.now(timezone.utc).isoformat()})
    await db.cms_content.update_one({"key": "announcement"}, {"$set": data}, upsert=True)
    return {"success": True, "announcement": data}


@api_router.get("/cms")
async def get_public_cms():
    now = datetime.now(timezone.utc)
    raw_offers = await db.cms_offers.find({"active": True}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    offers = []
    for item in raw_offers:
        try:
            start = datetime.fromisoformat(item["starts_at"].replace("Z", "+00:00")) if item.get("starts_at") else None
            end = datetime.fromisoformat(item["ends_at"].replace("Z", "+00:00")) if item.get("ends_at") else None
            if start and start > now: continue
            if end and end < now: continue
        except (ValueError, TypeError):
            pass
        offers.append(item)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


# Include the router in the main app
app.include_router(api_router)

_cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
app.add_middleware(
    CORSMiddleware,
    # Auth uses Bearer tokens (not cookies). '*' origins are invalid combined with
    # credentials, so only enable credentials when explicit origins are configured.
    allow_credentials=_cors_origins != ['*'],
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_seed_admin():
    """Seed the admin account (bcrypt-hashed) from env on startup."""
    try:
        username = os.environ.get("ADMIN_USERNAME", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "")
        if not username or not password:
            logger.error("ADMIN_USERNAME and ADMIN_PASSWORD must be configured; refusing to seed an admin with insecure defaults")
            return
        existing = await db.admins.find_one({"username": username})
        if not existing:
            await db.admins.insert_one({
                "id": "admin_001",
                "username": username,
                "email": "admin@memories.com",
                "password_hash": hash_password(password),
                "role": "super_admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Seeded admin account: {username}")
        elif not verify_password(password, existing.get("password_hash", "")):
            await db.admins.update_one(
                {"username": username},
                {"$set": {"password_hash": hash_password(password)}},
            )
            logger.info(f"Updated admin password for: {username}")
    except Exception as e:
        logger.error(f"Admin seed error: {e}")


@app.on_event("startup")
async def startup_create_indexes():
    """Create indexes defensively; never crash startup on an unexpected data state."""
    try:
        # users.email: unique only if there are no existing duplicates
        dupes = await db.users.aggregate(
            [{"$group": {"_id": "$email", "n": {"$sum": 1}}}, {"$match": {"n": {"$gt": 1}}}]
        ).to_list(1)
        try:
            if dupes:
                logger.warning("Duplicate user emails present; creating NON-unique email index.")
                await db.users.create_index("email")
            else:
                await db.users.create_index("email", unique=True)
        except Exception as e:
            logger.error(f"users.email index error: {e}")

        for coll, field in [
            (db.users, "id"),
            (db.products, "id"),
            (db.products, "category"),
            (db.products, "slug"),
            (db.orders, "id"),
            (db.orders, "user_id"),
            (db.orders, "created_at"),
            (db.orders, "payment_status"),
            (db.orders, "order_status"),
            (db.wallet_transactions, "user_id"),
            (db.user_photos, "user_id"),
            (db.designs, "user_id"),
            (db.reviews, "approved"),
            (db.reviews, "product_id"),
            (db.ai_usage_log, "date"),
            (db.admin_audit_log, "created_at"),
        ]:
            try:
                await coll.create_index(field)
            except Exception as e:
                logger.error(f"index error ({field}): {e}")

        try:
            await db.chat_sessions.create_index("session_id", unique=True)
        except Exception as e:
            logger.error(f"chat_sessions index error: {e}")
        try:
            await db.chat_sessions.create_index("user_id")
        except Exception as e:
            logger.error(f"chat_sessions user_id index error: {e}")
        try:
            await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
            await db.password_reset_tokens.create_index("email")
        except Exception as e:
            logger.error(f"password_reset_tokens index error: {e}")
    except Exception as e:
        logger.error(f"Index creation error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
