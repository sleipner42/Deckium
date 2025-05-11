import { post as aiEmailFilter } from "./ai-email-filter";
import { post as articleSummarizer } from "./article-summariser";
import { post as sentimentAnalysis } from "./financial-sentiment-analyzer.js";

export const posts = {
  "article-summarizer": articleSummarizer,
  "ai-email-filter": aiEmailFilter,
  "financial-sentiment-analyzer": sentimentAnalysis,
};

export const postsList = Object.values(posts);

