import React, { useState, useEffect } from "react";
import { Users, Zap, BarChart, X, MessageSquare } from "lucide-react";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg relative max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

const VimeoPlayer = () => (
  <div className="w-full md:w-1/2">
    <div className="relative w-full h-0 pb-[56.25%]">
      <iframe
        src="https://player.vimeo.com/video/1023676635?quality=1080p&title=0&byline=0&portrait=0&transparent=0&controls=1&responsive=1"
        className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  </div>
);

const trackEvent = (category, action, label) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
};

const AIDemo = () => {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const prompts = [
    "Create a 5 slide presentation about espresso",
    "Translate the current presentation into English",
    "Make the bullet points more professional",
    "Add a bar plot showcasing the latest sales trends"
  ];

  useEffect(() => {
    let timeout;
    let currentIndex = 0;
    const currentPromptText = prompts[currentPrompt];

    const typeText = () => {
      if (currentIndex < currentPromptText.length) {
        setDisplayText(currentPromptText.slice(0, currentIndex + 1));
        currentIndex++;
        timeout = setTimeout(typeText, 20);
      } else {
        setIsTyping(false);
        timeout = setTimeout(() => {
          setCurrentPrompt((prev) => (prev + 1) % prompts.length);
          setDisplayText("");
          setIsTyping(true);
        }, 5000);
      }
    };

    typeText();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [currentPrompt]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <MessageSquare className="w-6 h-6 text-indigo-400 mr-2" />
        <h3 className="text-xl font-semibold">See Deckium in action</h3>
      </div>
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-lg">
                {displayText}
                {isTyping && (
                  <span className="inline-block w-2 h-5 bg-indigo-400 ml-1 animate-pulse" />
                )}
              </p>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {isTyping ? "AI is typing..." : "AI is thinking..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gray-800 p-6 rounded-lg">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

const LandingPage = () => {
  const [formStatus, setFormStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [earlyAccessStatus, setEarlyAccessStatus] = useState("");

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    const status =
      formType === "contact" ? setFormStatus : setEarlyAccessStatus;
    status("submitting");

    trackEvent('Form', 'Submit', formType);

    try {
      const response = await fetch("https://formspree.io/f/mzzbzrbr", {
        method: "POST",
        body: new FormData(e.target),
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        status("success");
        trackEvent('Form', 'Success', formType);
        e.target.reset();
        if (formType === "earlyAccess") {
          setTimeout(() => {
            setIsModalOpen(false);
            setEarlyAccessStatus("");
          }, 3000);
        }
      } else {
        status("error");
        trackEvent('Form', 'Error', formType);
      }
    } catch (error) {
      status("error");
      trackEvent('Form', 'Error', formType);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4">
        <header className="flex justify-between items-center py-6">
          <div className="text-indigo-400 font-bold text-2xl">DECKIUM</div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="#features" className="hover:text-indigo-400">
                  Features
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-indigo-400">
                  About
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-indigo-400">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
          <div>
            <button
              onClick={() => {
                setIsModalOpen(true);
                trackEvent('Navigation', 'Click', 'Join Waitlist');
              }}
              className="bg-indigo-500 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-600 transition-colors"
            >
              Join waitlist
            </button>
          </div>
        </header>

        <main className="py-20">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="max-w-xl mb-12 md:mb-0 md:mr-8">
              <h1 className="text-5xl font-bold mb-6">
                AI-powered presentations
                <br />
                <span className="text-indigo-400">with human control</span>
              </h1>
              <p className="text-xl mb-8">
                Deckium is your AI presentation assistant that works just like a human colleague. 
                Create professional slides, enhance content, and add visualizations while maintaining 
                full control. No animations, no AI templates - just pure presentation power.
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-500 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-600 transition-colors"
                >
                  Join waitlist
                </button>
                <button className="bg-gray-700 px-6 py-3 rounded-lg text-lg hover:bg-gray-600 transition-colors">
                  Learn more
                </button>
              </div>
            </div>

            <VimeoPlayer />
          </div>
        </main>

        <section className="py-20">
          <AIDemo />
        </section>

        <section id="features" className="py-20">
          <h2 className="text-3xl font-bold mb-12">Key features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="w-12 h-12 text-indigo-400" />}
              title="Human-like assistance"
              description="Your AI colleague works exactly like a human would, letting you stay in control while getting professional help."
            />
            <FeatureCard
              icon={<Zap className="w-12 h-12 text-indigo-400" />}
              title="Smart intelligence"
              description="Get help with research and data to create compelling, data-driven presentations."
            />
            <FeatureCard
              icon={<BarChart className="w-12 h-12 text-indigo-400" />}
              title="Professional enhancement"
              description="Transform bullet points, add data visualizations, and translate content while maintaining your style."
            />
          </div>
        </section>

        <section id="about" className="py-20">
          <h2 className="text-3xl font-bold mb-8">About Deckium</h2>
          <p className="text-xl mb-6">
            Deckium is revolutionizing presentation creation by combining AI capabilities with human control. 
            Unlike other tools that force you into templates or animations, Deckium works as your intelligent 
            presentation partner, helping you create professional slides while keeping you in the driver's seat.
          </p>
          <p className="text-xl">
            Whether you need to create a new presentation from scratch, enhance existing slides, 
            or add the latest data visualizations, Deckium's AI agent is ready to assist you 
            with the same precision and understanding as a human colleague.
          </p>
        </section>

        <section id="contact" className="py-20">
          <h2 className="text-3xl font-bold mb-12">Contact us</h2>
          <form
            onSubmit={(e) => handleSubmit(e, "contact")}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <input
              type="text"
              name="name"
              placeholder="Name"
              required
              className="w-full p-2 rounded bg-gray-800"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="w-full p-2 rounded bg-gray-800"
            />
            <textarea
              name="message"
              placeholder="Message"
              required
              rows="4"
              className="w-full p-2 rounded bg-gray-800"
            ></textarea>
            <button
              type="submit"
              disabled={formStatus === "submitting"}
              className="bg-indigo-500 text-white px-6 py-2 rounded font-semibold w-full"
            >
              {formStatus === "submitting" ? "Sending..." : "Send message"}
            </button>
            {formStatus === "success" && (
              <p className="text-green-500">Message sent successfully!</p>
            )}
            {formStatus === "error" && (
              <p className="text-red-500">
                There was an error sending your message. Please try again.
              </p>
            )}
          </form>
        </section>
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
                  <a href="#" className="hover:text-indigo-400">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-indigo-400">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-indigo-400">
                    About
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-indigo-400">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">Join the waitlist</h2>
        <form
          onSubmit={(e) => handleSubmit(e, "signup")}
          className="space-y-4"
        >
          <input
            type="email"
            name="email"
            placeholder="Your email"
            required
            className="w-full p-2 rounded bg-gray-700"
          />
          <input type="hidden" name="form-type" value="signup" />
          <button
            type="submit"
            disabled={earlyAccessStatus === "submitting"}
            className="w-full bg-indigo-500 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-600 transition-colors"
          >
            {earlyAccessStatus === "submitting"
              ? "Joining waitlist..."
              : "Join waitlist"}
          </button>
          {earlyAccessStatus === "success" && (
            <p className="text-green-500">Thanks for joining! We'll notify you when Deckium is ready.</p>
          )}
          {earlyAccessStatus === "error" && (
            <p className="text-red-500">
              There was an error. Please try again.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default LandingPage;
