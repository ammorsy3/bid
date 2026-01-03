// Helper functions for proper capitalization

const ACRONYMS = [
  'ROI', 'SEO', 'API', 'CMS', 'UI', 'UX', 'HTML', 'CSS', 'JS', 'SQL',
  'iOS', 'PPC', 'CTA', 'CTR', 'KPI', 'GDPR', 'SSL', 'HTTP', 'HTTPS',
  'URL', 'PDF', 'JPG', 'PNG', 'GIF', 'SVG', 'AI', 'PSD', 'B2B', 'B2C',
  'SaaS', 'FAQ', 'CEO', 'CTO', 'CMO', 'HR', 'PR', 'VA', 'BI', 'IT'
];

const PROPER_NOUNS = [
  'Google', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok',
  'YouTube', 'Pinterest', 'Snapchat', 'WhatsApp', 'WordPress', 'Shopify',
  'WooCommerce', 'Magento', 'Drupal', 'Webflow', 'Squarespace',
  'React', 'Vue', 'Angular', 'Node', 'Python', 'Java', 'Ruby',
  'Excel', 'PowerPoint', 'Tableau', 'Analytics'
];

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Properly capitalizes a sentence, handling acronyms and proper nouns
 */
export function capitalizeSentence(sentence: string): string {
  if (!sentence) return sentence;

  // Split into words
  const words = sentence.split(' ');

  // Process each word
  const processedWords = words.map((word, index) => {
    // Check if it's an acronym (case-insensitive)
    const upperWord = word.toUpperCase();
    if (ACRONYMS.includes(upperWord)) {
      return upperWord;
    }

    // Check if it's a proper noun (case-insensitive)
    const foundProperNoun = PROPER_NOUNS.find(
      noun => noun.toLowerCase() === word.toLowerCase()
    );
    if (foundProperNoun) {
      return foundProperNoun;
    }

    // Capitalize first word of sentence
    if (index === 0) {
      return capitalizeFirst(word);
    }

    // Keep other words as-is (already lowercase in our data)
    return word;
  });

  return processedWords.join(' ');
}

/**
 * Capitalizes an array of sentences
 */
export function capitalizeSentences(sentences: string[]): string[] {
  return sentences.map(capitalizeSentence);
}
