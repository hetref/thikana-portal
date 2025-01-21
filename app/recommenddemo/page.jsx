"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [user, setUser] = useState(null);
  const [postsData, setPostsData] = useState([]);
  const [recommendedPosts, setRecommendedPosts] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);

  useEffect(() => {
    const userId = 1; // Replace with dynamic user ID

    // Fetch recommended posts
    axios
      .get(`http://127.0.0.1:8000/recommend/posts/${userId}`)
      .then((response) => setRecommendedPosts(response.data))
      .catch((error) => console.error("Error fetching posts:", error));

    // Fetch recommended users
    axios
      .get(`http://localhost:8000/recommend/users/${userId}`)
      .then((res) => setRecommendedUsers(res.data))
      .catch((err) => console.error("Error fetching users:", err));

    // Fetch trending posts
    axios
      .get("http://localhost:8000/recommend/trending")
      .then((res) => setTrendingPosts(res.data))
      .catch((err) => console.error("Error fetching trending posts:", err));

    // Simulate user data after fetching
    setUser({
      id: 1,
      name: "Alice",
      liked_posts: [1], // Example: liked post IDs (replace with real data)
      following: [2],
    });

    // Set posts data (mocked)
    setPostsData([
      {
        id: 1,
        title: "Post 1",
        likes: 10,
        tags: ["travel", "adventure"],
        image: "https://via.placeholder.com/150",
      },
      {
        id: 2,
        title: "Post 2",
        likes: 20,
        tags: ["tech", "innovation"],
        image: "https://via.placeholder.com/150",
      },
      {
        id: 3,
        title: "Post 3",
        likes: 15,
        tags: ["food", "cooking"],
        image: "https://via.placeholder.com/150",
      },
    ]);
  }, []);

  // Basic recommendation logic
  useEffect(() => {
    if (user && user.liked_posts) {
      const recommendedPostsForUser = postsData.filter(
        (post) =>
          user.liked_posts.includes(post.id) ||
          post.tags.some((tag) => user.liked_posts.includes(tag))
      );
      setRecommendedPosts(recommendedPostsForUser);

      const recommendedUsersForUser = postsData.filter((post) =>
        post.tags.some((tag) =>
          user.liked_posts.some((likedPostId) => likedPostId === post.id)
        )
      );
      setRecommendedUsers(recommendedUsersForUser);
    }
  }, [user, postsData]);

  const handleLike = (postId) => {
    console.log(`Post ${postId} liked`);
    // Logic to update the backend or frontend state (e.g., call backend API to update likes)
  };

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-4xl text-center font-bold text-gray-800 mb-5">
        Welcome to the Post Feed
      </h1>
      {user && (
        <h2 className="text-2xl text-center font-semibold text-gray-600">
          {user.name}'s Recommended Posts
        </h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
        {/* Display recommended posts */}
        <div className="col-span-3">
          <h3 className="text-xl font-bold text-gray-700 mb-4">
            Recommended Posts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedPosts.length > 0 ? (
              recommendedPosts.map((post) => (
                <div
                  key={post.id}
                  className="post-card p-4 border rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-200"
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-700">
                    {post.title}
                  </h3>
                  <p>Likes: {post.likes}</p>
                  <p>Tags: {post.tags.join(", ")}</p>
                  <button
                    onClick={() => handleLike(post.id)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Like
                  </button>
                </div>
              ))
            ) : (
              <p>No recommended posts available</p>
            )}
          </div>
        </div>

        {/* Display recommended users */}
        <div className="col-span-3 mt-10">
          <h3 className="text-xl font-bold text-gray-700 mb-4">
            Recommended Users
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedUsers.length > 0 ? (
              recommendedUsers.map((user) => (
                <div
                  key={user.id}
                  className="user-card p-4 border rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-200"
                >
                  <h3 className="text-xl font-semibold text-gray-700">
                    {user.name}
                  </h3>
                  <p>Likes: {user.liked_posts}</p>
                  <p>Following: {user.following}</p>
                </div>
              ))
            ) : (
              <p>No recommended users available</p>
            )}
          </div>
        </div>

        {/* Display trending posts */}
        <div className="col-span-3 mt-10">
          <h3 className="text-xl font-bold text-gray-700 mb-4">
            Trending Posts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingPosts.map((post) => (
              <div
                key={post.id}
                className="post-card p-4 border rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-200"
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-700">
                  {post.title}
                </h3>
                <p>Likes: {post.likes}</p>
                <p>Tags: {post.tags.join(", ")}</p>
                <button
                  onClick={() => handleLike(post.id)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Like
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
