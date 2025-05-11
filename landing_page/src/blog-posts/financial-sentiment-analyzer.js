export const post = {
  slug: "financial-sentiment-analyzer",
  title:
    "Building a Financial Sentiment Analyzer: A Technical Case Study with Doxastic",
  date: "November 18, 2024",
  author: "Doxastic Team",
  excerpt:
    "This article explores how I built a financial sentiment analysis tool using Doxastic's LLM fine-tuning platform and Streamlit. The focus is on how modern AI platforms can simplify complex ML projects without sacrificing technical capabilities.",
  content: `
    
    <p>This article explores how I built a financial sentiment analysis tool using Doxastic's LLM fine-tuning platform and Streamlit. The focus is on how modern AI platforms can simplify complex ML projects without sacrificing technical capabilities.</p>

    <h2>The Technical Challenge</h2>
    <p>Financial sentiment analysis typically requires:</p>
    <ul>
        <li>Complex NLP pipelines for processing financial jargon</li>
        <li>Extensive model training infrastructure</li>
        <li>Custom deployment solutions</li>
        <li>Continuous retraining capabilities</li>
    </ul>
    <p>Traditional approaches often involve weeks of engineering work. With Doxastic, I was able to focus on the data and results rather than infrastructure.</p>

    <h2>Implementation with Doxastic</h2>
    <p>Here's how Doxastic's platform streamlined the development process:</p>
    <ol>
        <li><strong>Dataset Preparation</strong>: Used the financial_phrasebank dataset from Hugging Face, which contains labeled financial statements</li>
        <li><strong>Model Training</strong>:
            <ul>
                <li>Direct CSV upload to Doxastic</li>
                <li>Selected Qwen-2.5 (0.5B parameter version) as the base model</li>
                <li>Platform handled tokenization, training loops, and optimization</li>
            </ul>
        </li>
        <li><strong>Deployment</strong>: Used Doxastic's API endpoints for the Streamlit interface</li>
    </ol>
    <p>The platform managed all the technical overhead - CUDA setup, model optimization, API deployment - letting me focus on model performance and the application interface.</p>
    <div class="my-8">
        <img src="/images/loss.png" alt="Loss during training" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
    </div>

    <h2>Results and Performance</h2>
    <p>The resulting dashboard provides real-time sentiment analysis of financial texts. Key technical features:</p>
    <ul>
        <li>REST API endpoint for model inference</li>
        <li>Built-in token management</li>
        <li>Automatic scaling</li>
    </ul>
    <p>Live demo: <a href="https://sentimentanalysisdashboard.streamlit.app/">https://sentimentanalysisdashboard.streamlit.app/</a></p>
    <div class="my-8">
        <img src="/images/dashboard.png" alt="The sentiment analysis dashboard" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
    </div>


    <h2>Technical Insights</h2>
    <p>What Worked:</p>
    <ol>
        <li><strong>Efficient Training</strong>: Doxastic's LoRA implementation enabled quick fine-tuning of the base model</li>
        <li><strong>API Integration</strong>: Simple REST endpoints made Streamlit integration straightforward</li>
        <li><strong>Resource Management</strong>: Platform handled GPU allocation and scaling automatically</li>
    </ol>
    <p>Areas for Technical Improvement:</p>
    <ol>
        <li><strong>Custom Dataset Integration</strong>: The model would benefit from having a custom dataset not publicly available.</li>
    </ol>

    <h2>Applications</h2>
    <p>Current implementation enables:</p>
    <ul>
        <li>Real-time market sentiment monitoring</li>
        <li>Automated financial news analysis</li>
        <li>Social media sentiment tracking</li>
    </ul>

    <h2>Next Steps</h2>
    <p>Future development will focus on:</p>
    <ul>
        <li>Creating a custom-labeled dataset for improved accuracy</li>
        <li>Implementing real-time news feed processing</li>
        <li>Exploring larger model architectures</li>
    </ul>

    <h2>Conclusion</h2>
    <p>Doxastic's platform significantly reduced the technical overhead of building a production-ready sentiment analysis tool. What would typically require extensive ML engineering was accomplished with focus on data quality and business logic instead.</p>

    <p>Request beta access to start building your own ML applications at <a href="https://doxastic.xyz">doxastic.xyz</a></p>

    `,
};
