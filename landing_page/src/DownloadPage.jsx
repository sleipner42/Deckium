import React from 'react';
import { Download, Monitor, Apple, Smartphone } from 'lucide-react';

const DownloadButton = ({ icon, title, subtitle, disabled = false }) => (
  <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors group h-full">
    <div className="flex flex-col items-center text-center h-full">
      <div className="mb-6 p-4 bg-gray-700 rounded-full group-hover:bg-indigo-500 transition-colors">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 flex-grow">{subtitle}</p>
      <button
        disabled={disabled}
        className={`w-full flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold transition-colors ${
          disabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        <Download className="w-5 h-5 mr-2" />
        {disabled ? 'Coming Soon' : 'Download'}
      </button>
    </div>
  </div>
);

const DownloadPage = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4">
        <header className="flex justify-between items-center py-6">
          <div className="text-indigo-400 font-bold text-2xl">DECKIUM</div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="/" className="hover:text-indigo-400">
                  Home
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-indigo-400">
                  Features
                </a>
              </li>
              <li>
                <a href="/#about" className="hover:text-indigo-400">
                  About
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-indigo-400">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <main className="py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6">
              Download <span className="text-indigo-400">Deckium</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get Deckium for your platform and start creating AI-powered presentations 
              with human control. Choose your operating system below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            <DownloadButton
              icon={<Apple className="w-12 h-12" />}
              title="macOS"
              subtitle="For Mac computers with Intel or Apple Silicon"
            />
            
            <DownloadButton
              icon={<Monitor className="w-12 h-12" />}
              title="Windows"
              subtitle="For Windows 10 and Windows 11"
            />
            
            <DownloadButton
              icon={<Smartphone className="w-12 h-12" />}
              title="Linux"
              subtitle="For Ubuntu, Debian, and other distributions"
            />
          </div>
        </main>
      </div>

      <footer className="bg-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-between items-center">
            <div className="text-indigo-400 font-bold text-xl mb-4 md:mb-0">
              DECKIUM
            </div>
            <nav className="mb-4 md:mb-0">
              <ul className="flex flex-wrap space-x-6">
                <li>
                  <a href="/" className="hover:text-indigo-400">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/#features" className="hover:text-indigo-400">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/#about" className="hover:text-indigo-400">
                    About
                  </a>
                </li>
                <li>
                  <a href="/#contact" className="hover:text-indigo-400">
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
            <div className="w-full md:w-auto text-center md:text-left">
              <p>&copy; 2025 Deckium. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DownloadPage; 