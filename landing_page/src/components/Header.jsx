import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-white hover:text-teal-400">
            Doxastic
          </Link>
          <div className="space-x-6">
            <Link to="/" className="text-gray-300 hover:text-teal-400">
              Home
            </Link>
            <Link to="/blog" className="text-gray-300 hover:text-teal-400">
              Blog
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 