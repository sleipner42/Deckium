import React from "react";
import { Link } from "react-router-dom";
import { postsList } from "./blog-posts";
import Header from "./components/Header";

const BlogListing = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>
        <div className="space-y-8">
          {postsList.map((post) => (
            <article key={post.slug} className="border-b border-gray-800 pb-8">
              <Link
                to={`/blog/${post.slug}`}
                className="block hover:text-teal-400"
              >
                <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
              </Link>
              <div className="text-gray-400 mb-4">
                <span>{post.date}</span> • <span>{post.author}</span>
              </div>
              <p className="text-gray-300">{post.excerpt}</p>
              <Link
                to={`/blog/${post.slug}`}
                className="inline-block mt-4 text-teal-500 hover:text-teal-400"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogListing; 