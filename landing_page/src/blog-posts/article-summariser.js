export const post = {
    slug: "article-summarizer",
    title: "From Zero to Published: Fine-tuning a Text Summarization Model with No Code",
    date: "November 14, 2024",
    author: "Doxastic Team",
    excerpt: "A practical guide to creating a custom text summarization model using Doxastic, with no coding required. Learn how we improved upon base model performance using simple fine-tuning techniques.",
    content: `
  
  <p>Creating specialized AI models has traditionally required significant technical expertise. I recently explored how to make this process more approachable by building a text summarization model using Doxastic, and wanted to share what I learned along the way.</p>
  
  <h2>The Challenge</h2>
  <p>I needed a simple way to summarize articles. While existing AI models can do this, they're often expensive and slow. My first attempts using a basic Qwen2.5 0.5B model weren't great - it would either give very short responses or sometimes produce inaccurate summaries.</p>
  
  <h2>Finding a Solution</h2>
  <p>The process turned out to be simpler than expected:</p>
  
  <ol>
    <li>I found a dataset of BBC articles with summaries on Kaggle</li>
    <li>Used Doxastic's interface to train the model</li>
    <li>Published it with a single click</li>
  </ol>
  
  <p>The whole process took about 30 minutes, and the results were better than I expected.</p>
  
  <h2>How It Works</h2>
  <p>The first step was finding good training data. I used a public dataset of BBC news articles that already had human-written summaries. This gave the model clear examples of what good summaries look like.</p>
  
  <div class="my-8">
    <img src="/images/labeling.png" alt="Doxastic Training Interface" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
    <p class="text-sm text-gray-400 text-center mt-2">The training interface made it easy to review and prepare the data</p>
  </div>
  
  <p>After preparing the data, Doxastic handled the technical parts: training the model and making it available through an API. I didn't need to worry about the underlying machine learning concepts.</p>
  
  <div class="my-8">
    <img src="/images/endpoint.png" alt="Doxastic API Endpoint" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
    <p class="text-sm text-gray-400 text-center mt-2">The API endpoint after publishing</p>
  </div>
  
  <h2>The Results</h2>
  <p>The improvement was clear. Where the original model struggled to create useful summaries, the trained version now produces reliable results. Here's what changed:</p>
  
  <ul>
    <li>Summaries are now consistently well-structured</li>
    <li>The model captures the main points accurately</li>
    <li>Response times are quick since we're using a smaller model</li>
  </ul>
  
  <h2>Technical Details</h2>
  <p>I used the Qwen2.5 0.5B model for this project. While larger models exist, this one provided a good balance between speed and quality. The smaller size means it runs efficiently while still producing good summaries.</p>
  
  <h2>Practical Applications</h2>
  <p>This approach could be useful for various text processing needs. Some examples I've considered:</p>
  
  <ul>
    <li>Summarizing long documents or reports</li>
    <li>Creating brief overviews of news articles</li>
    <li>Condensing meeting notes</li>
  </ul>
  
  <h2>What I Learned</h2>
  <p>This project showed me that creating custom AI models doesn't have to be complicated. Using a smaller model (Qwen2.5 0.5B) worked well for my needs, and the whole process was much more straightforward than I anticipated.</p>
  
  <h2>About Me</h2>
  <p>I'm part of the team at Doxastic, where we're working to make AI model training more accessible. This summarization model is just one example of what's possible with these tools.</p>
  
  <h2>Looking Forward</h2>
  <p>If you're interested in creating your own custom model, I'd encourage you to give it a try. The barrier to entry is lower than you might think, and the results can be quite practical.</p>
  
  <p>Thanks for reading!</p>
    `,
  }; 