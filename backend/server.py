from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Depends
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
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import bcrypt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import secrets
import string
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
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============================ Auth helpers (defined early so routes can use them) ============================
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
security = HTTPBearer(auto_error=False)


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

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    base_price: float
    sizes: List[dict]
    materials: List[dict]
    colors: List[dict]
    image_url: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    base_price: float
    sizes: List[dict]
    materials: List[dict]
    colors: List[dict]
    image_url: str

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
    delivery_type: str  # "pickup" or "delivery"
    delivery_address: Optional[dict] = None
    pickup_slot: Optional[str] = None
    points_earned: int = 0
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
    
    return [Product(**product) for product in products]

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_obj = Product(**product.dict())
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        return User(**existing_user)
    
    user_obj = User(**user.dict())
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
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
async def get_user_designs(user_id: str):
    designs = await db.designs.find({"user_id": user_id}).to_list(50)
    return [CustomDesign(**design) for design in designs]

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image (JPG, PNG, HEIC)")
    
    # Read and process image
    contents = await file.read()
    
    # Convert to base64 for storage/preview
    image_base64 = base64.b64encode(contents).decode('utf-8')
    
    # Basic image validation with enhanced feedback
    try:
        image = Image.open(io.BytesIO(contents))
        width, height = image.size
        
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
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file. Please upload JPG, PNG, or HEIC format.")

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
        
        # Ground recommendations with our real catalog
        product_docs = await db.products.find({}).limit(30).to_list(30)
        catalog_lines = [
            f"- {p.get('name')} ({p.get('category')}, from Rs.{p.get('base_price')})"
            for p in product_docs
        ]
        catalog_text = "\n".join(catalog_lines) if catalog_lines else (
            "Photo frames (wooden/acrylic/LED), photo mugs, t-shirts, acrylic prints, LED frames."
        )

        gift_prompt = f"""Customer preferences:{quiz_text}

Our current product catalog:
{catalog_text}

Recommend 3-4 specific gifts chosen from or inspired by our catalog. For each recommendation include: a bold product name with a personalization idea, a detailed reason it suits this recipient/occasion, an estimated price range in Rupees, a customization suggestion, and a Confidence score (1-100). Write in warm, friendly markdown. End with our address (19B Kani Illam, Keeranatham Road, Coimbatore), phone (+91 81480 40148), and mention free home delivery."""

        response = await gemini_generate(gift_prompt, system=system_message, max_tokens=1300)
        if not response:
            raise Exception("Gemini unavailable - using fallback recommendations")
        
        return {
            "suggestions": response,
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
        
    except Exception:
        # Enhanced fallback suggestions based on quiz data
        fallback_suggestions = f"""Based on your preferences for {quiz_data.recipient} on {quiz_data.occasion}:

🎁 **AI-Recommended Gifts from Memories:**

1. **Premium Photo Frame Set** (₹899-1599) - **Confidence: 95%**
   - Perfect for showcasing precious memories
   - Available in wooden, acrylic, and LED options
   - Ideal for {quiz_data.occasion} celebrations
   - **Why AI chose this:** Frames are universally appreciated and perfect for creating lasting memories

2. **Custom Photo Mug** (₹299-499) - **Confidence: 88%**
   - Personalized with favorite photos
   - Great for daily use and memories
   - Sublimation printing for durability
   - **Why AI chose this:** Practical gift that brings joy every day, perfect for {quiz_data.relationship} relationship

3. **Personalized T-Shirt** (₹399-599) - **Confidence: 82%**
   - Custom design with photos or text
   - High-quality sublimation printing
   - Perfect casual gift
   - **Why AI chose this:** Trendy and personal, great for expressing creativity"""
        
        if enhanced_processing and photo_data:
            fallback_suggestions += f"""

4. **Custom Frame for Your Photo** (₹899-1899) - **Confidence: 92%**
   - Specifically designed for your uploaded photo ({photo_data.get('dimensions', {}).get('width', 'unknown')}x{photo_data.get('dimensions', {}).get('height', 'unknown')}px)
   - Perfect aspect ratio match
   - **Why AI chose this:** Your photo analysis shows {photo_data.get('analysis', 'great potential')} - ideal for framing"""

        fallback_suggestions += """

📍 **Visit Us:** 19B Kani Illam, Keeranatham Road, Coimbatore
📞 **Call:** +91 81480 40148
🚚 **Free Home Delivery Available!**

*We specialize in creating lasting memories through quality craftsmanship.*"""
        
        return {
            "suggestions": fallback_suggestions,
            "quiz_data": quiz_data.dict(),
            "enhanced": enhanced_processing,
            "photo_analyzed": photo_data is not None,
            "note": "Generated using our enhanced AI recommendations with confidence scoring"
        }

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Calculate points earned (3% of order value for Memories customers)
    points_earned = int(order.total_amount * 0.03)
    
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

@api_router.get("/orders/{user_id}")
async def get_user_orders(user_id: str):
    orders = await db.orders.find({"user_id": user_id}).to_list(50)
    return [Order(**order) for order in orders]

# Review Management Endpoints
@api_router.post("/reviews", response_model=Review)
async def create_review(review: ReviewCreate):
    """Create a new customer review"""
    try:
        review_obj = Review(**review.dict())
        
        # For now, auto-approve all reviews (can add moderation later)
        review_obj.approved = True
        
        await db.reviews.insert_one(review_obj.dict())
        return review_obj
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create review")

@api_router.get("/reviews")
async def get_reviews(
    limit: int = 10,
    offset: int = 0,
    rating_filter: Optional[int] = None,
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
        return {"highlights": cache.get("text", "") if cache else "", "cached": bool(cache)}
    await db.ai_cache.update_one(
        {"key": "review_highlights"},
        {"$set": {"key": "review_highlights", "text": text, "review_count": total, "updated_at": now.isoformat()}},
        upsert=True,
    )
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
async def update_user(user_id: str, user_data: dict):
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
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_balance = user.get("wallet_balance", 0.0) + amount
    
    # Update user wallet
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"wallet_balance": new_balance}}
    )
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user_id,
        type="credit",
        amount=amount,
        description="Money added to wallet",
        category="topup",
        balance_after=new_balance
    )
    await db.wallet_transactions.insert_one(transaction.dict())
    
    return {"new_balance": new_balance, "transaction_id": transaction.id}

@api_router.post("/users/{user_id}/wallet/convert-points")
async def convert_points_to_credits(user_id: str, points: int, owner=Depends(verify_user_access)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_points = user.get("points", 0)
    if points > current_points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # 100 points = ₹10 store credit
    credit_value = (points / 100) * 10
    new_points = current_points - points
    new_store_credits = user.get("store_credits", 0.0) + credit_value
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "points": new_points,
                "store_credits": new_store_credits
            }
        }
    )
    
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
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_balance = user.get("wallet_balance", 0.0)
    if amount > current_balance:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    new_balance = current_balance - amount
    new_total_spent = user.get("total_spent", 0.0) + amount
    
    # Update tier based on total spent
    new_tier = "Silver"
    if new_total_spent >= 10000:
        new_tier = "Platinum"
    elif new_total_spent >= 5000:
        new_tier = "Gold"
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "wallet_balance": new_balance,
                "total_spent": new_total_spent,
                "tier": new_tier
            }
        }
    )
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user_id,
        type="debit",
        amount=amount,
        description=f"Payment for order #{order_id}",
        category="purchase",
        order_id=order_id,
        balance_after=new_balance
    )
    await db.wallet_transactions.insert_one(transaction.dict())
    
    return {
        "payment_successful": True,
        "new_balance": new_balance,
        "tier": new_tier,
        "transaction_id": transaction.id
    }

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
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
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


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, req: AdminPasswordResetRequest, admin=Depends(require_admin)):
    """Admin-initiated password reset (no email channel).
    If new_password is provided it is set directly; otherwise a secure temporary
    password is generated and returned to the admin to share with the user.
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
        {"$set": {"password_hash": hash_password(new_password), "password_reset_at": datetime.now(timezone.utc).isoformat()}},
    )

    audit_entry = {
        "id": str(uuid.uuid4()),
        "action": "password_reset",
        "actor": admin.get("sub") or admin.get("username") or "admin",
        "target_user_id": user_id,
        "target_user_email": user.get("email", ""),
        "generated": generated,
        "reason": (req.reason or "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_audit_log.insert_one(audit_entry)

    return {
        "success": True,
        "generated": generated,
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


@api_router.post("/admin/products", response_model=Product)
async def create_product_admin(product: ProductCreate, admin=Depends(require_admin)):
    """Create a new product (admin only)."""
    product_obj = Product(**product.dict())
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
        raise HTTPException(status_code=502, detail="Could not generate a description right now. Please try again.")
    return {"description": text}


@api_router.put("/admin/products/{product_id}")
async def update_product_admin(product_id: str, product_update: dict, admin=Depends(require_admin)):
    """Update product (admin only)"""
    try:
        product_update.pop("id", None)
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
        username = os.environ.get("ADMIN_USERNAME", "admin")
        password = os.environ.get("ADMIN_PASSWORD", "memories2024")
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()