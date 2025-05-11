import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { posts } from "./blog-posts";
import Header from "./components/Header";

const BlogPost = () => {
  const { slug } = useParams();
  const post = posts[slug];

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/blog"
          className="inline-flex items-center text-teal-500 hover:text-teal-400 mb-8"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Blog
        </Link>

        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <div className="text-gray-400">
              <span>{post.date}</span> • <span>{post.author}</span>
            </div>
          </header>

          <div
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
