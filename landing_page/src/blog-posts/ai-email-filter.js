export const post = {
  slug: "ai-email-filter",
  title: "Building an AI Email Filter in 15 Minutes",
  date: "November 3, 2024",
  author: "Doxastic Team",
  excerpt: "Recently, I found myself struggling with an aging email address that was overwhelmed with newsletters, notifications, and spam. After trying various solutions, I discovered a way to manage this using Doxastic and Zapier.",
  content: `
<h1>Building an AI email filter in 15 minutes</h1>

        <p>Recently, I found myself struggling with an aging email address that was overwhelmed with newsletters, notifications, and spam. After trying various solutions, I discovered a way to manage this using Doxastic (a no-code AI platform) and Zapier. I wanted to share this approach in case it helps others facing similar challenges.</p>

        <h2>The problem</h2>
        <p>We've all been there. That email address you've had forever becomes increasingly unusable as the years go by. In my case, over 90% of incoming mail was low-priority content: newsletters I once subscribed to, notifications from long-abandoned services, and sophisticated spam that somehow always makes it through traditional filters.</p>

        <p>The situation got so bad that I had to disable notifications completely. This created a new problem: I was now regularly missing important messages from clients and collaborators who still used this address. Setting up traditional rule-based filters proved to be a maintenance nightmare – constantly updating rules, dealing with false positives, and still missing important emails that didn't fit my predefined patterns.</p>

        <h2>A Possible Solution: AI-Powered email filtering</h2>
        <p>After experimenting with different approaches, I found success using two tools: Doxastic for creating a custom AI model, and Zapier for automation. The setup process was relatively straightforward and took about 15 minutes, mostly spent on preparing the training data.</p>

        <h2>How it works</h2>
        <p>The system works through a series of straightforward steps that anyone can replicate. First, I downloaded about 1000 emails from my inbox to use as training data. Using Doxastic's hybrid labeling system, I quickly categorized these emails as either important or non-important. This took around 15 minutes and was surprisingly engaging – the system learned from each label I provided, making subsequent suggestions increasingly accurate.</p>
        
        <div class="my-8">
          <img src="/images/labeling.png" alt="Doxastic Labeling Interface" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
          <p class="text-sm text-gray-400 text-center mt-2">Our intuitive labeling interface makes data preparation quick and efficient</p>
        </div>
        <p>Once the labeling was done, Doxastic automatically handled the complex parts: fine-tuning a lightweight LLM on my dataset and deploying it as an API endpoint. No machine learning expertise required.</p>



        <div class="my-8">
          <img src="/images/endpoint.png" alt="Doxastic API Endpoint" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
          <p class="text-sm text-gray-400 text-center mt-2">The Doxastic API endpoint interface</p>
        </div>

        <p>The final piece was setting up a simple Zapier workflow:</p>
        <ol>
          <li>When a new email arrives in my old address</li>
          <li>Zapier sends the content to my Doxastic API</li>
          <li>Based on the model's classification</li>
          <li>Important emails are automatically forwarded to my active address</li>
        </ol>

        <div class="my-8">
          <img src="/images/zapier.png" alt="Zapier Workflow" class="rounded-lg shadow-lg w-full max-w-2xl mx-auto" />
          <p class="text-sm text-gray-400 text-center mt-2">Setting up the Zapier automation workflow</p>
        </div>

        <h2>Results</h2>
        <p>The results were quite positive. Email notifications became manageable again, and the system has been helpful in filtering out less important messages while keeping important communications visible.</p>

        <h2>Why this matters</h2>
        <p>Email management perfectly illustrates the limitations of traditional rule-based systems. Modern communication patterns are too nuanced and variable for static rules. While you could theoretically write complex IF-THEN statements to catch every case, it's simply not practical.</p>

        <p>Machine learning approaches this problem differently. Instead of explicit rules, you show the system examples of what matters to you.</p>

        <h2>Technical details</h2>
        <p>For this implementation, we used the Qwen 2.5 0.5B model, which provided good results for our email classification task. While this model worked well, an even smaller model might have been sufficient for this specific use case. For future iterations, it would be worth investigating the implementation of a dedicated classification head, which could potentially improve both performance and efficiency.</p>

        <h2>About the Author</h2>
        <p>I'm Kristoffer, and I work at Doxastic. We're working on making AI models more accessible to people without coding experience. The email filter described here is one example of how these tools might be useful in everyday scenarios.</p>

        <h2>What's Next?</h2>
        <p>While this post focused on email filtering, similar approaches could potentially help with other text classification needs.</p>

        <p>If you're experiencing challenges with information overload - whether it's emails, support tickets, or document classification - we'd be happy to discuss potential solutions that might work for your specific situation.</p>

        <p>Thanks for reading!</p>
  `,
}; 