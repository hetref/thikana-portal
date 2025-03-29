from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from firebase_admin import credentials, firestore, initialize_app
from typing import List, Dict, Tuple, Optional
from collections import Counter
import random
import uvicorn
import json
import math
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
import hashlib
import base64
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle Firebase DatetimeWithNanoseconds
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'timestamp'):
            # Convert any datetime-like object to ISO format string
            return obj.isoformat()
        return super().default(obj)

# Helper function to safely get timestamp values
def get_timestamp_value(created_at):
    """
    Safely get timestamp value from createdAt field which could be either:
    - Firebase Timestamp object with timestamp() method
    - String in the format "March 26, 2025 at 6:41:41 PM UTC+5:30"
    - Datetime object
    Returns a numeric timestamp value for sorting or -1 if parsing fails
    """
    try:
        if hasattr(created_at, 'timestamp'):
            # If it's a datetime or Firestore Timestamp object
            return created_at.timestamp()
        elif isinstance(created_at, str):
            # Try to parse string date in the format: "March 26, 2025 at 6:41:41 PM UTC+5:30"
            # Note: This is a simplified parser that assumes the format is consistent
            date_parts = created_at.split(" at ")
            if len(date_parts) == 2:
                date_str = date_parts[0]
                time_str = date_parts[1].split(" UTC")[0]
                dt_str = f"{date_str} {time_str}"
                dt = datetime.strptime(dt_str, "%B %d, %Y %I:%M:%S %p")
                return dt.timestamp()
        return -1  # Default value for sorting (oldest)
    except Exception as e:
        logger.error(f"Error parsing timestamp: {str(e)} - Value: {created_at}")
        return -1  # Default value for sorting (oldest)

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://thikana-portal.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
initialize_app(cred)
db = firestore.client()

# Define base32 alphabet for geohash encoding
base32 = '0123456789bcdefghjkmnpqrstuvwxyz'

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the Haversine distance between two points in kilometers
    """
    # Radius of the Earth in kilometers
    R = 6371.0
    
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Differences in coordinates
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    # Haversine formula
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return distance

def encode_geohash(lat: float, lon: float, precision: int = 6) -> str:
    """Encode latitude and longitude into a geohash string with reduced precision."""
    lat_range = (-90.0, 90.0)
    lon_range = (-180.0, 180.0)
    
    geohash = ""
    bits = 0
    ch = 0
    even = True
    
    while len(geohash) < precision:
        if even:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon > mid:
                ch |= 1 << (4 - bits)
                lon_range = (mid, lon_range[1])
            else:
                lon_range = (lon_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat > mid:
                ch |= 1 << (4 - bits)
                lat_range = (mid, lat_range[1])
            else:
                lat_range = (lat_range[0], mid)
        
        even = not even
        bits += 1
        
        if bits == 5:
            geohash += base32[ch]
            bits = 0
            ch = 0
    
    return geohash

def get_geohash_neighbors(geohash: str) -> List[str]:
    """Get all neighboring geohash cells."""
    neighbors = []
    directions = {
        'n': ['p', 'r', 'x', 'z'],
        's': ['b', 'c', 'f', 'g'],
        'e': ['u', 'v', 'y', 'z'],
        'w': ['8', '9', 'd', 'e']
    }
    
    for direction, chars in directions.items():
        for char in chars:
            neighbor = geohash[:-1] + char
            neighbors.append(neighbor)
    
    return neighbors

class RecommendationEngine:
    def __init__(self):
        self.FOLLOWED_POSTS_WEIGHT = 0.3
        self.PREFERRED_TYPE_WEIGHT = 0.3
        self.LOCATION_WEIGHT = 0.3
        self.RANDOM_POSTS_WEIGHT = 0.1

    async def get_user_preferences(self, user_id: str) -> Tuple[List[str], List[str]]:
        """Get user's business type preferences and followed businesses."""
        user_doc = await self.get_user_data(user_id)
        
        # Get business preferences with counts
        preferences = Counter(user_doc.get("businessPreferences", []))
        
        # Get followed businesses
        following_ref = db.collection("users").document(user_id).collection("following")
        following = [doc.id for doc in following_ref.stream()]
        
        # OPTIMIZE: Batch fetch business types for followed businesses instead of one by one
        followed_types = []
        if following:
            # Use a batched get for all followed businesses
            batch_size = 10  # Firestore allows max 10 items in a single 'in' query
            followed_business_types = {}
            
            for i in range(0, len(following), batch_size):
                batch_ids = following[i:i+batch_size]
                business_query = db.collection("users").where("__name__", "in", batch_ids)
                batch_docs = list(business_query.stream())
                
                for doc in batch_docs:
                    business_data = doc.to_dict()
                    if business_data and "businessType" in business_data:
                        followed_types.append(business_data["businessType"])
        
        # Combine and weight preferences
        all_preferences = list(preferences.elements()) + followed_types
        weighted_preferences = Counter(all_preferences).most_common()
        
        return ([pref for pref, _ in weighted_preferences], following)

    async def get_user_data(self, user_id: str) -> Dict:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        return user_doc.to_dict()

    async def get_followed_business_posts(self, following: List[str], limit: int, user_id: str = None) -> List[Dict]:
        if not following:
            return []

        posts_query = (
            db.collection("posts")
            .where(filter=firestore.FieldFilter("uid", "in", following))
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit * 2)  # Fetch more to allow for filtering
        )
        
        posts = [doc.to_dict() | {"id": doc.id} for doc in posts_query.stream()]
        
        # Filter out user's own posts if user_id is provided
        if user_id:
            posts = [post for post in posts if post.get("uid") != user_id]
        
        return posts[:limit]

    async def get_preferred_business_posts(self, preferred_types: List[str], limit: int, exclude_ids: List[str], user_id: str = None) -> List[Dict]:
        if not preferred_types:
            return []

        posts_query = (
            db.collection("posts")
            .where(filter=firestore.FieldFilter("businessType", "in", preferred_types[:3]))
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit * 3)  # Fetch more to allow for filtering
        )
        
        posts = [doc.to_dict() | {"id": doc.id} for doc in posts_query.stream()]
        weighted_posts = []
        
        for post in posts:
            # Skip if post is in exclude_ids or belongs to the current user
            if post["id"] not in exclude_ids and (user_id is None or post.get("uid") != user_id):
                try:
                    preference_index = preferred_types.index(post["businessType"])
                    weight = 1 / (preference_index + 1)
                    weighted_posts.append((post, weight))
                except ValueError:
                    weighted_posts.append((post, 0))
        
        weighted_posts.sort(key=lambda x: (-x[1], -get_timestamp_value(x[0]["createdAt"])))
        return [post for post, _ in weighted_posts[:limit]]

    async def get_nearby_business_posts(self, user_location: Dict, limit: int, exclude_ids: List[str], user_id: str = None) -> List[Dict]:
        logger.info(f"Getting nearby posts for location: {user_location}")
        if not user_location or not user_location.get("latitude") or not user_location.get("longitude"):
            return []
        
        try:
            user_geohash = encode_geohash(
                user_location["latitude"],
                user_location["longitude"],
                precision=6
            )
            logger.info(f"User geohash: {user_geohash}")
            
            # Get neighboring geohashes
            neighbor_geohashes = get_geohash_neighbors(user_geohash)
            all_geohashes = [user_geohash] + neighbor_geohashes
            
            # Query location index for businesses in these geohashes
            business_ids = set()
            for geohash in all_geohashes:
                doc = db.collection("location_index").document(geohash).get()
                if doc.exists:
                    business_ids.update(doc.to_dict().get("business_ids", []))
            
            if not business_ids:
                return []
            
            # Exclude current user's business
            if user_id in business_ids:
                business_ids.remove(user_id)
                
            if not business_ids:
                return []
                
            # OPTIMIZATION: Batch fetch business data and user data
            businesses_with_posts = []
            
            # Calculate date threshold (5 days ago)
            recent_threshold = datetime.now() - timedelta(days=5)
            recent_threshold_ts = recent_threshold.timestamp()
            
            # Fetch all businesses data in batch
            batch_size = 10  # Firestore allows up to 10 items in 'in' queries
            business_data_map = {}
            
            for i in range(0, len(list(business_ids)), batch_size):
                batch_ids = list(business_ids)[i:i+batch_size]
                business_query = db.collection("businesses").where("__name__", "in", batch_ids)
                for doc in business_query.stream():
                    business_data = doc.to_dict()
                    if business_data and "location" in business_data:
                        business_data_map[doc.id] = business_data
            
            # Fetch all business user data in batch to get plan info
            user_data_map = {}
            valid_business_ids = list(business_data_map.keys())
            
            for i in range(0, len(valid_business_ids), batch_size):
                batch_ids = valid_business_ids[i:i+batch_size]
                user_query = db.collection("users").where("__name__", "in", batch_ids)
                for doc in user_query.stream():
                    user_data = doc.to_dict()
                    if user_data:
                        user_data_map[doc.id] = user_data
            
            # Process businesses and fetch posts
            for business_id in valid_business_ids:
                business_data = business_data_map.get(business_id)
                user_data = user_data_map.get(business_id)
                
                if not business_data or not user_data:
                    continue
                
                # Calculate distance
                distance = calculate_distance(
                    user_location["latitude"],
                    user_location["longitude"],
                    business_data["location"]["latitude"],
                    business_data["location"]["longitude"]
                )
                
                # Get plan info
                plan = user_data.get("plan", "free")
                
                # Check if within plan's radius limit
                radius_limit = {
                    "free": 2,
                    "standard": 4,
                    "premium": 8
                }.get(plan, 2)
                
                if distance <= radius_limit:
                    # Get recent posts from this business - this query is necessary for each business
                    business_posts = await db.collection("posts").where(
                        "uid", "==", business_id
                    ).order_by(
                        "createdAt", direction=firestore.Query.DESCENDING
                    ).limit(10).get()  # Get more to allow filtering
                    
                    # Separate recent and older posts for this business
                    business_recent_posts = []
                    business_older_posts = []
                    
                    for doc in business_posts:
                        if doc.id not in exclude_ids:
                            post_data = doc.to_dict()
                            post_data["id"] = doc.id
                            post_data["distance_km"] = round(distance, 1)
                            post_data["recommendation_type"] = "location"
                            post_data["business_plan"] = plan
                            # For better client-side performance, include author data
                            post_data["author"] = {
                                "businessName": user_data.get("businessName", ""),
                                "username": user_data.get("username", ""),
                                "profilePic": user_data.get("profilePic", "")
                            }
                            
                            # Check if post is recent (within 5 days)
                            post_date = post_data.get("createdAt")
                            post_ts = get_timestamp_value(post_date)
                            if post_date and post_ts >= recent_threshold_ts:
                                business_recent_posts.append(post_data)
                            else:
                                business_older_posts.append(post_data)
                    
                    # Only add business to the list if it has any posts
                    if business_recent_posts or business_older_posts:
                        businesses_with_posts.append({
                            "business_id": business_id, 
                            "distance": distance,
                            "plan": plan,
                            "recent_posts": business_recent_posts,
                            "older_posts": business_older_posts
                        })
            
            # Sort businesses by distance (closest first) and plan priority
            businesses_with_posts.sort(key=lambda x: (
                x["distance"],
                {"premium": 0, "standard": 1, "free": 2}.get(x["plan"], 3)
            ))
            
            # Build final posts list ensuring diversity
            posts_per_business = 3  # Maximum posts to show from a single business
            final_posts = []
            
            # Sort each business's recent posts by recency
            for business in businesses_with_posts:
                business["recent_posts"].sort(key=lambda x: -get_timestamp_value(x["createdAt"]))
                business["older_posts"].sort(key=lambda x: -get_timestamp_value(x["createdAt"]))
            
            # IMPROVED ROUND-ROBIN APPROACH:
            # First, collect up to posts_per_business recent posts from each business in a round-robin fashion
            # This ensures we get multiple posts from each business, not just the latest one
            for i in range(posts_per_business):
                for business in businesses_with_posts:
                    if i < len(business["recent_posts"]):
                        final_posts.append(business["recent_posts"][i])
            
            # Then, if needed, collect older posts but only from businesses with no recent posts
            if len(final_posts) < limit * 2:  # Collect more than needed to allow filtering later
                for business in businesses_with_posts:
                    if not business["recent_posts"] and business["older_posts"]:
                        final_posts.extend(business["older_posts"][:posts_per_business])
            
            # Now sort the final posts by distance, plan priority, and recency
            final_posts.sort(key=lambda x: (
                x.get("distance_km", float('inf')),
                {"premium": 0, "standard": 1, "free": 2}.get(x.get("business_plan", "free"), 3),
                -get_timestamp_value(x["createdAt"])
            ))
            
            logger.info(f"Found {len(business_ids)} businesses in geohash areas")
            logger.info(f"Returning {len(final_posts[:limit])} posts from {len(businesses_with_posts)} businesses")
            return final_posts[:limit]
            
        except Exception as e:
            logger.error(f"Error in get_nearby_business_posts: {str(e)}")
            return []

    async def get_random_posts(self, limit: int, exclude_ids: List[str], exclude_types: List[str], user_id: str = None) -> List[Dict]:
        posts_query = (
            db.collection("posts")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit * 4)  # Fetch more to allow for filtering
        )
        
        posts = [doc.to_dict() | {"id": doc.id} for doc in posts_query.stream()]
        filtered_posts = [
            post for post in posts 
            if post["id"] not in exclude_ids 
            and post.get("businessType") not in exclude_types
            and (user_id is None or post.get("uid") != user_id)  # Exclude user's own posts
        ]
        
        random.shuffle(filtered_posts)
        return filtered_posts[:limit]

    async def get_recommended_businesses(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recommended businesses for a user to follow based on store locations."""
        try:
            user_data = await self.get_user_data(user_id)
            user_location = user_data.get("location")
            preferred_types, following = await self.get_user_preferences(user_id)
            
            # Get all businesses from the businesses collection
            business_docs = db.collection("businesses").stream()
            businesses = []
            
            for doc in business_docs:
                if doc.id not in following:  # Don't recommend already followed businesses
                    business_data = doc.to_dict()
                    business_data["id"] = doc.id
                    
                    # Calculate business score based on various factors
                    score = 0
                    
                    # Factor 1: Business type matches user preferences
                    if business_data.get("businessType") in preferred_types:
                        preference_index = preferred_types.index(business_data["businessType"])
                        score += 1 / (preference_index + 1)
                    
                    # Factor 2: Store location proximity
                    if (user_location and user_location.get("latitude") and 
                        user_location.get("longitude") and business_data.get("location")):
                        try:
                            distance = calculate_distance(
                                user_location["latitude"],
                                user_location["longitude"],
                                business_data["location"]["latitude"],
                                business_data["location"]["longitude"]
                            )
                            business_data["distance_km"] = round(distance, 1)
                            # Higher score for closer businesses (max 1 point for businesses within 5km)
                            score += max(0, 1 - (distance / 5)) if distance <= 20 else 0
                        except:
                            pass
                    
                    # Factor 3: Business activity (number of posts)
                    posts_query = (
                        db.collection("posts")
                        .where("uid", "==", doc.id)
                        .limit(1)
                    )
                    if len(list(posts_query.stream())) > 0:
                        score += 0.5
                    
                    business_data["score"] = score
                    business_data["recommendation_type"] = (
                        "location" if "distance_km" in business_data
                        else "preferred" if business_data.get("businessType") in preferred_types
                        else "random"
                    )
                    businesses.append(business_data)
            
            # Sort businesses by score and get top recommendations
            businesses.sort(key=lambda x: (-x["score"], x.get("distance_km", float('inf'))))
            
            # Return only necessary fields
            recommended_businesses = []
            for business in businesses[:limit]:
                recommended_businesses.append({
                    "id": business["id"],
                    "name": business.get("businessName", ""),
                    "username": business.get("username", ""),
                    "business_type": business.get("businessType", ""),
                    "distance_km": business.get("distance_km"),
                    "recommendation_type": business["recommendation_type"]
                })
            
            return recommended_businesses
            
        except Exception as e:
            print(f"Error in get_recommended_businesses: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_recommendations(self, user_id: str, limit: int = 10) -> List[Dict]:
        try:
            preferred_types, following = await self.get_user_preferences(user_id)
            
            followed_limit = int(limit * self.FOLLOWED_POSTS_WEIGHT)
            preferred_limit = int(limit * self.PREFERRED_TYPE_WEIGHT)
            random_limit = int(limit * self.RANDOM_POSTS_WEIGHT)
            location_limit = limit - followed_limit - preferred_limit - random_limit
            
            seen_post_ids = set()
            recommendations = []

            if following:
                followed_posts = await self.get_followed_business_posts(following, followed_limit, user_id)
                for post in followed_posts:
                    if post["id"] not in seen_post_ids:
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            if preferred_types:
                preferred_posts = await self.get_preferred_business_posts(
                    preferred_types,
                    preferred_limit,
                    list(seen_post_ids),
                    user_id
                )
                for post in preferred_posts:
                    if post["id"] not in seen_post_ids:
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            remaining_slots = limit - len(recommendations)
            if remaining_slots > 0:
                random_posts = await self.get_random_posts(
                    remaining_slots,
                    list(seen_post_ids),
                    preferred_types[:2] if preferred_types else [],
                    user_id
                )
                recommendations.extend(random_posts)

            segments = len(recommendations) // 3
            if segments > 0:
                for i in range(0, len(recommendations), segments):
                    segment = recommendations[i:i + segments]
                    random.shuffle(segment)
                    recommendations[i:i + segments] = segment

            return recommendations[:limit]
        except Exception as e:
            print(f"Error in get_recommendations: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_combined_recommendations(self, user_id: str, limit: int = 10, user_location: Dict = None) -> List[Dict]:
        """Get recommendations combining location, preferences, and followed businesses."""
        try:
            user_data = await self.get_user_data(user_id)
            user_location = user_location or user_data.get("location")
            preferred_types, following = await self.get_user_preferences(user_id)
            
            # Adjust weights based on whether location is available
            if user_location and user_location.get("latitude") and user_location.get("longitude"):
                # Prioritize location-based recommendations when location is available
                location_limit = int(limit * 0.4)  # 40% for location-based
                followed_limit = int(limit * 0.3)  # 30% for followed
                preferred_limit = int(limit * 0.2)  # 20% for preferred types
                random_limit = limit - location_limit - followed_limit - preferred_limit
            else:
                # Redistribute weights when location is not available
                followed_limit = int(limit * 0.4)
                preferred_limit = int(limit * 0.4)
                location_limit = 0
                random_limit = limit - followed_limit - preferred_limit
            
            seen_post_ids = set()
            recommendations = []

            # 1. Get posts from nearby businesses if location available
            if user_location and user_location.get("latitude") and user_location.get("longitude"):
                nearby_posts = await self.get_nearby_business_posts(
                    user_location,
                    location_limit * 2,  # Get more posts to filter by distance
                    list(seen_post_ids),
                    user_id
                )
                
                # Sort nearby posts by distance and take the closest ones
                nearby_posts.sort(key=lambda x: x.get("distance_km", float('inf')))
                for post in nearby_posts[:location_limit]:
                    if post["id"] not in seen_post_ids:
                        post["recommendation_type"] = "location"
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            # 2. Get posts from followed businesses
            if following:
                followed_posts = await self.get_followed_business_posts(following, followed_limit, user_id)
                for post in followed_posts:
                    if post["id"] not in seen_post_ids:
                        post["recommendation_type"] = "followed"
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            # 3. Get posts from preferred business types
            if preferred_types:
                preferred_posts = await self.get_preferred_business_posts(
                    preferred_types,
                    preferred_limit,
                    list(seen_post_ids),
                    user_id
                )
                
                for post in preferred_posts:
                    if post["id"] not in seen_post_ids:
                        post["recommendation_type"] = "preferred"
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            # 4. Fill remaining slots with random posts
            remaining_slots = limit - len(recommendations)
            if remaining_slots > 0:
                random_posts = await self.get_random_posts(
                    remaining_slots,
                    list(seen_post_ids),
                    preferred_types[:2] if preferred_types else [],
                    user_id
                )
                
                for post in random_posts:
                    if post["id"] not in seen_post_ids:
                        post["recommendation_type"] = "random"
                        recommendations.append(post)
                        seen_post_ids.add(post["id"])

            # Add distance information to all posts where possible
            if user_location and user_location.get("latitude") and user_location.get("longitude"):
                # Get all unique business IDs from the posts
                business_ids = {post.get("uid") for post in recommendations if post.get("uid") != user_id}
                
                # OPTIMIZATION: Batch fetch business data for all posts
                business_locations = {}
                business_data_map = {}
                
                if business_ids:
                    # Batch fetch businesses in groups of 10
                    batch_size = 10
                    for i in range(0, len(list(business_ids)), batch_size):
                        batch_ids = list(business_ids)[i:i+batch_size]
                        # Get locations from businesses collection
                        business_query = db.collection("businesses").where("__name__", "in", batch_ids)
                        for doc in business_query.stream():
                            business_data = doc.to_dict()
                            if business_data and "location" in business_data:
                                business_locations[doc.id] = business_data["location"]
                        
                        # Get business user data for author info
                        user_query = db.collection("users").where("__name__", "in", batch_ids)
                        for doc in user_query.stream():
                            business_data_map[doc.id] = doc.to_dict()
                
                # Apply distance and author info to posts
                for post in recommendations:
                    business_id = post.get("uid")
                    if business_id != user_id:
                        # Add distance if location is available
                        if business_id in business_locations:
                            location = business_locations[business_id]
                            if location and location.get("latitude") and location.get("longitude"):
                                distance = calculate_distance(
                                    user_location["latitude"], 
                                    user_location["longitude"],
                                    location["latitude"], 
                                    location["longitude"]
                                )
                                post["distance_km"] = round(distance, 1)
                        
                        # Add author info if available
                        if business_id in business_data_map and "author" not in post:
                            business_data = business_data_map[business_id]
                            post["author"] = {
                                "businessName": business_data.get("businessName", ""),
                                "username": business_data.get("username", ""),
                                "profilePic": business_data.get("profilePic", "")
                            }

            # Sort all posts by distance (if available) then by recommendation type importance
            def get_sort_key(post):
                # Order: location (by distance), followed, preferred, random
                type_priority = {
                    "location": 0,
                    "followed": 1,
                    "preferred": 2,
                    "random": 3
                }
                priority = type_priority.get(post.get("recommendation_type", "random"), 4)
                distance = post.get("distance_km", float('inf'))
                recency = -get_timestamp_value(post["createdAt"])  # Negative so newer is first
                
                # Posts with distance info are sorted by that first, then by type and recency
                if "distance_km" in post:
                    return (distance, priority, recency)
                else:
                    # Posts without distance are sorted by type and recency
                    return (float('inf'), priority, recency)
            
            # Sort all posts once according to our comprehensive sorting logic
            recommendations.sort(key=get_sort_key)
            
            # Final check to remove any of the user's own posts that might have slipped through
            recommendations = [post for post in recommendations if post.get("uid") != user_id]
            
            # Ensure we don't exceed the limit
            return recommendations[:limit]
            
        except Exception as e:
            print(f"Error in get_combined_recommendations: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_who_to_follow(self, user_id: str, limit: int = 10, user_location: Dict = None) -> List[Dict]:
        """Get recommended users to follow based on various factors."""
        try:
            user_data = await self.get_user_data(user_id)
            user_location = user_location or user_data.get("location")
            preferred_types, following = await self.get_user_preferences(user_id)
            
            # OPTIMIZATION: Batch fetch liked business types
            liked_business_types = []
            likes_ref = db.collection("users").document(user_id).collection("likes").stream()
            for doc in likes_ref:
                like_data = doc.to_dict()
                if 'businessType' in like_data:
                    liked_business_types.append(like_data['businessType'])
            
            # Get all business users except those already followed
            business_query = db.collection("users").where("role", "==", "business")
            business_docs = list(business_query.stream())
            
            # Filter out already followed and current user in memory
            business_docs = [doc for doc in business_docs if doc.id not in following and doc.id != user_id]
            
            # Batch check for business activity - get all business IDs with at least one post
            # Build a map of business IDs that have posts
            business_ids = [doc.id for doc in business_docs]
            businesses_with_posts = set()
            
            # Split into batches of 10 for Firestore 'in' queries
            batch_size = 10
            for i in range(0, len(business_ids), batch_size):
                batch_ids = business_ids[i:i+batch_size]
                # Use a collection group query to efficiently check for posts
                posts_query = db.collection_group("posts").where("uid", "in", batch_ids).limit(len(batch_ids))
                for post_doc in posts_query.stream():
                    businesses_with_posts.add(post_doc.get("uid"))
            
            # Process business docs with optimized data
            recommended_users = []
            
            for doc in business_docs:
                business_data = doc.to_dict()
                if not business_data:
                    continue
                
                # Calculate score based on multiple factors
                score = 0
                business_type = business_data.get("businessType", "")
                
                # Factor 1: Business type matches user preferences
                if business_type in preferred_types:
                    preference_index = preferred_types.index(business_type)
                    score += 5 / (preference_index + 1)  # Higher score for top preferences
                
                # Factor 2: Business type matches liked posts
                if business_type in liked_business_types:
                    score += 3
                
                # Factor 3: Location proximity if available
                if (user_location and user_location.get("latitude") and 
                    user_location.get("longitude") and business_data.get("location")):
                    try:
                        distance = calculate_distance(
                            user_location["latitude"],
                            user_location["longitude"],
                            business_data["location"]["latitude"],
                            business_data["location"]["longitude"]
                        )
                        business_data["distance_km"] = round(distance, 1)
                        # Higher score for closer businesses (max 4 points for businesses within 5km)
                        score += max(0, 4 - (distance / 5)) if distance <= 20 else 0
                    except:
                        pass
                
                # Factor 4: Business activity (number of posts) - use our pre-checked set
                if doc.id in businesses_with_posts:
                    score += 2
                
                # Create recommendation object with relevant info
                recommendation = {
                    "id": doc.id,
                    "businessName": business_data.get("businessName", ""),
                    "username": business_data.get("username", ""),
                    "businessType": business_type,
                    "profileImage": business_data.get("profileImage", ""),
                    "distance_km": business_data.get("distance_km"),
                    "score": score,
                    "recommendation_type": (
                        "location" if "distance_km" in business_data
                        else "preferred" if business_type in preferred_types
                        else "random"
                    )
                }
                
                recommended_users.append(recommendation)
            
            # Sort recommendations by score and get top recommendations
            recommended_users.sort(key=lambda x: (-x["score"], x.get("distance_km", float('inf'))))
            
            return recommended_users[:limit]
            
        except Exception as e:
            print(f"Error in get_who_to_follow: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def update_business_geohash(self, business_id: str):
        """Update business location with geohash."""
        try:
            business_doc = db.collection("businesses").document(business_id).get()
            if not business_doc.exists:
                return
            
            business_data = business_doc.to_dict()
            if "location" not in business_data:
                return
            
            location = business_data["location"]
            geohash = encode_geohash(location["latitude"], location["longitude"], precision=6)
            
            # Update business document with geohash
            await db.collection("businesses").document(business_id).update({
                "geohash": geohash,
                "locationUpdatedAt": firestore.SERVER_TIMESTAMP
            })
            
            # Update location index with batch operation
            batch = db.batch()
            location_index_ref = db.collection("location_index").document(geohash)
            batch.set(location_index_ref, {
                "business_ids": firestore.ArrayUnion([business_id]),
                "updatedAt": firestore.SERVER_TIMESTAMP
            }, merge=True)
            await batch.commit()
            
        except Exception as e:
            print(f"Error updating geohash for business {business_id}: {str(e)}")

    async def process_location_updates(self):
        """Background task to process location updates."""
        try:
            # Get businesses that need location updates
            cutoff_time = datetime.now() - timedelta(hours=24)
            businesses = await db.collection("businesses").where(
                "locationUpdatedAt", "<", cutoff_time
            ).get()
            
            for doc in businesses:
                await self.update_business_geohash(doc.id)
            
        except Exception as e:
            print(f"Error in process_location_updates: {str(e)}")

# Initialize the recommendation engine
engine = RecommendationEngine()

# Root endpoint
@app.get("/")
async def root():
    return {"status": "ok", "message": "Recommendation server is running"}

# Recommendations endpoint (original)
@app.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str, limit: int = 10):
    try:
        recommendations = await engine.get_recommendations(user_id, limit)
        response = {"recommendations": recommendations}
        return JSONResponse(
            content=json.loads(json.dumps(response, cls=CustomJSONEncoder))
        )
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# New feed endpoint combining location and preference-based recommendations
@app.get("/feed/{user_id}")
async def get_feed(user_id: str, limit: int = 10, latitude: float = None, longitude: float = None):
    try:
        # Add cache-busting timestamp to force more frequent refreshes
        cache_time = 60  # 1 minute cache instead of 5 minutes
        cache_buster = int(datetime.now().timestamp() / cache_time)
        
        # Use location parameters if provided in the request
        user_location = None
        if latitude is not None and longitude is not None:
            # Basic validation of coordinates
            if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                user_location = {
                    "latitude": latitude,
                    "longitude": longitude
                }
                logger.info(f"Using location from query parameters: {latitude}, {longitude}")
            else:
                logger.warning(f"Invalid coordinates received: lat={latitude}, long={longitude}")
        
        recommendations = await engine.get_combined_recommendations(user_id, limit, user_location)
        
        # Count post types for metrics
        post_types = Counter([post.get("recommendation_type", "unknown") for post in recommendations])
        
        # Count posts by business (to verify distribution)
        business_post_counts = Counter([post.get("uid", "unknown") for post in recommendations])
        
        # Add cache control headers to prevent re-filtering on page reload
        response = {"recommendations": recommendations}
        
        # Add metadata to help client understand the response
        response["metadata"] = {
            "cached": True,
            "timestamp": datetime.now().isoformat(),
            "version": "1.5",  # Increment this when making significant changes to the algorithm
            "cache_buster": cache_buster,
            "total_count": len(recommendations),
            "used_location_params": user_location is not None,
            "distribution": {
                "location": post_types.get("location", 0),
                "followed": post_types.get("followed", 0),
                "preferred": post_types.get("preferred", 0),
                "random": post_types.get("random", 0)
            },
            "business_distribution": {
                "unique_businesses": len(business_post_counts),
                "max_posts_per_business": max(business_post_counts.values()) if business_post_counts else 0
            }
        }
        
        # Include all response headers with shorter cache time
        return JSONResponse(
            content=json.loads(json.dumps(response, cls=CustomJSONEncoder)),
            headers={
                "Cache-Control": f"private, max-age={cache_time}",  # Cache for 1 minute only
                "Vary": "Authorization"  # Vary cache by user
            }
        )
    except Exception as e:
        print(f"Error in get_feed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Business recommendations endpoint
@app.get("/recommended-businesses/{user_id}")
async def get_recommended_businesses(user_id: str, limit: int = 10):
    """Get recommended businesses for a user to follow."""
    try:
        recommendations = await engine.get_recommended_businesses(user_id, limit)
        response = {
            "recommendations": recommendations,
            "metadata": {
                "cached": True,
                "timestamp": datetime.now().isoformat(),
                "version": "1.0",
                "total_count": len(recommendations)
            }
        }
        return JSONResponse(
            content=json.loads(json.dumps(response, cls=CustomJSONEncoder)),
            headers={
                "Cache-Control": "private, max-age=300",  # Cache for 5 minutes
                "Vary": "Authorization"  # Vary cache by user
            }
        )
    except Exception as e:
        print(f"Error in get_recommended_businesses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/business-recommendations/{user_id}")
async def get_business_recommendations(user_id: str, limit: int = 4, offset: int = 0, latitude: float = None, longitude: float = None, recommendation_type: str = "location"):
    try:
        # Get user data including location
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        user_data = user_doc.to_dict()
        
        # Use location from query parameters if provided
        user_location = {}
        if latitude is not None and longitude is not None:
            # Basic validation of coordinates
            if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                user_location = {
                    "latitude": latitude,
                    "longitude": longitude
                }
                logger.info(f"Using location from query parameters for business recommendations: {latitude}, {longitude}")
            else:
                logger.warning(f"Invalid coordinates received: lat={latitude}, long={longitude}")
        else:
            user_location = user_data.get("location", {})

        # OPTIMIZATION: Fetch all likes in one call
        liked_business_types = []
        likes_ref = db.collection("users").document(user_id).collection("likes")
        likes_snapshot = list(likes_ref.stream())
        for doc in likes_snapshot:
            like_data = doc.to_dict()
            if 'businessType' in like_data:
                liked_business_types.append(like_data['businessType'])
        
        # Get user's followed businesses and their types in batches
        following_ref = db.collection("users").document(user_id).collection("following")
        following_ids = [doc.id for doc in following_ref.stream()]
        
        followed_business_types = []
        batch_size = 10
        
        # Batch fetch followed business types
        if following_ids:
            for i in range(0, len(following_ids), batch_size):
                batch_ids = following_ids[i:i+batch_size]
                business_query = db.collection("users").where("__name__", "in", batch_ids)
                batch_docs = list(business_query.stream())
                
                for doc in batch_docs:
                    business_data = doc.to_dict()
                    if business_data and "businessType" in business_data:
                        followed_business_types.append(business_data["businessType"])
        
        # Combine and weight preferences
        all_preferences = liked_business_types + followed_business_types
        type_weights = Counter(all_preferences)
        
        # Get current user's role
        user_role = user_data.get("role", "user")
        
        # OPTIMIZATION: Fetch all businesses in one go instead of one by one
        business_query = db.collection("businesses")
        
        # Filter businesses by role if user is a business
        if user_role == "business":
            # Explicitly get current user's business data to know its type
            user_business_data = None
            try:
                user_business_doc = db.collection("businesses").document(user_id).get()
                if user_business_doc.exists:
                    user_business_data = user_business_doc.to_dict()
            except Exception as e:
                logger.warning(f"Error getting user's business data: {str(e)}")
        
        business_collection = business_query.stream()
        businesses_data = {}
        
        for doc in business_collection:
            # Skip the current user and already followed businesses
            if doc.id != user_id and doc.id not in following_ids:
                business_data = doc.to_dict()
                if business_data:
                    businesses_data[doc.id] = business_data
        
        # Batch fetch user data for all businesses
        business_ids = list(businesses_data.keys())
        user_data_map = {}
        
        for i in range(0, len(business_ids), batch_size):
            batch_ids = business_ids[i:i+batch_size]
            user_query = db.collection("users").where("__name__", "in", batch_ids)
            for doc in user_query.stream():
                user_data_map[doc.id] = doc.to_dict()
        
        # Process businesses with the batch fetched data
        recommended_businesses = []
        
        for business_id, business_data in businesses_data.items():
            user_data_info = user_data_map.get(business_id)
            if not user_data_info:
                continue
                
            plan = user_data_info.get("plan", "free")
            
            # Calculate score based on multiple factors
            score = 0
            business_type = business_data.get("businessType", "")
            
            # Factor 1: Business type matches
            if business_type in type_weights:
                score += type_weights[business_type] * 2
            
            if business_type in followed_business_types:
                score += 3
            
            if business_type in liked_business_types:
                score += 2
            
            # Factor 2: Business activity (number of posts) - this is still per-business
            posts_query = (
                db.collection("posts")
                .where("uid", "==", business_id)
                .limit(1)
            )
            has_posts = len(list(posts_query.stream())) > 0
            if has_posts:
                score += 2
            
            # Factor 3: Plan priority (premium > standard > free)
            plan_priority = {"premium": 3, "standard": 2, "free": 1}.get(plan, 0)
            score += plan_priority
            
            # Base business info
            business_info = {
                'id': business_id,
                'businessName': business_data.get('businessName', ''),
                'username': user_data_info.get('username', ''),
                'businessType': business_type,
                'profileImage': user_data_info.get('profilePic', ''),
                'business_plan': plan,
                'score': score,
                'has_activity': has_posts,
                'recommendation_type': recommendation_type
            }
            
            # Handle location-based recommendations
            location_score = 0
            if recommendation_type == "location" and user_location.get("latitude") and user_location.get("longitude"):
                # Only process location recommendations if business has location data
                if "location" in business_data and business_data["location"].get("latitude") and business_data["location"].get("longitude"):
                    try:
                        distance = calculate_distance(
                            user_location["latitude"],
                            user_location["longitude"],
                            business_data["location"]["latitude"],
                            business_data["location"]["longitude"]
                        )
                        
                        # Determine radius limit based on plan
                        radius_limit = {
                            "free": 2,      # 2km for free plan
                            "standard": 4,  # 4km for standard plan
                            "premium": 8    # 8km for premium plan
                        }.get(plan, 2)  # Default to 2km if plan is unknown
                        
                        # Only include if within plan's radius limit
                        if distance <= radius_limit:
                            business_info["distance_km"] = round(distance, 1)
                            location_score = max(0, 10 - distance) if distance <= radius_limit else 0
                            business_info["total_score"] = location_score + (score * 0.5)
                            recommended_businesses.append(business_info)
                    except Exception as e:
                        logger.warning(f"Error calculating distance for business {business_id}: {str(e)}")
            elif recommendation_type == "activity":
                # For activity-based recommendations, include businesses with activity
                if has_posts:
                    # If we have location data, still calculate distance for sorting
                    if "location" in business_data and user_location.get("latitude") and user_location.get("longitude"):
                        try:
                            distance = calculate_distance(
                                user_location["latitude"],
                                user_location["longitude"],
                                business_data["location"]["latitude"],
                                business_data["location"]["longitude"]
                            )
                            business_info["distance_km"] = round(distance, 1)
                        except Exception:
                            pass  # Ignore distance errors for activity-based recommendations
                    
                    business_info["total_score"] = score
                    recommended_businesses.append(business_info)
        
        # Sort businesses based on recommendation type
        if recommendation_type == "location":
            # For location-based: sort by distance first, then plan and score
            recommended_businesses.sort(key=lambda x: (
                x.get("distance_km", float("inf")),
                {"premium": 0, "standard": 1, "free": 2}.get(x.get("business_plan", "free"), 3),
                -x.get("total_score", 0)
            ))
        else:
            # For activity-based: sort by score first, then plan and distance
            recommended_businesses.sort(key=lambda x: (
                -x.get("total_score", 0),
                {"premium": 0, "standard": 1, "free": 2}.get(x.get("business_plan", "free"), 3),
                x.get("distance_km", float("inf"))
            ))
        
        paginated_businesses = recommended_businesses[offset:offset + limit]
        has_more = len(recommended_businesses) > (offset + limit)
        
        return {
            "recommendations": paginated_businesses,
            "has_more": has_more,
            "total": len(recommended_businesses),
            "metadata": {
                "cached": True,
                "timestamp": datetime.now().isoformat(),
                "version": "1.3",
                "used_location_params": latitude is not None and longitude is not None,
                "recommendation_type": recommendation_type,
                "filtered_by_plan_radius": True
            }
        }
        
    except Exception as e:
        print(f"Error in get_business_recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/who-to-follow/{user_id}")
async def get_who_to_follow(user_id: str, limit: int = 10, latitude: float = None, longitude: float = None):
    """Get recommended users to follow."""
    try:
        # Use location from query parameters if available
        user_location = None
        if latitude is not None and longitude is not None:
            # Basic validation of coordinates
            if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                user_location = {
                    "latitude": latitude,
                    "longitude": longitude
                }
                logger.info(f"Using location from query parameters for who-to-follow: {latitude}, {longitude}")
            else:
                logger.warning(f"Invalid coordinates received: lat={latitude}, long={longitude}")
                
        recommendations = await engine.get_who_to_follow(user_id, limit, user_location)
        response = {
            "recommendations": recommendations,
            "metadata": {
                "cached": True,
                "timestamp": datetime.now().isoformat(),
                "version": "1.1",
                "total_count": len(recommendations),
                "used_location_params": user_location is not None
            }
        }
        return JSONResponse(
            content=json.loads(json.dumps(response, cls=CustomJSONEncoder)),
            headers={
                "Cache-Control": "private, max-age=300",  # Cache for 5 minutes
                "Vary": "Authorization"  # Vary cache by user
            }
        )
    except Exception as e:
        print(f"Error in get_who_to_follow endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-location-updates")
async def trigger_location_updates():
    """Trigger background processing of location updates."""
    try:
        await engine.process_location_updates()
        return {"status": "success", "message": "Location updates processed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-location-index")
async def update_location_index():
    """Endpoint to manually trigger location index update."""
    try:
        # Get all businesses
        businesses = db.collection("businesses").stream()
        
        # Process in batches
        batch = db.batch()
        batch_count = 0
        max_batch_size = 500
        
        for doc in businesses:
            business_data = doc.to_dict()
            if "location" not in business_data:
                continue
                
            geohash = encode_geohash(
                business_data["location"]["latitude"],
                business_data["location"]["longitude"],
                precision=6
            )
            
            # Update location index
            location_index_ref = db.collection("location_index").document(geohash)
            batch.set(location_index_ref, {
                "business_ids": firestore.ArrayUnion([doc.id]),
                "updatedAt": firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            batch_count += 1
            if batch_count >= max_batch_size:
                await batch.commit()
                batch = db.batch()
                batch_count = 0
        
        # Commit any remaining updates
        if batch_count > 0:
            await batch.commit()
            
        return {"status": "success", "message": "Location index updated"}
        
    except Exception as e:
        logger.error(f"Error updating location index: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def create_firestore_indexes():
    """Create required Firestore indexes if they don't exist."""
    try:
        # Define the indexes
        indexes = [
            {
                "collectionGroup": "posts",
                "queryScope": "COLLECTION",
                "fields": [
                    {"fieldPath": "uid", "order": "ASCENDING"},
                    {"fieldPath": "createdAt", "order": "DESCENDING"}
                ]
            },
            {
                "collectionGroup": "posts",
                "queryScope": "COLLECTION",
                "fields": [
                    {"fieldPath": "businessType", "order": "ASCENDING"},
                    {"fieldPath": "createdAt", "order": "DESCENDING"}
                ]
            }
        ]
        
        # Get existing indexes
        existing_indexes = db.collection("_indexes").get()
        existing_index_definitions = {
            f"{index.to_dict().get('collectionGroup')}_{index.to_dict().get('fields')}"
            for index in existing_indexes
        }
        
        # Create new indexes
        for index in indexes:
            index_key = f"{index['collectionGroup']}_{index['fields']}"
            if index_key not in existing_index_definitions:
                db.collection("_indexes").add(index)
                print(f"Created index: {index_key}")
        
        print("All required indexes are created")
        
    except Exception as e:
        print(f"Error creating indexes: {str(e)}")

# Call this function when your app starts
@app.on_event("startup")
async def startup_event():
    create_firestore_indexes()

# Run the server
if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))  # Use assigned port or default to 8000
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
