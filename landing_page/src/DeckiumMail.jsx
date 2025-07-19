import React from "react";

const DeckiumMail = () => {
	return (
		<div className="bg-gray-900 text-white min-h-screen">
			<div className="container mx-auto px-4 py-20">
				<div className="max-w-2xl mx-auto text-center">
					<h1 className="text-5xl font-bold mb-6">
						Deckium <span className="text-indigo-400">Mail</span>
					</h1>
					<p className="text-xl text-gray-400 mb-8">
						Create stunning PowerPoint presentations by simply sending an email.
					</p>
					<div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-8">
						<h2 className="text-2xl font-semibold mb-4">How it works</h2>
						<ol className="text-left text-gray-300 list-decimal list-inside space-y-3">
							<li>
								Send an email to <span className="text-indigo-400 font-mono">slide@deckium.xyz</span> with a description of your presentation.
							</li>
							<li>
								Attach any necessary images, graphics, or data files (<span className="font-mono">.xlsx</span> supported).
							</li>
							<li>
								Our AI will generate your slides and reply with the complete PowerPoint presentation.
							</li>
						</ol>
					</div>
					<p className="text-lg text-gray-300 mb-4">
						It's <span className="text-indigo-400 font-semibold">free to try</span>—just send an email and get your slides!
					</p>
					<div className="mt-8">
						<a
							href="mailto:slide@deckium.xyz"
							className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors shadow-lg"
						>
							Send Email
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DeckiumMail; 