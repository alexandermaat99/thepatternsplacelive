import React from 'react';

/**
 * Converts URLs in text to clickable links
 * @param text - The text that may contain URLs
 * @returns React elements with clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [text];

  // URL pattern - matches http://, https://, and www. URLs
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the clickable link
    let url = match[0];
    // Add https:// if it's a www. URL
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {match[0]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no URLs were found, return the original text
  if (parts.length === 0) {
    return [text];
  }

  return parts;
}

